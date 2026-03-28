/** Extrae los primeros 3 colores hex del markdown de brand */
function extractColors(brandMarkdown: string): { primary: string; secondary: string; accent: string } {
  const matches = [...brandMarkdown.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => `#${m[1]}`)
  return {
    primary: matches[0] ?? '#2563EB',
    secondary: matches[1] ?? '#1E40AF',
    accent: matches[2] ?? '#F59E0B',
  }
}

export function buildLogoPrompt(
  companyName: string,
  userPrompt: string,
  brandMarkdown: string,
  hasReference: boolean
): string {
  const colors = extractColors(brandMarkdown)
  const lines: string[] = []

  lines.push(`Create a professional company logo for "${companyName}".`)
  lines.push(``)
  lines.push(`DESIGN BRIEF: ${userPrompt}`)
  lines.push(``)
  lines.push(`SPECIFICATIONS:`)
  lines.push(`- Canvas: 350x90px, transparent background (PNG)`)
  lines.push(`- Layout: horizontal rectangular — small icon/symbol on the left, company name text on the right`)
  lines.push(`- Style: minimalist, modern, corporate — clean lines, no gradients, no shadows`)
  lines.push(`- Colors: use ONLY ${colors.primary} (primary), ${colors.secondary} (secondary), and white/light gray for contrast`)
  lines.push(`- Typography: modern sans-serif, bold weight for the company name, legible at 150x50px`)
  lines.push(`- Icon: simple geometric or abstract symbol that relates to the company's industry, 2-3 colors max`)
  lines.push(``)
  lines.push(`RULES:`)
  lines.push(`- NO background fill — transparent only`)
  lines.push(`- NO decorative borders, frames, or drop shadows`)
  lines.push(`- NO watermarks, signatures, or sample text`)
  lines.push(`- The company name must appear in the design exactly as: "${companyName}"`)
  if (hasReference) {
    lines.push(`- Use the provided reference image as style inspiration — adapt the concept, don't copy literally`)
  }
  lines.push(`- Output: single logo, centered in the 350x90 canvas, with padding of ~10px on all sides`)

  return lines.join('\n')
}

export function buildBackgroundPrompt(
  companyName: string,
  userPrompt: string,
  brandMarkdown: string,
  hasReference: boolean
): string {
  const colors = extractColors(brandMarkdown)
  const lines: string[] = []

  lines.push(`Create a professional slide background image for "${companyName}" presentations.`)
  lines.push(``)
  lines.push(`DESIGN BRIEF: ${userPrompt}`)
  lines.push(``)
  lines.push(`SPECIFICATIONS:`)
  lines.push(`- Canvas: 1376x768px (16:9 widescreen), filled edge-to-edge`)
  lines.push(`- Style: abstract, corporate, subtle — this is a background for text slides`)
  lines.push(`- Colors: use ${colors.primary} and ${colors.secondary} as dominant tones, ${colors.accent} as subtle accent`)
  lines.push(`- Texture: smooth gradients, geometric shapes, or soft abstract patterns — no photos, no faces`)
  lines.push(`- Visual weight: lighter/empty center and left areas where slide content will overlay`)
  lines.push(`- Corners/edges may have stronger color elements (decorative) but keep the main area subtle`)
  lines.push(``)
  lines.push(`RULES:`)
  lines.push(`- NO text, NO logos, NO watermarks of any kind`)
  lines.push(`- NO busy patterns — the background must not compete with slide text`)
  lines.push(`- NO photography or realistic imagery`)
  lines.push(`- Fill the entire 1376x768 canvas, no white borders`)
  if (hasReference) {
    lines.push(`- Use the provided reference image as style inspiration — adapt the visual style, don't copy`)
  }

  return lines.join('\n')
}
