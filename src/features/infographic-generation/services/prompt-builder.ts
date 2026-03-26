import { DEFAULT_COLORS } from '@/shared/constants/brand'
import type { StepData } from '@/features/technical-brief/types'

interface BrandColors {
  primary: string
  secondary: string
  accent: string
}

/** Extrae los primeros 3 colores hex del markdown de marca */
function extractBrandColors(brandMarkdown: string): BrandColors {
  const matches = [...brandMarkdown.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => `#${m[1]}`)
  return {
    primary: matches[0] ?? DEFAULT_COLORS.primary,
    secondary: matches[1] ?? DEFAULT_COLORS.secondary,
    accent: matches[2] ?? DEFAULT_COLORS.accent,
  }
}

const SLIDE_LAYOUT_HINTS: Record<number, string> = {
  1: 'Executive summary with ROI. Hero metric center-stage (e.g. "70% reducción de tiempo"), supporting KPI cards below. Bold numbers, short labels. Use primary color for the hero metric.',
  2: 'Problem vs Solution. Split layout: left side shows pain points (red/orange icons and labels), right side shows solution benefits (green icons). Arrow or divider in center.',
  3: 'Technical solution flow. Left-to-right data flow: Input blocks → Processing blocks → Output blocks. Colored rounded rectangles connected by arrows. Swimlane style.',
  4: 'System architecture. Layered boxes: Frontend / Backend / Database / Integrations. Cloud-style component diagram. Icons per service, connection lines between layers.',
  5: 'Deliverables grid. 4–6 card items, each with an icon and short label. Clean 2×3 or 3×2 grid. Each card uses accent color border.',
  6: 'Project roadmap. Horizontal Gantt/timeline. Phase bars left to right, milestones marked with diamonds, phase labels above, durations shown.',
  7: 'Investment model. Payment schedule table or staged card layout. Amounts, timing, and what is included per stage. Professional finance infographic style.',
}

/**
 * Genera el prompt de imagen para un slide de la propuesta.
 * Usa el contenido real del storyboard como fuente de verdad.
 */
export function buildProposalSlidePrompt(
  slideNumber: number,
  slideTitle: string,
  slideContent: string,
  brandMarkdown: string,
  logoUrl?: string | null,
  backgroundUrl?: string | null,
): string {
  const colors = extractBrandColors(brandMarkdown)
  const layoutHint = SLIDE_LAYOUT_HINTS[slideNumber] ?? `Informative infographic for slide ${slideNumber}.`

  const lines: string[] = []
  lines.push(`Create a professional proposal infographic. Reference: ${slideTitle}`)
  lines.push(``)
  lines.push(`LAYOUT TYPE: ${layoutHint}`)
  lines.push(``)
  lines.push(`CONTENT (from approved storyboard — follow exactly):`)
  lines.push(slideContent)
  lines.push(``)
  lines.push(`TEXT RULE: Use ONLY the text specified under "Texto en imagen:" above. Do NOT add the slide reference name ("${slideTitle}") as a visible title or heading in the image.`)
  lines.push(``)
  lines.push(`VISUAL STYLE:`)
  lines.push(`- Size: 1280x960px PNG, clean white or very light background`)
  lines.push(`- Primary color: ${colors.primary}`)
  lines.push(`- Secondary color: ${colors.secondary}`)
  lines.push(`- Accent color: ${colors.accent}`)
  lines.push(`- Font: modern sans-serif, no decorative fonts`)
  lines.push(`- Style: corporate professional, clean, no watermarks, no blurry text`)

  if (backgroundUrl) {
    lines.push(`- IMPORTANT: Use the provided background image (above) as the base background of this infographic. Keep text and graphics readable on top of it.`)
  }
  if (logoUrl) {
    lines.push(`- Top-right corner: leave a 160x90px clean white/transparent area for the company logo (will be composited after generation)`)
  }

  lines.push(``)
  lines.push(`IMPORTANT: DO NOT include code snippets, ASCII art, or large text blocks. DO include: icons, colored shapes, charts, arrows, clear short labels. Use real data and metrics from the storyboard content above.`)

  return lines.join('\n')
}

export function buildTechnicalPrompt(
  variant: 1 | 2 | 3,
  stepData: StepData,
  colors: BrandColors
): string {
  const projectName = stepData.step1?.projectName ?? 'Project'
  const whatItDoes = stepData.step3?.whatItDoes ?? ''
  const requirements = stepData.step3?.requirements ?? ''
  const outputs = stepData.step3?.outputs ?? ''
  const objective = stepData.step2?.objective ?? ''

  const baseStyle = `White background, clean professional corporate style, 1024x768px PNG, no blurry text, no watermarks. Use colors: primary ${colors.primary}, secondary ${colors.secondary}, accent ${colors.accent}.`

  if (variant === 1) {
    return `Create a technical DATA FLOW DIAGRAM for a software project named "${projectName}".
Layout: LEFT to RIGHT flow with colored blocks and arrows.
What the system does: ${whatItDoes || 'Multi-tier web application processing data from inputs to outputs'}.
Visual elements: Input blocks (primary color ${colors.primary}), Processing blocks (secondary color ${colors.secondary}), Output blocks (accent color ${colors.accent}), arrows connecting them.
Style: Include clear labels on each block, directional arrows, swimlane-like sections for different tiers.
${baseStyle}
Do NOT include: code snippets, ASCII art, excessive text. DO include: colored rectangles, rounded boxes, arrows, simple icons.`
  }

  if (variant === 2) {
    return `Create a SOFTWARE ARCHITECTURE DIAGRAM showing system components for project "${projectName}".
Objective: ${objective || 'Automate business processes with a modern scalable system'}.
Dependencies: ${requirements || 'APIs, databases, cloud services'}.
Outputs: ${outputs || 'Reports, notifications, stored records'}.
Visual elements: Component boxes with icons, layer separation (Input / Processing / Storage / Output), connection lines between components.
Colors: Use ${colors.primary} for input/frontend components, ${colors.secondary} for processing/logic, ${colors.accent} for storage/output.
${baseStyle}
Include: service names, component labels, connection arrows, cloud-style icons.`
  }

  // variant === 3
  return `Create a TECHNICAL SOLUTION SUMMARY infographic for project "${projectName}".
What it does: ${whatItDoes || 'Automates complex business operations'}.
Key requirements: ${requirements || 'External APIs, authentication, storage'}.
Deliverables: ${outputs || 'Reports, dashboards, processed records'}.
Layout: 3-column layout showing INPUTS → PROCESS → OUTPUTS with icons and short labels.
Colors: Use ${colors.primary} for inputs section, ${colors.secondary} for process section, ${colors.accent} for outputs section.
${baseStyle}
Include: section headers, bullet points with icons, directional flow arrows, clear labels.`
}
