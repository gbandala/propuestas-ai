/**
 * Genera una imagen usando Gemini 2.0 Flash (vía OpenRouter o Gemini API directa).
 * Retorna un Buffer con la imagen PNG lista para subir a Storage.
 *
 * Gemini image generation devuelve base64 inlineData — se decodifica aquí.
 */

const GEMINI_MODEL = 'gemini-2.0-flash-preview-image-generation'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function generateInfographicImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error(
      'Falta GEMINI_API_KEY o OPENROUTER_API_KEY en las variables de entorno'
    )
  }

  // Intentar Gemini directamente primero
  try {
    return await generateWithGemini(prompt, apiKey)
  } catch (geminiError) {
    // Fallback: intentar OpenRouter con modelo de generación
    try {
      return await generateWithOpenRouter(prompt, apiKey)
    } catch {
      throw geminiError // lanzar el error original
    }
  }
}

async function generateWithGemini(prompt: string, apiKey: string): Promise<Buffer> {
  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${body}`)
  }

  const data = await response.json() as GeminiResponse
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith('image/')
  )

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini no retornó imagen en la respuesta')
  }

  return Buffer.from(imagePart.inlineData.data, 'base64')
}

async function generateWithOpenRouter(prompt: string, apiKey: string): Promise<Buffer> {
  // OpenRouter usa el endpoint de chat completions con response_format imagen
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${body}`)
  }

  const data = await response.json() as OpenRouterResponse
  const content = data.choices?.[0]?.message?.content

  // Si retorna base64 embebido en el contenido
  if (typeof content === 'string' && content.startsWith('data:image')) {
    const base64 = content.split(',')[1]
    return Buffer.from(base64, 'base64')
  }

  throw new Error('OpenRouter no retornó imagen en formato esperado')
}

// Tipos de respuesta de las APIs
interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
  }>
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}
