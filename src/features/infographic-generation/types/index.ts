export type TechnicalVariant = 1 | 2 | 3

export const VARIANT_LABELS: Record<TechnicalVariant, string> = {
  1: 'Diagrama de Flujo de Datos',
  2: 'Arquitectura de Componentes',
  3: 'Timeline Técnico de Fases',
}

export const VARIANT_DESCRIPTIONS: Record<TechnicalVariant, string> = {
  1: 'Flujo de datos de izquierda a derecha con bloques de colores',
  2: 'Diagrama estilo AWS/Azure con componentes y capas',
  3: 'Gantt visual con fases de implementación y hitos',
}

export type VariantStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed'

export interface VariantState {
  jobId: string | null
  infographicId: string | null
  status: VariantStatus
  progress: number
  imageUrl: string | null
  error: string | null
  selected: boolean
}

export interface GenerationState {
  variants: Record<TechnicalVariant, VariantState>
  isStarting: boolean
  selectedVariant: TechnicalVariant | null
}

export const INITIAL_VARIANT_STATE: VariantState = {
  jobId: null,
  infographicId: null,
  status: 'idle',
  progress: 0,
  imageUrl: null,
  error: null,
  selected: false,
}
