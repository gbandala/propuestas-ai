import { create } from 'zustand'
import type { VariantStatus } from '../types'

export interface ProposalSlideState {
  jobId: string | null
  infographicId: string | null
  status: VariantStatus
  progress: number
  imageUrl: string | null
  error: string | null
  slideTitle: string
}

interface ProposalStore {
  slides: Record<number, ProposalSlideState>
  slideOrder: number[]
  isStarting: boolean
  setIsStarting: (v: boolean) => void
  setSlideState: (slideIndex: number, state: Partial<ProposalSlideState>) => void
  initSlides: (slides: Array<{ slideIndex: number; slideTitle: string }>) => void
  resetAll: () => void
}

const INITIAL_SLIDE: Omit<ProposalSlideState, 'slideTitle'> = {
  jobId: null,
  infographicId: null,
  status: 'idle',
  progress: 0,
  imageUrl: null,
  error: null,
}

export const useProposalStore = create<ProposalStore>((set) => ({
  slides: {},
  slideOrder: [],
  isStarting: false,
  setIsStarting: (v) => set({ isStarting: v }),
  setSlideState: (slideIndex, state) =>
    set((s) => ({
      slides: {
        ...s.slides,
        [slideIndex]: { ...s.slides[slideIndex], ...state },
      },
    })),
  initSlides: (slides) => {
    const initial: Record<number, ProposalSlideState> = {}
    slides.forEach(({ slideIndex, slideTitle }) => {
      initial[slideIndex] = { ...INITIAL_SLIDE, slideTitle }
    })
    set({ slides: initial, slideOrder: slides.map((s) => s.slideIndex) })
  },
  resetAll: () => set({ slides: {}, slideOrder: [], isStarting: false }),
}))
