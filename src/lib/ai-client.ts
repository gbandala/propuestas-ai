/**
 * Cliente AI unificado
 *
 * Imágenes: Gemini API directa (free tier) → OpenRouter fallback
 *   - Flash: gemini-2.5-flash-preview-image-generation (default, rápido)
 *   - Pro:   gemini-2.5-pro-preview-image-generation  (mayor calidad, más lento)
 *
 * Texto: OpenRouter directo con claude-sonnet-4-6 (mejor para output estructurado)
 */

import type { AiProvider } from '@/types/database'

// Modelos de imagen — Gemini API directa
const GEMINI_IMAGE_MODEL_FLASH = 'gemini-2.5-flash-preview-image-generation'
const GEMINI_IMAGE_MODEL_PRO = 'gemini-2.5-pro-preview-image-generation'

// Modelos de imagen — OpenRouter fallback
// Modelo probado: google/gemini-3.1-flash-image-preview (OpenRouter resuelve a -20260226)
// Pro no existe en OpenRouter: ambos usan el mismo modelo disponible.
const OPENROUTER_IMAGE_MODEL_FLASH = 'google/gemini-3.1-flash-image-preview'
const OPENROUTER_IMAGE_MODEL_PRO = 'google/gemini-3.1-flash-image-preview'

// Modelo de texto
const OPENROUTER_TEXT_MODEL = 'anthropic/claude-sonnet-4-6'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export type ImageQuality = 'flash' | 'pro'

// Errores que activan el fallback a OpenRouter (quota, rate limit, modelo no disponible, API key inválida)
const FALLBACK_STATUSES = new Set([400, 429, 404, 503])
function isQuotaOrUnavailable(status: number, body: string): boolean {
  if (FALLBACK_STATUSES.has(status)) return true
  return body.includes('RESOURCE_EXHAUSTED') || body.includes('quota') || body.includes('API_KEY_INVALID')
}

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface AiMeta {
  provider: AiProvider
  model: string
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  latencyMs: number
}

export interface AiImageResult {
  buffer: Buffer
  meta: AiMeta
}

export interface AiImageOptions {
  /** URL of a background/reference image to pass as multimodal input */
  backgroundImageUrl?: string | null
  /** Calidad del modelo de imagen: 'flash' (default) o 'pro' */
  quality?: ImageQuality
}

export interface AiTextResult {
  text: string
  meta: AiMeta
}

// ---------------------------------------------------------------------------
// Generación de imágenes
// ---------------------------------------------------------------------------

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim()
    const data = Buffer.from(await res.arrayBuffer()).toString('base64')
    return { data, mimeType }
  } catch {
    return null
  }
}

async function generateImageViaGemini(prompt: string, opts?: AiImageOptions): Promise<AiImageResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY no configurada'), { isFallback: true })

  const geminiModel = opts?.quality === 'pro' ? GEMINI_IMAGE_MODEL_PRO : GEMINI_IMAGE_MODEL_FLASH

  // Build input parts — optionally prepend background image
  const inputParts: Array<Record<string, unknown>> = []
  if (opts?.backgroundImageUrl) {
    const bg = await fetchImageAsBase64(opts.backgroundImageUrl)
    if (bg) inputParts.push({ inlineData: { mimeType: bg.mimeType, data: bg.data } })
  }
  inputParts.push({ text: prompt })

  const t0 = Date.now()
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: inputParts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    const shouldFallback = isQuotaOrUnavailable(response.status, body)
    console.warn(`[ai-client] Gemini imagen error ${response.status}${shouldFallback ? ' — usando fallback' : ''}`)
    throw Object.assign(
      new Error(`Gemini API error ${response.status}: ${body}`),
      { isFallback: shouldFallback }
    )
  }

  const data = await response.json() as GeminiResponse
  const latencyMs = Date.now() - t0
  const responseParts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = responseParts.find((p) => p.inlineData?.mimeType?.startsWith('image/'))

  if (imagePart?.inlineData?.data) {
    const usage = data.usageMetadata
    return {
      buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
      meta: {
        provider: 'gemini',
        model: geminiModel,
        promptTokens: usage?.promptTokenCount ?? null,
        completionTokens: usage?.candidatesTokenCount ?? null,
        totalTokens: usage?.totalTokenCount ?? null,
        latencyMs,
      },
    }
  }

  throw Object.assign(new Error('Gemini no retornó imagen en la respuesta'), { isFallback: true })
}

