import sharp from 'sharp'

/**
 * Elimina el fondo gris/tablero-ajedrez de logos exportados por generadores AI.
 * Esos logos tienen hasAlpha=true pero todos los pixels son opacos — el tablero
 * está baked como RGB. Detecta pixels de baja saturación (grises neutros) con
 * valor medio y los pone en alpha=0.
 * Funciona también con PNGs realmente transparentes (ya tienen alpha=0, no se tocan).
 */
export async function removeGrayBackground(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const saturation = Math.max(r, g, b) - Math.min(r, g, b)
    const value = (r + g + b) / 3
    // Neutral gray (checkerboard): low saturation, mid-range value (not black/white)
    if (saturation < 20 && value > 100 && value < 230) {
      data[i + 3] = 0
    }
  }
  return sharp(data as Buffer, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}
