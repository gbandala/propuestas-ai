/**
 * Generación de imágenes para infografías.
 * Delega al cliente AI unificado (Gemini → OpenRouter fallback).
 * Exporta solo el Buffer para mantener compatibilidad con el API route.
 */

import { generateImage } from '@/lib/ai-client'
export type { AiMeta } from '@/lib/ai-client'

export async function generateInfographicImage(prompt: string): Promise<Buffer> {
  const { buffer } = await generateImage(prompt)
  return buffer
}

export { generateImage as generateInfographicImageWithMeta }