async function generateImageViaOpenRouter(prompt: string, opts?: AiImageOptions): Promise<AiImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')

  const orModel = opts?.quality === 'pro' ? OPENROUTER_IMAGE_MODEL_PRO : OPENROUTER_IMAGE_MODEL_FLASH

  // Build multimodal content: optionally include background image as input
  let userContent: string | Array<Record<string, unknown>> = prompt
  if (opts?.backgroundImageUrl) {
    const bg = await fetchImageAsBase64(opts.backgroundImageUrl)
    if (bg) {
      userContent = [
        { type: 'image_url', image_url: { url: `data:${bg.mimeType};base64,${bg.data}` } },
        { type: 'text', text: prompt },
      ]
    }
  }

  const t0 = Date.now()
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'PropuestasAI',
    },
    body: JSON.stringify({
      model: orModel,
      messages: [{ role: 'user', content: userContent }],
      modalities: ['image', 'text'],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter imagen error ${res.status}: ${body}`)
  }

  const latencyMs = Date.now() - t0
  const response = await res.json() as OpenRouterResponse
  const message = response.choices?.[0]?.message
  const usage = response.usage

  const meta: AiMeta = {
    provider: 'openrouter',
    model: response.model ?? orModel,
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    latencyMs,
  }

  // Helper to extract image from a list of content parts
  async function extractFromParts(parts: ContentPart[]): Promise<AiImageResult | null> {
    for (const part of parts) {
      if (part.type === 'image_url' && part.image_url?.url) {
        return { buffer: await imageUrlToBuffer(part.image_url.url), meta }
      }
      if (part.type === 'inline_data' && part.inline_data?.data) {
        return { buffer: Buffer.from(part.inline_data.data, 'base64'), meta }
      }
    }
    return null
  }

  // 1) Try message.content (array of parts)
  const content = message?.content
  if (Array.isArray(content)) {
    const result = await extractFromParts(content as ContentPart[])
    if (result) return result
  }

  // 2) Try message.images (OpenRouter puts images here when content is null)
  const images = (message as Record<string, unknown> | undefined)?.images
  if (Array.isArray(images)) {
    const result = await extractFromParts(images as ContentPart[])
    if (result) return result
  }

  console.error('[ai-client] OpenRouter: no image found. content:', typeof content, '| images:', Array.isArray(images) ? images.length : 'none')
  throw new Error('OpenRouter no retornó imagen en la respuesta')
}

async function imageUrlToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:image')) {
    const base64 = url.includes(',') ? url.split(',')[1] : url
    return Buffer.from(base64, 'base64')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar imagen desde URL: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function generateImage(prompt: string, opts?: AiImageOptions): Promise<AiImageResult> {
  try {
    return await generateImageViaGemini(prompt, opts)
  } catch (err) {
    if ((err as { isFallback?: boolean }).isFallback) {
      console.warn('[ai-client] Usando OpenRouter para generación de imagen')
      return generateImageViaOpenRouter(prompt, opts)
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Generación de texto (OpenRouter + claude-sonnet-4-6)
// ---------------------------------------------------------------------------

export async function generateText(systemPrompt: string, userPrompt: string): Promise<AiTextResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')

  const t0 = Date.now()
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'PropuestasAI',
    },
    body: JSON.stringify({
      model: OPENROUTER_TEXT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter texto error ${res.status}: ${body}`)
  }

  const latencyMs = Date.now() - t0
  const response = await res.json() as OpenRouterResponse
  const text = response.choices?.[0]?.message?.content

  if (typeof text !== 'string' || !text) throw new Error('OpenRouter no retornó texto')

  const usage = response.usage
  return {
    text,
    meta: {
      provider: 'openrouter',
      model: response.model ?? OPENROUTER_TEXT_MODEL,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      latencyMs,
    },
  }
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        inlineData?: { mimeType: string; data: string }
      }>
    }
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

interface ContentPart {
  type: string
  image_url?: { url: string }
  inline_data?: { mimeType: string; data: string }
  text?: string
}

interface OpenRouterResponse {
  model?: string
  choices?: Array<{
    message?: {
      content?: string | ContentPart[] | null
      images?: ContentPart[]
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}
