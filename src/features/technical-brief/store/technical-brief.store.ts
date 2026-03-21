import { create } from 'zustand'
import type { StepData } from '../types'

interface TechnicalBriefStore {
  stepData: StepData
  currentStep: number
  isSaving: boolean
  isGenerating: boolean
  setStepData: (data: StepData) => void
  setCurrentStep: (step: number) => void
  updateStep: <K extends keyof StepData>(key: K, data: StepData[K]) => void
  setIsSaving: (saving: boolean) => void
  setIsGenerating: (generating: boolean) => void
  reset: () => void
}

export const useTechnicalBriefStore = create<TechnicalBriefStore>((set) => ({
  stepData: {},
  currentStep: 1,
  isSaving: false,
  isGenerating: false,
  setStepData: (data) => set({ stepData: data }),
  setCurrentStep: (step) => set({ currentStep: step }),
  updateStep: (key, data) =>
    set((state) => ({ stepData: { ...state.stepData, [key]: data } })),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  reset: () => set({ stepData: {}, currentStep: 1, isSaving: false, isGenerating: false }),
}))
