/**
 * Construcción de prompts para generación de presentación HTML técnica.
 * Funciones puras — sin efectos secundarios ni llamadas a IA.
 */

export function buildSystemPrompt(): string {
  return `Genera un archivo HTML COMPLETO y auto-contenido con exactamente 10 slides para una presentación técnica de propuesta de software.

REQUISITOS OBLIGATORIOS:
1. El HTML debe ser un archivo único con todo el CSS inline en una etiqueta <style> en el <head>
2. Cada slide es un <section> con clase "slide", solo el activo tiene display:flex (los demás display:none)
3. Incluir JavaScript inline para navegación: flechas izquierda/derecha del teclado, botones prev/next, indicador "N / 10"
4. Los colores deben venir de la identidad de marca proporcionada (no uses colores genéricos)
5. Tipografía: usa solo fuentes del sistema (sin Google Fonts ni CDN externos)
6. El HTML debe funcionar al abrirse directamente en cualquier browser sin conexión a internet
7. Diseño responsive para pantallas 1280px+ (presentación de escritorio)
8. Cada imagen de infografía que se incluya debe abrirse en lightbox al hacer click (usando JS vanilla)

PROHIBICIONES VISUALES — MUY IMPORTANTE:
- NUNCA uses emojis como elementos visuales o iconos (ni 🔧 ni 🧠 ni 📊 ni ningún otro)
- NUNCA uses imágenes externas ni placeholder images
- NUNCA dejes áreas vacías o "espacios para imagen" sin contenido real
- NO uses colores genéricos grises/azules — extrae y aplica los colores reales de la brand identity

ELEMENTOS VISUALES PERMITIDOS (CSS puro, sin dependencias):
- Diagramas de flujo con divs y flechas CSS (border + ::after con content:"→")
- Cards con sombra y borde de acento (box-shadow, border-left con color de marca)
- Tablas estilizadas con cabecera en color primario de marca
- Barras de progreso o porcentajes con divs y width en CSS
- Iconos con caracteres unicode neutros: ▶ ● ◆ ✓ → ← ↑ ↓ • ─ │ ┌ ┐ └ ┘
- Bloques de código o texto técnico con fondo oscuro y fuente monospace
- Layouts de 2-3 columnas con CSS grid o flexbox
- Badges/pills de tecnologías: span con background-color, border-radius, padding

AUTOR Y DATOS DEL PROYECTO:
- El nombre del arquitecto/autor viene ÚNICAMENTE de los datos del proyecto proporcionados
- Si no hay nombre de arquitecto en los datos, omite ese campo completamente
- NUNCA uses tu propio rol o descripción como autor del documento
- La portada solo debe incluir: nombre del proyecto, cliente, fecha, y arquitecto (solo si está en los datos)

ESTRUCTURA DE LOS 10 SLIDES:
- Slide 1: Portada (nombre proyecto, cliente, fecha — diseño impactante con color de fondo primario de marca)
- Slide 2: El Problema (qué problema resuelve — usa cards o bullets con iconos unicode)
- Slide 3: Objetivo y Alcance (qué se construye — layout 2 columnas: objetivo + alcance)
- Slide 4: Solución Técnica (qué hace el sistema — diagrama de flujo CSS con flechas)
- Slide 5: Arquitectura (stack técnico — badges de tecnologías + diagrama de capas con divs)
- Slide 6: Infografía Técnica (embed de la imagen si hay URL con lightbox; si no hay URL, diagrama CSS con los componentes clave)
- Slide 7: Decisiones de Arquitectura (tabla 2 col: tecnología | razón)
- Slide 8: Entregables (tabla con nombre, formato, criterio de aceptación — cabecera en color primario)
- Slide 9: Criterios de Éxito (KPIs con barras de progreso CSS o cards de métricas)
- Slide 10: Próximos Pasos (timeline horizontal con divs: fase → fecha → equipo)

USO DE COLORES DE MARCA — OBLIGATORIO:
- Slide 1 (portada): fondo en color primario de marca, texto blanco
- Todos los slides: título con color primario, borde izquierdo de acento en highlights
- Tablas: cabecera con color primario de marca
- Bullets/pills/badges: usar colores de acento de marca
- Fondo de slides: color de fondo de marca o blanco/gris muy claro

ESTILO GENERAL:
- Layout profesional, densidad de información media-alta (no slides vacíos)
- Cada slide debe tener contenido visual real, no solo texto plano
- Fuente: system-ui, -apple-system, sans-serif
- El indicador de slide ("3 / 10") y botones prev/next siempre visibles, en la parte inferior

Responde ÚNICAMENTE con el código HTML completo. Sin explicaciones, sin markdown, sin bloques de código.
Empieza directamente con <!DOCTYPE html> y termina con </html>.`
}

export function buildUserPrompt(
  projectName: string,
  clientName: string,
  storyboardMd: string,
  brandMarkdown: string,
  infographicUrl: string | null,
  refinementInstructions?: string
): string {
  const lines: string[] = []

  lines.push(`# DATOS DEL PROYECTO`)
  lines.push(`- Nombre del proyecto: ${projectName}`)
  lines.push(`- Cliente: ${clientName}`)
  lines.push(`- Fecha: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}`)
  lines.push('')

  if (brandMarkdown) {
    lines.push(`# IDENTIDAD DE MARCA`)
    lines.push(`Extrae los colores hex de la siguiente identidad de marca y úsalos en el HTML:`)
    lines.push(brandMarkdown)
    lines.push('')
  }

  if (infographicUrl) {
    lines.push(`# INFOGRAFÍA TÉCNICA`)
    lines.push(`URL de la imagen: ${infographicUrl}`)
    lines.push(`Úsala en el Slide 6 como <img src="${infographicUrl}"> con lightbox al click.`)
    lines.push('')
  }

  lines.push(`# STORYBOARD TÉCNICO APROBADO`)
  lines.push(`Usa el contenido del storyboard para construir cada slide. El storyboard tiene secciones para infografías (ignóralas para los slides HTML) y secciones de slides (úsalas como contenido de cada slide).`)
  lines.push('')
  lines.push(storyboardMd)
  lines.push('')
  if (refinementInstructions) {
    lines.push(`# INSTRUCCIONES DE REFINAMIENTO`)
    lines.push(`Aplica los siguientes ajustes específicos al generar la presentación:`)
    lines.push(refinementInstructions)
    lines.push('')
  }

  lines.push(`Genera ahora el HTML completo con los 10 slides.`)

  return lines.join('\n')
}
