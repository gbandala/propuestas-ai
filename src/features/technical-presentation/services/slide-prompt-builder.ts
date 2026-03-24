/**
 * Prompt builder para generación de slides como imágenes (1376x768px).
 * Cada slide se genera de forma independiente con su propio prompt visual.
 * Usa los mismos modelos de imagen que las infografías técnicas.
 */

interface BrandInfo {
  primary: string
  secondary: string
  accent: string
  background?: string
  fontFamily?: string
}

interface SlideData {
  projectName: string
  clientName: string
  architectName?: string
  date: string
  problem?: string
  objective?: string
  whatItDoes?: string
  requirements?: string
  outputs?: string
  howToTest?: string
  architectureDecisions?: string
  deliverables?: string
  finalAcceptanceCriteria?: string
  storyboardContent?: string
  infographicUrl?: string | null
}

const BASE_STYLE = (brand: BrandInfo) =>
  `Professional presentation slide, 1376x768px, RGBA PNG. Clean corporate design. Primary color: ${brand.primary}. Secondary color: ${brand.secondary}. Accent color: ${brand.accent}. NO watermarks. NO blurry text. NO emojis as icons. Use geometric shapes, clean typography, and solid color blocks.`

export function buildSlidePrompt(
  slideNumber: number,
  data: SlideData,
  brand: BrandInfo,
  comments?: string
): string {
  const base = BASE_STYLE(brand)
  const revision = comments
    ? `\nUSER REVISION REQUEST: "${comments}". Apply this change while keeping the same style and color scheme.`
    : ''

  switch (slideNumber) {
    case 1:
      return `Create a COVER SLIDE for a technical software proposal.
Project: "${data.projectName}". Client: "${data.clientName}". Date: ${data.date}.${data.architectName ? ` Architect: ${data.architectName}.` : ''}
Layout: Full background in primary color ${brand.primary}. Large centered project name in white bold typography. Client name below in secondary color ${brand.secondary} or white semi-transparent. Date bottom-right in small white text.${data.architectName ? ` Architect name bottom-left in white.` : ''}
Add a subtle geometric accent shape (diagonal stripe, corner element, or horizontal line) in accent color ${brand.accent}.
${base}${revision}`

    case 2:
      return `Create a "THE PROBLEM" slide for a software proposal.
Project: "${data.projectName}".
Problem statement: ${data.problem || 'Inefficient manual processes causing delays and errors'}.
Layout: Header bar in primary color ${brand.primary} with white title "El Problema". White background body.
Show 2-3 problem bullets as visual cards with left border in accent color ${brand.accent}. Each card has a short label and 1 sentence description.
Bottom stat or impact: highlight the main pain point in a colored callout box (secondary color ${brand.secondary}).
${base}${revision}`

    case 3:
      return `Create an "OBJECTIVE AND SCOPE" slide for a software proposal.
Project: "${data.projectName}".
Objective: ${data.objective || 'Build a scalable automated system'}.
What it does: ${data.whatItDoes || 'Automates key business operations'}.
Layout: Header bar in primary color ${brand.primary} with white title "Objetivo y Alcance".
Two columns: LEFT column titled "Objetivo" with a large icon-less colored box (primary ${brand.primary}) containing the main objective text. RIGHT column titled "Alcance" listing 3-4 scope items as checklist with checkmarks in accent color ${brand.accent}.
${base}${revision}`

    case 4:
      return `Create a "TECHNICAL SOLUTION" slide for a software proposal.
Project: "${data.projectName}".
What it does: ${data.whatItDoes || 'Processes inputs and generates automated outputs'}.
Requirements: ${data.requirements || 'APIs, authentication, storage'}.
Outputs: ${data.outputs || 'Reports, notifications, records'}.
Layout: Header bar in primary color ${brand.primary} with white title "Solucion Tecnica".
Center: horizontal flow diagram — INPUTS box (primary color) → arrow → PROCESS box (secondary color ${brand.secondary}) → arrow → OUTPUTS box (accent color ${brand.accent}).
Each box has 2-3 short bullet labels inside. Arrows are thick and directional.
${base}${revision}`

    case 5:
      return `Create an "ARCHITECTURE AND STACK" slide for a software proposal.
Project: "${data.projectName}".
Stack and architecture decisions: ${data.architectureDecisions || 'Modern cloud-native stack with microservices'}.
Requirements: ${data.requirements || 'Cloud APIs, databases, authentication'}.
Layout: Header bar in primary color ${brand.primary} with white title "Arquitectura y Stack".
Show 3-4 technology layer boxes stacked vertically: Frontend, Backend, Database, Infrastructure. Each layer is a rounded rectangle with the layer name and 1-2 tech names as pill badges in accent color ${brand.accent}.
Right side: small vertical flow arrows connecting the layers.
${base}${revision}`

    case 6:
      return data.infographicUrl
        ? `Create a "TECHNICAL INFOGRAPHIC REFERENCE" slide for a software proposal.
Project: "${data.projectName}".
Layout: Header bar in primary color ${brand.primary} with white title "Infografia Tecnica".
Center: Large framed image placeholder area with rounded border in secondary color ${brand.secondary}, labeled "Diagrama Tecnico del Sistema" in the center. Add a decorative frame with corner accents in accent color ${brand.accent}.
Below the frame: 2-3 short caption bullets summarizing what the diagram shows.
${base}${revision}`
        : `Create a "SYSTEM COMPONENTS" slide for a software proposal.
Project: "${data.projectName}".
What it does: ${data.whatItDoes || 'Multi-tier system with integrated components'}.
Layout: Header bar in primary color ${brand.primary} with white title "Componentes del Sistema".
Show a component diagram: 4-6 rounded rectangles arranged in a grid, connected by lines. Each box has a component name. Color the boxes alternating between primary and secondary colors.
${base}${revision}`

    case 7:
      return `Create an "ARCHITECTURE DECISIONS" slide for a software proposal.
Project: "${data.projectName}".
Decisions: ${data.architectureDecisions || 'Cloud infrastructure, REST APIs, relational database'}.
Layout: Header bar in primary color ${brand.primary} with white title "Decisiones de Arquitectura".
Body: 2-column table. Left column header "Tecnologia" (background primary color ${brand.primary}, white text). Right column header "Razon" (background secondary color ${brand.secondary}, white text).
Show 4-5 rows with alternating row backgrounds (white and very light gray). Left column: technology name in bold. Right column: short reason phrase.
${base}${revision}`

    case 8:
      return `Create a "DELIVERABLES" slide for a software proposal.
Project: "${data.projectName}".
Deliverables: ${data.deliverables || 'Working software, documentation, tests, deployment'}.
Acceptance criteria: ${data.finalAcceptanceCriteria || 'All automated tests pass and client approval'}.
Layout: Header bar in primary color ${brand.primary} with white title "Entregables".
Body: styled table with 3 columns — "Entregable", "Formato", "Criterio de Aceptacion". Header row in primary color ${brand.primary} with white text. 3-4 data rows with alternating backgrounds.
Bottom: highlighted box in accent color ${brand.accent} showing the final acceptance criteria.
${base}${revision}`

    case 9:
      return `Create a "SUCCESS CRITERIA" slide for a software proposal.
Project: "${data.projectName}".
How to measure success: ${data.howToTest || 'Automated tests, performance benchmarks, user acceptance'}.
Acceptance criteria: ${data.finalAcceptanceCriteria || 'All criteria met and approved by stakeholders'}.
Layout: Header bar in primary color ${brand.primary} with white title "Criterios de Exito".
Body: 3-4 KPI metric cards arranged in a 2x2 grid. Each card has a short metric name, a percentage or qualitative goal, and a horizontal progress bar filled in accent color ${brand.accent}. Cards have white background with subtle shadow and left border in primary color ${brand.primary}.
${base}${revision}`

    case 10:
      return `Create a "NEXT STEPS" slide for a software proposal.
Project: "${data.projectName}". Client: "${data.clientName}".
Layout: Header bar in primary color ${brand.primary} with white title "Proximos Pasos".
Body: horizontal timeline with 4 phases. Each phase is a circle (filled with alternating primary/accent colors) connected by a horizontal line. Below each circle: phase name and short action item.
Bottom: closing statement in a highlighted box — "Listos para iniciar" or similar, in secondary color ${brand.secondary}.
Bottom right: project name and client name in small text.
${base}${revision}`

    default:
      return `Create a professional presentation slide number ${slideNumber} for project "${data.projectName}".
Content from storyboard: ${data.storyboardContent || 'Technical content slide'}.
Layout: Header bar in primary color ${brand.primary}. Clean white body with content organized in cards or bullets. Use accent color ${brand.accent} for highlights.
${base}${revision}`
  }
}

