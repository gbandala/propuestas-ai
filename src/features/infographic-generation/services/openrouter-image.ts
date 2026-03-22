/**
 * Genera una imagen usando google/gemini-2.5-flash via OpenRouter image generation API.
 * Retorna un Buffer con la imagen PNG lista para subir a Storage.
 *
 * Docs: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const IMAGE_MODEL = 'google/gemini-2.5-flash-preview-05-20'

export async function generateInfographicImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('Falta OPENROUTER_API_KEY en las variables de entorno')
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'PropuestasAI',
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      // Imagen landscape 4:3 para infografías
      image_generation_config: {
        quality: 'standard',
        size: '1024x768',
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${body}`)
  }

  const data = await response.json() as OpenRouterImageResponse

  // La respuesta puede venir como string base64 o como array de partes
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('OpenRouter no retornó contenido en la respuesta')
  }

  // Caso 1: content es un array de partes (multimodal)
  if (Array.isArray(content)) {
    const imagePart = content.find(
      (part): part is ImageUrlPart =>
        part.type === 'image_url' && typeof part.image_url?.url === 'string'
    )

    if (imagePart?.image_url?.url) {
      return extractBase64Image(imagePart.image_url.url)
    }

    // También puede ser inline_data (formato Gemini)
    const inlinePart = content.find(
      (part): part is InlineDataPart =>
        part.type === 'inline_data' && typeof part.inline_data?.data === 'string'
    )

    if (inlinePart?.inline_data?.data) {
      return Buffer.from(inlinePart.inline_data.data, 'base64')
    }
  }

  // Caso 2: content es string con data URL base64
  if (typeof content === 'string' && content.startsWith('data:image')) {
    return extractBase64Image(content)
  }

  throw new Error(`OpenRouter retornó formato inesperado. Content: ${JSON.stringify(content).slice(0, 200)}`)
}

function extractBase64Image(dataUrl: string): Buffer {
  // Formato: data:image/png;base64,<base64data>
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return Buffer.from(base64, 'base64')
}

// Tipos de respuesta
interface TextPart {
  type: 'text'
  text: string
}

interface ImageUrlPart {
  type: 'image_url'
  image_url: { url: string }
}

interface InlineDataPart {
  type: 'inline_data'
  inline_data: { mimeType: string; data: string }
}

type ContentPart = TextPart | ImageUrlPart | InlineDataPart

interface OpenRouterImageResponse {
  choices?: Array<{
    message?: {
      content?: string | ContentPart[]
    }
  }>
}
