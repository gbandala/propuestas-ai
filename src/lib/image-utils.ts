import sharp from 'sharp'

/**
 * Elimina el fondo gris/tablero-ajedrez de logos usando flood fill desde las esquinas.
 *
 * El algoritmo anterior (eliminar TODOS los grises) dañaba el anti-aliasing de
 * las letras del logo. Este enfoque solo elimina píxeles grises que están
 * conectados con el borde de la imagen — el fondo real. Los grises interiores
 * (texto, bordes suaves de iconos) no se tocan.
 *
 * Compatible con PNGs ya transparentes (alpha=0 no se consideran grises, se omiten).
 */
export async function removeGrayBackground(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info

  const isBackground = (pixelIndex: number): boolean => {
    const a = data[pixelIndex + 3]
    if (a < 128) return false // ya es transparente, no marcar de nuevo
    const r = data[pixelIndex], g = data[pixelIndex + 1], b = data[pixelIndex + 2]
    const saturation = Math.max(r, g, b) - Math.min(r, g, b)
    const value = (r + g + b) / 3
    // Gris neutro, blanco o casi-blanco: baja saturación, no negro puro
    // El flood fill garantiza que solo se eliminan píxeles conectados al borde (fondo real)
    // por eso es seguro no poner cota superior en value
    return saturation < 30 && value > 80
  }

  // visited[pixelOffset] = 1 → marcar como fondo a eliminar
  const visited = new Uint8Array(width * height)

  // Stack iterativo (DFS) — evita stack overflow en imágenes grandes
  const stack: number[] = []

  const tryPush = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const offset = y * width + x
    if (visited[offset]) return
    if (!isBackground(offset * 4)) return
    visited[offset] = 1
    stack.push(x, y)
  }

  // Inicializar flood fill desde todos los píxeles del borde
  for (let x = 0; x < width; x++) {
    tryPush(x, 0)
    tryPush(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    tryPush(0, y)
    tryPush(width - 1, y)
  }

  // Expandir en las 4 direcciones
  while (stack.length > 0) {
    const y = stack.pop()!
    const x = stack.pop()!
    tryPush(x + 1, y)
    tryPush(x - 1, y)
    tryPush(x, y + 1)
    tryPush(x, y - 1)
  }

  // Aplicar transparencia solo a los píxeles marcados como fondo
  for (let offset = 0; offset < width * height; offset++) {
    if (visited[offset]) {
      data[offset * 4 + 3] = 0
    }
  }

  return sharp(data as Buffer, { raw: { width, height, channels: 4 } }).png().toBuffer()
}
