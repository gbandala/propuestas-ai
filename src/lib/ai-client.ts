/**
 * Cliente AI unificado: Gemini API (primario, free tier) → OpenRouter SDK (fallback)
 *
 * Modelo: google/gemini-3.1-flash-image-preview
 * - Soporta generación de texto e imágenes
 * - Prioridad: Gemini API directa (GEMINI_API_KEY) para aprovechar el free tier
 * - Fallback automático a OpenRouter cuando Gemini excede quota o no está disponible
 */

import { OpenRouter } from '@openrouter/sdk'
import type { AiProvider } from '@/types/database'

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview'
const OPENROUTER_MODEL = 'google/gemini-3.1-flash-image-preview'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

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

export interface AiTextResult {
  text: string
  meta: AiMeta
}

// ---------------------------------------------------------------------------
// Generación de imágenes
// ---------------------------------------------------------------------------

async function generateImageViaGemini(prompt: string): Promise<AiImageResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY no configurada'), { isFallback: true })

  const t0 = Date.now()
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'))

  if (imagePart?.inlineData?.data) {
    const usage = data.usageMetadata
    return {
      buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
      meta: {
        provider: 'gemini',
        model: GEMINI_MODEL,
        promptTokens: usage?.promptTokenCount ?? null,
        completionTokens: usage?.candidatesTokenCount ?? null,
        totalTokens: usage?.totalTokenCount ?? null,
        latencyMs,
      },
    }
  }

  throw Object.assign(new Error('Gemini no retornó imagen en la respuesta'), { isFallback: true })
}

async function generateImageViaOpenRouter(prompt: string): Promise<AiImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')

  const openrouter = new OpenRouter({ apiKey })
  const t0 = Date.now()

  const result = await openrouter.chat.send({
    chatGenerationParams: {
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    },
    httpReferer: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    xTitle: 'PropuestasAI',
  })

  const latencyMs = Date.now() - t0
  const response = result as OpenRouterResponse
  const message = response.choices?.[0]?.message
  const usage = response.usage

  const meta: AiMeta = {
    provider: 'openrouter',
    model: response.model ?? OPENROUTER_MODEL,
    promptTokens: usage?.promptTokens ?? null,
    completionTokens: usage?.completionTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
    latencyMs,
  }

  // Formato SDK: message.images[].imageUrl.url (camelCase)
  const imageUrl = message?.images?.[0]?.imageUrl?.url
  if (imageUrl) return { buffer: await imageUrlToBuffer(imageUrl), meta }

  // Formato alternativo: content como array de partes
  const content = message?.content
  if (Array.isArray(content)) {
    for (const part of content as ContentPart[]) {
      if (part.type === 'image_url' && part.image_url?.url) {
        return { buffer: await imageUrlToBuffer(part.image_url.url), meta }
      }
      if (part.type === 'inline_data' && part.inline_data?.data) {
        return { buffer: Buffer.from(part.inline_data.data, 'base64'), meta }
      }
    }
  }

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

export async function generateImage(prompt: string): Promise<AiImageResult> {
  try {
    return await generateImageViaGemini(prompt)
  } catch (err) {
    if ((err as { isFallback?: boolean }).isFallback) {
      console.warn('[ai-client] Usando OpenRouter para generación de imagen')
      return generateImageViaOpenRouter(prompt)
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Generación de texto
// ---------------------------------------------------------------------------

async function generateTextViaGemini(systemPrompt: string, userPrompt: string): Promise<AiTextResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY no configurada'), { isFallback: true })

  const t0 = Date.now()
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    const shouldFallback = isQuotaOrUnavailable(response.status, body)
    console.warn(`[ai-client] Gemini texto error ${response.status}${shouldFallback ? ' — usando fallback' : ''}`)
    throw Object.assign(
      new Error(`Gemini API error ${response.status}: ${body}`),
      { isFallback: shouldFallback }
    )
  }

  const data = await response.json() as GeminiResponse
  const latencyMs = Date.now() - t0
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) throw Object.assign(new Error('Gemini no retornó texto en la respuesta'), { isFallback: true })

  const usage = data.usageMetadata
  return {
    text,
    meta: {
      provider: 'gemini',
      model: GEMINI_MODEL,
      promptTokens: usage?.promptTokenCount ?? null,
      completionTokens: usage?.candidatesTokenCount ?? null,
      totalTokens: usage?.totalTokenCount ?? null,
      latencyMs,
    },
  }
}

async function generateTextViaOpenRouter(systemPrompt: string, userPrompt: string): Promise<AiTextResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada')

  const openrouter = new OpenRouter({ apiKey })
  const t0 = Date.now()

  const result = await openrouter.chat.send({
    chatGenerationParams: {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    httpReferer: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    xTitle: 'PropuestasAI',
  })

  const latencyMs = Date.now() - t0
  const response = result as OpenRouterResponse
  const text = response.choices?.[0]?.message?.content
  const usage = response.usage

  if (typeof text !== 'string' || !text) throw new Error('OpenRouter no retornó texto')

  return {
    text,
    meta: {
      provider: 'openrouter',
      model: response.model ?? OPENROUTER_MODEL,
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      latencyMs,
    },
  }
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<AiTextResult> {
  try {
    return await generateTextViaGemini(systemPrompt, userPrompt)
  } catch (err) {
    if ((err as { isFallback?: boolean }).isFallback) {
      console.warn('[ai-client] Usando OpenRouter para generación de texto')
      return generateTextViaOpenRouter(systemPrompt, userPrompt)
    }
    throw err
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
      content?: string | null
      images?: Array<{ imageUrl: { url: string } }>
    }
  }>
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}
