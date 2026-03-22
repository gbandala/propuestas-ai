'use client'

import { useEffect, useState } from 'react'
import { useTechnicalBriefStore } from '../store/technical-brief.store'
import { useTechnicalBrief } from '../hooks/useTechnicalBrief'
import { generateBriefMarkdown } from '../services/brief-generator'
import { StepProgressBar } from './StepProgressBar'
import { BriefPreview } from './BriefPreview'
import { Step1ProjectData } from './steps/Step1ProjectData'
import { Step2Context } from './steps/Step2Context'
import { Step3TechSolution } from './steps/Step3TechSolution'
import { Step4Decisions } from './steps/Step4Decisions'
import { Step5Deliverables } from './steps/Step5Deliverables'
import type { TechnicalBrief } from '@/types/database'
import type { StepData } from '../types'

interface TechnicalBriefFormProps {
  projectId: string
  projectName: string
  initialBrief: TechnicalBrief
}

export function TechnicalBriefForm({ projectId, projectName, initialBrief }: TechnicalBriefFormProps) {
  const { setStepData, setCurrentStep } = useTechnicalBriefStore()
  const { stepData, currentStep, isSaving, isGenerating, saveCurrentStep, goToStep, generateBrief } =
    useTechnicalBrief(projectId)
  const [showPreview, setShowPreview] = useState(false)
  const [previewMarkdown, setPreviewMarkdown] = useState('')

  useEffect(() => {
    setStepData(initialBrief.step_data as StepData)
    setCurrentStep(initialBrief.current_step)
  }, [initialBrief, setStepData, setCurrentStep])

  async function handleStepNext<K extends keyof Omit<StepData, 'generatedBrief'>>(
    stepKey: K,
    data: StepData[K],
    nextStep: number
  ) {
    await saveCurrentStep(stepKey, data)
    goToStep(nextStep)
  }

  async function handleStep5Complete(data: StepData['step5']) {
    await saveCurrentStep('step5', data)
    const updatedStepData = { ...stepData, step5: data }
    const md = generateBriefMarkdown(updatedStepData, projectName)
    setPreviewMarkdown(md)
    setShowPreview(true)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <StepProgressBar currentStep={currentStep} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {currentStep === 1 && (
          <Step1ProjectData
            initialData={stepData.step1}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step1', data, 2)}
          />
        )}
        {currentStep === 2 && (
          <Step2Context
            initialData={stepData.step2}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step2', data, 3)}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3TechSolution
            initialData={stepData.step3}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step3', data, 4)}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step4Decisions
            initialData={stepData.step4}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step4', data, 5)}
            onBack={() => goToStep(3)}
          />
        )}
        {currentStep === 5 && (
          <Step5Deliverables
            initialData={stepData.step5}
            isSaving={isSaving}
            onNext={handleStep5Complete}
            onBack={() => goToStep(4)}
          />
        )}
      </div>

      {showPreview && (
        <BriefPreview
          markdown={previewMarkdown}
          onCancel={() => setShowPreview(false)}
          isGenerating={isGenerating}
          onConfirm={generateBrief}
        />
      )}
    </div>
  )
}
