'use client'

import { useEffect, useState } from 'react'
import { useTechnicalBriefStore } from '../store/technical-brief.store'
import { useTechnicalBrief } from '../hooks/useTechnicalBrief'
import { generateBriefMarkdown } from '../services/brief-generator'
import { StepProgressBar } from './StepProgressBar'
import { BriefPreview } from './BriefPreview'
import { Step1ProjectData } from './steps/Step1ProjectData'
import { Step2Problem } from './steps/Step2Problem'
import { Step3ROI } from './steps/Step3ROI'
import { Step4Features } from './steps/Step4Features'
import { Step5Integrations } from './steps/Step5Integrations'
import { Step6Budget } from './steps/Step6Budget'
import { Step7TechSolution } from './steps/Step7TechSolution'
import { Step8Brand } from './steps/Step8Brand'
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

  // Cargar datos desde DB al montar
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

  async function handleStep8Complete(data: StepData['step8']) {
    await saveCurrentStep('step8', data)
    // Generar preview del Markdown
    const updatedStepData = { ...stepData, step8: data }
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
          <Step2Problem
            initialData={stepData.step2}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step2', data, 3)}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3ROI
            initialData={stepData.step3}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step3', data, 4)}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step4Features
            initialData={stepData.step4}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step4', data, 5)}
            onBack={() => goToStep(3)}
          />
        )}
        {currentStep === 5 && (
          <Step5Integrations
            initialData={stepData.step5}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step5', data, 6)}
            onBack={() => goToStep(4)}
          />
        )}
        {currentStep === 6 && (
          <Step6Budget
            initialData={stepData.step6}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step6', data, 7)}
            onBack={() => goToStep(5)}
          />
        )}
        {currentStep === 7 && (
          <Step7TechSolution
            initialData={stepData.step7}
            isSaving={isSaving}
            onNext={(data) => handleStepNext('step7', data, 8)}
            onBack={() => goToStep(6)}
          />
        )}
        {currentStep === 8 && (
          <Step8Brand
            projectId={projectId}
            initialData={stepData.step8}
            isSaving={isSaving}
            onNext={handleStep8Complete}
            onBack={() => goToStep(7)}
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
