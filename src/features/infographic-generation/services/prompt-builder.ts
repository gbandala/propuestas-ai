import type { StepData } from '@/features/technical-brief/types'

interface BrandColors {
  primary: string
  secondary: string
  accent: string
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
