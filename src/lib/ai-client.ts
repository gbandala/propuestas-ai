/**
 * Cliente AI unificado — solo OpenRouter
 *
 * Imágenes (OpenRouter):
 *   - flash: IMAGE_MODEL_FLASH env var  (default: google/gemini-3.1-flash-image-preview)
 *   - pro:   IMAGE_MODEL_PRO env var    (google/gemini-3.1-pro-image-preview)
 *   - flux:  IMAGE_MODEL_FLUX env var   (black-forest-labs/flux.2-pro)
 *
 * Texto (OpenRouter):
 *   - TEXT_MODEL env var (default: anthropic/claude-sonnet-4-6)
 *   — usado para storyboards y cualquier generación de texto estructurado
 */

import type { AiProvider } from '@/types/database'
import type { ImageQuality } from '@/types/database'

// Modelos de imagen — leídos desde env, con fallback hardcoded
const OR_MODEL_FLASH = process.env.IMAGE_MODEL_FLASH ?? 'google/gemini-3.1-flash-image-preview'
const OR_MODEL_PRO   = process.env.IMAGE_MODEL_PRO   ?? 'google/gemini-3.1-pro-image-preview'
const OR_MODEL_FLUX  = process.env.IMAGE_MODEL_FLUX  ?? 'black-forest-labs/flux.2-pro'

// Modelo de texto — leído desde env, con fallback hardcoded
const TEXT_MODEL = process.env.TEXT_MODEL ?? 'anthropic/claude-sonnet-4-6'

function resolveImageModel(quality?: ImageQuality): string {
  if (quality === 'pro')  return OR_MODEL_PRO
  if (quality === 'flux') return OR_MODEL_FLUX
  return OR_MODEL_FLASH
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
  /** Pre-fetched base64 of background image — skips the internal fetch when provided */
  backgroundImageBase64?: { data: string; mimeType: string } | null
  /** Calidad/modelo: 'flash' (default), 'pro', o 'flux' */
  quality?: ImageQuality
}

export interface AiTextResult {
  text: string
  meta: AiMeta
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[ai-client] fetchImageAsBase64: HTTP ${res.status} for ${url}`)
      return null
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    let mimeType = contentType.split(';')[0].trim()
    if (mimeType === 'application/octet-stream') {
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
      const extMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
      mimeType = extMap[ext ?? ''] ?? 'image/jpeg'
    }
    const data = Buffer.from(await res.arrayBuffer()).toString('base64')
    return { data, mimeType }
  } catch (err) {
    console.warn(`[ai-client] fetchImageAsBase64: fetch error for ${url}:`, err)
    return null
  }
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

// ---------------------------------------------------------------------------
// Generación de imágenes — OpenRouter
// ---------------------------------------------------------------------------

export async function generateImage(prompt: string, opts?: AiImageOptions): Promise<AiImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')

  const model = resolveImageModel(opts?.quality)

  // Build multimodal content: prepend background image if available
  let userContent: string | Array<Record<string, unknown>> = prompt
  const bgToUse = opts?.backgroundImageBase64 ?? (opts?.backgroundImageUrl ? await fetchImageAsBase64(opts.backgroundImageUrl) : null)
  if (bgToUse) {
    userContent = [
      { type: 'image_url', image_url: { url: `data:${bgToUse.mimeType};base64,${bgToUse.data}` } },
      { type: 'text', text: prompt },
    ]
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
      model,
      messages: [{ role: 'user', content: userContent }],
      modalities: ['image', 'text'],
    }),
    signal: AbortSignal.timeout(100_000),
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
    model: response.model ?? model,
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    latencyMs,
  }

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

  const content = message?.content
  if (Array.isArray(content)) {
    const result = await extractFromParts(content as ContentPart[])
    if (result) return result
  }

  const images = (message as Record<string, unknown> | undefined)?.images
  if (Array.isArray(images)) {
    const result = await extractFromParts(images as ContentPart[])
    if (result) return result
  }

  console.error('[ai-client] OpenRouter: no image found. content:', typeof content, '| images:', Array.isArray(images) ? images.length : 'none')
  throw new Error('OpenRouter no retornó imagen en la respuesta')
}

// ---------------------------------------------------------------------------
// Generación de texto — OpenRouter (usado para storyboards)
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
      model: TEXT_MODEL,
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
      model: response.model ?? TEXT_MODEL,
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
