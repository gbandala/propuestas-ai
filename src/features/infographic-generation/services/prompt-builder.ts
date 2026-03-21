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
  const architectureDesc = stepData.step7?.architectureDescription ?? ''
  const stackBackend = stepData.step7?.stackBackend ?? ''
  const stackFrontend = stepData.step7?.stackFrontend ?? ''
  const stackDatabase = stepData.step7?.stackDatabase ?? ''
  const phases = stepData.step7?.phases ?? []
  const phasesList = phases.map((p) => `${p.name} (${p.duration})`).join(', ')

  const baseStyle = `White background, clean professional corporate style, 1024x768px PNG, no blurry text, no watermarks. Use colors: primary ${colors.primary}, secondary ${colors.secondary}, accent ${colors.accent}.`

  if (variant === 1) {
    return `Create a technical DATA FLOW DIAGRAM for a software project named "${projectName}".
Layout: LEFT to RIGHT flow with colored blocks and arrows.
Architecture: ${architectureDesc || 'Multi-tier web application'}.
Visual elements: Input blocks (primary color ${colors.primary}), Processing blocks (secondary color ${colors.secondary}), Output blocks (accent color ${colors.accent}), arrows connecting them.
Style: Include clear labels on each block, directional arrows, swimlane-like sections for different tiers.
${baseStyle}
Do NOT include: code snippets, ASCII art, excessive text. DO include: colored rectangles, rounded boxes, arrows, simple icons.`
  }

  if (variant === 2) {
    return `Create a SOFTWARE COMPONENT ARCHITECTURE DIAGRAM in AWS/Azure style for project "${projectName}".
Stack: Backend (${stackBackend || 'Node.js + Express'}), Frontend (${stackFrontend || 'React + Next.js'}), Database (${stackDatabase || 'PostgreSQL'}).
Visual elements: Component boxes with icons, layer separation (Frontend / API / Backend / Database), connection lines between components.
Colors: Use ${colors.primary} for frontend components, ${colors.secondary} for backend/API, ${colors.accent} for database/storage.
${baseStyle}
Include: service names, component labels, connection arrows, cloud-style icons.`
  }

  // variant === 3
  return `Create a TECHNICAL PROJECT TIMELINE / Gantt-style diagram for project "${projectName}".
Phases: ${phasesList || 'Discovery (2 weeks), Design (3 weeks), Implementation (8 weeks), Rollout (2 weeks)'}.
Layout: Horizontal timeline left to right, each phase as a colored bar.
Colors: Use alternating shades of ${colors.primary} and ${colors.secondary} for phases, ${colors.accent} for milestones.
Visual elements: Phase name labels, duration text, milestone diamonds, progress indicators.
${baseStyle}
Include: phase bars, dates/durations, milestone markers, phase labels.`
}
