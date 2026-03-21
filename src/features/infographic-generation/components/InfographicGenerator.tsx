'use client'

import { useEffect, useState } from 'react'
import { useInfographicStore } from '../store/infographic.store'
import { useRealtimeJobProgress } from '../hooks/useRealtimeJobProgress'
import { InfographicVariantGrid } from './InfographicVariantGrid'
import {
  generateTechnicalInfographics,
  selectInfographicVariant,
  getProjectInfographics,
  retryInfographicVariant,
} from '@/actions/infographics'
import type { TechnicalVariant } from '../types'

interface InfographicRecord {
  id: string
  variant: number
  url: string
  selected: boolean
  prompt_used?: string
}

interface GenerationJob {
  id: string
  status: string
  progress: number
  error?: string
}

interface InfographicGeneratorProps {
  projectId: string
}

export function InfographicGenerator({ projectId }: InfographicGeneratorProps) {
  const {
    isStarting,
    setIsStarting,
    setVariantState,
    setSelectedVariant,
    resetAll,
  } = useInfographicStore()

  const [jobIds, setJobIds] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Subscribe to realtime job progress
  useRealtimeJobProgress(projectId, jobIds)

  // Load existing infographics on mount
  useEffect(() => {
    async function load() {
      const result = await getProjectInfographics(projectId)
      if ('error' in result) {
        setLoadError(result.error)
        return
      }

      const { jobs, infographics } = result.data as {
        jobs: GenerationJob[]
        infographics: InfographicRecord[]
      }

      // Restore job IDs for realtime subscription (only active jobs)
      const activeJobs = jobs.filter(
        (j) => j.status === 'pending' || j.status === 'running'
      )
      if (activeJobs.length > 0) {
        setJobIds(jobs.slice(0, 3).map((j) => j.id))
      }

      // Restore variant state from existing data
      infographics.forEach((inf) => {
        const variant = inf.variant as TechnicalVariant
        setVariantState(variant, {
          infographicId: inf.id,
          imageUrl: inf.url,
          status: 'completed',
          progress: 100,
          selected: inf.selected,
        })
        if (inf.selected) {
          setSelectedVariant(variant)
        }
      })

      // Restore in-progress jobs
      jobs.forEach((job, index) => {
        const variant = (index + 1) as TechnicalVariant
        if (job.status === 'pending' || job.status === 'running') {
          setVariantState(variant, {
            jobId: job.id,
            status: job.status,
            progress: job.progress ?? 0,
          })
        } else if (job.status === 'failed') {
          const alreadyCompleted = infographics.some(
            (inf) => inf.variant === variant
          )
          if (!alreadyCompleted) {
            setVariantState(variant, {
              jobId: job.id,
              status: 'failed',
              error: job.error ?? 'Error desconocido',
            })
          }
        }
      })
    }

    resetAll()
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setIsStarting(true)
    setLoadError(null)

    const result = await generateTechnicalInfographics(projectId)

    if ('error' in result) {
      setLoadError(result.error)
      setIsStarting(false)
      return
    }

    const ids = result.data.jobIds
    setJobIds(ids)

    // Mark all 3 variants as pending
    ids.forEach((jobId, index) => {
      const variant = (index + 1) as TechnicalVariant
      setVariantState(variant, { jobId, status: 'pending', progress: 0 })
    })

    setIsStarting(false)
  }

  async function handleSelect(variant: TechnicalVariant) {
    const { variants } = useInfographicStore.getState()
    const infographicId = variants[variant].infographicId
    if (!infographicId) return

    const result = await selectInfographicVariant(infographicId, projectId)
    if ('error' in result) return

    setSelectedVariant(variant)
  }

  async function handleRetry(variant: TechnicalVariant) {
    const result = await retryInfographicVariant(projectId, variant)
    if ('error' in result) return

    const { jobId } = result.data
    setVariantState(variant, {
      jobId,
      status: 'pending',
      progress: 0,
      error: null,
    })

    // Add new jobId to subscription if not present
    setJobIds((prev) => {
      const updated = [...prev]
      updated[variant - 1] = jobId
      return updated
    })
  }

  const { variants } = useInfographicStore()
  const anyCompleted = Object.values(variants).some((v) => v.status === 'completed')
  const anyRunning = Object.values(variants).some(
    (v) => v.status === 'pending' || v.status === 'running'
  )
  const allIdle = Object.values(variants).every((v) => v.status === 'idle')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Infografías Técnicas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Genera 3 variantes de infografía técnica con IA. Selecciona la que mejor represente tu propuesta.
          </p>
        </div>

        {(allIdle || anyCompleted) && (
          <button
            onClick={handleGenerate}
            disabled={isStarting || anyRunning}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isStarting ? 'Iniciando...' : anyCompleted ? 'Regenerar todas' : 'Generar infografías'}
          </button>
        )}
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{loadError}</p>
        </div>
      )}

      {anyRunning && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Generando infografías con IA... Esto puede tardar 30–60 segundos por variante.
          </p>
        </div>
      )}

      <InfographicVariantGrid onSelect={handleSelect} onRetry={handleRetry} />
    </div>
  )
}
