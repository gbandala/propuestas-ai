import { create } from 'zustand'
import type { TechnicalVariant, VariantState, GenerationState } from '../types'
import { INITIAL_VARIANT_STATE } from '../types'

interface InfographicStore extends GenerationState {
  setIsStarting: (v: boolean) => void
  setVariantState: (variant: TechnicalVariant, state: Partial<VariantState>) => void
  setSelectedVariant: (variant: TechnicalVariant) => void
  resetAll: () => void
}

const initialState: GenerationState = {
  variants: {
    1: { ...INITIAL_VARIANT_STATE },
    2: { ...INITIAL_VARIANT_STATE },
    3: { ...INITIAL_VARIANT_STATE },
  },
  isStarting: false,
  selectedVariant: null,
}

export const useInfographicStore = create<InfographicStore>((set) => ({
  ...initialState,
  setIsStarting: (v) => set({ isStarting: v }),
  setVariantState: (variant, state) =>
    set((s) => ({
      variants: {
        ...s.variants,
        [variant]: { ...s.variants[variant], ...state },
      },
    })),
  setSelectedVariant: (variant) =>
    set((s) => ({
      selectedVariant: variant,
      variants: {
        1: { ...s.variants[1], selected: variant === 1 },
        2: { ...s.variants[2], selected: variant === 2 },
        3: { ...s.variants[3], selected: variant === 3 },
      },
    })),
  resetAll: () => set(initialState),
}))