export function extractSlideData(
  stepData: Record<string, unknown>,
  projectName: string,
  clientName: string
): SlideData {
  const step1 = stepData.step1 as Record<string, string> | undefined
  const step2 = stepData.step2 as Record<string, string> | undefined
  const step3 = stepData.step3 as Record<string, string> | undefined
  const step4 = stepData.step4 as Record<string, string> | undefined
  const step5 = stepData.step5 as Record<string, unknown> | undefined

  const deliverablesList = (step5?.deliverables as Array<{ name: string; format: string; acceptanceCriteria: string }> | undefined)
    ?.map((d) => `${d.name} (${d.format})`)
    .join(', ') ?? ''

  return {
    projectName: step1?.projectName ?? projectName,
    clientName: step1?.clientCompany ?? clientName,
    architectName: step1?.architectName,
    date: step1?.date ? new Date(step1.date).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX'),
    problem: step2?.problem,
    objective: step2?.objective,
    whatItDoes: step3?.whatItDoes,
    requirements: step3?.requirements,
    outputs: step3?.outputs,
    howToTest: step3?.howToTest,
    architectureDecisions: step4?.architectureDecisions,
    deliverables: deliverablesList,
    finalAcceptanceCriteria: typeof step5?.finalAcceptanceCriteria === 'string' ? step5.finalAcceptanceCriteria : undefined,
  }
}

export function parseBrand(brandMarkdown: string): BrandInfo {
  const hexMatch = brandMarkdown.match(/#([A-Fa-f0-9]{6})/g) ?? []
  const colors = hexMatch.map((h) => h.toUpperCase())

  return {
    primary: colors[0] ?? '#1E3A5F',
    secondary: colors[1] ?? '#2D6A9F',
    accent: colors[2] ?? '#F59E0B',
    background: colors[3],
  }
}
