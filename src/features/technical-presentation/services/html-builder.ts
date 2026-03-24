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

AUTOR Y DATOS DEL PROYECTO:
- El nombre del arquitecto/autor viene ÚNICAMENTE de los datos del proyecto proporcionados
- Si no hay nombre de arquitecto en los datos, omite ese campo completamente
- NUNCA uses tu propio rol o descripción como autor del documento
- La portada solo debe incluir: nombre del proyecto, cliente, fecha, y arquitecto (solo si está en los datos)

ESTRUCTURA DE LOS 10 SLIDES:
- Slide 1: Portada (nombre proyecto, cliente, fecha — sin texto genérico de roles)
- Slide 2: El Problema (qué problema resuelve, contexto del cliente)
- Slide 3: Objetivo y Alcance (qué se va a construir y sus límites)
- Slide 4: Solución Técnica (qué hace el sistema, diagrama textual o visual)
- Slide 5: Arquitectura (stack técnico, componentes, flujo de datos)
- Slide 6: Infografía Técnica (embed de la imagen de infografía si hay URL, lightbox al click)
- Slide 7: Decisiones de Arquitectura (por qué se eligieron las tecnologías)
- Slide 8: Entregables (tabla con nombre, formato, criterio de aceptación)
- Slide 9: Criterios de Éxito (cómo se valida que el proyecto es exitoso)
- Slide 10: Próximos Pasos (timeline o resumen de fases de implementación)

ESTILO:
- Layout profesional, limpio, con suficiente espacio en blanco
- Usa los colores de marca para: cabeceros, highlights, bullets, bordes de acento
- Slides con estructura clara: título arriba, contenido principal en el centro
- El indicador de slide (ej. "3 / 10") y los botones prev/next deben estar siempre visibles

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
