import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export const MODELS = {
  // Texto (storyboard, análisis, estructurado)
  text: 'anthropic/claude-sonnet-4-6',

  // Vision (análisis de imágenes)
  vision: 'google/gemini-2.0-flash-exp:free',

  // Generación de imágenes vía OpenRouter (modelo probado funcional)
  imageFlash: 'google/gemini-3.1-flash-image-preview',
  imagePro: 'google/gemini-3.1-flash-image-preview',
} as const

export type ModelKey = keyof typeof MODELS
