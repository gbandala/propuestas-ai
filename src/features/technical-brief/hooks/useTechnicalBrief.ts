'use client'

import { useCallback } from 'react'
import { saveBriefStep, generateBrief } from '@/actions/technical-brief'
import { useTechnicalBriefStore } from '../store/technical-brief.store'
import type { StepData } from '../types'

export function useTechnicalBrief(projectId: string) {
  const {
    stepData,
    currentStep,
    isSaving,
    isGenerating,
    setCurrentStep,
    updateStep,
    setIsSaving,
    setIsGenerating,
  } = useTechnicalBriefStore()

  const saveCurrentStep = useCallback(
    async <K extends keyof Omit<StepData, 'generatedBrief'>>(
      stepKey: K,
      data: StepData[K]
    ): Promise<{ success: true } | { error: string }> => {
      setIsSaving(true)
      updateStep(stepKey, data)

      const stepNum = parseInt(stepKey.replace('step', ''), 10)
      const result = await saveBriefStep(projectId, stepNum, data as unknown as Record<string, unknown>)

      setIsSaving(false)
      return result
    },
    [projectId, setIsSaving, updateStep]
  )

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= 5) setCurrentStep(step)
    },
    [setCurrentStep]
  )

  const handleGenerateBrief = useCallback(async () => {
    setIsGenerating(true)
    await generateBrief(projectId)
    setIsGenerating(false)
  }, [projectId, setIsGenerating])

  return {
    stepData,
    currentStep,
    isSaving,
    isGenerating,
    saveCurrentStep,
    goToStep,
    generateBrief: handleGenerateBrief,
  }
}
