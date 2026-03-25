'use client'

import { useEffect, useState } from 'react'
import { useProposalStore } from '../store/proposal.store'
import { useProposalJobProgress } from '../hooks/useProposalJobProgress'
import { ProposalSlideCard } from './ProposalSlideCard'
import { ProposalLightbox } from './ProposalLightbox'
import {
  generateProposalInfographics,
  getProposalInfographics,
  retryProposalSlide,
} from '@/actions/infographics'

interface ProposalInfographicGeneratorProps {
  projectId: string
}

export function ProposalInfographicGenerator({ projectId }: ProposalInfographicGeneratorProps) {
  const {
    slides,
    slideOrder,
    isStarting,
    setIsStarting,
    setSlideState,
    initSlides,
    resetAll,
  } = useProposalStore()

  const [jobIdToSlide, setJobIdToSlide] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lightboxSlide, setLightboxSlide] = useState<number | null>(null)

  useProposalJobProgress(projectId, jobIdToSlide)

  // Cargar infografías existentes al montar
  useEffect(() => {
    async function load() {
      const result = await getProposalInfographics(projectId)
      if ('error' in result) {
        setLoadError(result.error)
        return
      }

      const { jobs, infographics, slides: storyboardSlides } = result.data

      // Inicializar slides desde el storyboard
      if (storyboardSlides.length > 0) {
        initSlides(storyboardSlides.map((s) => ({ slideIndex: s.slideNumber, slideTitle: s.title })))
      }

      // Restaurar imágenes completadas
      infographics.forEach((inf) => {
        if (!inf.slide_index) return
        setSlideState(inf.slide_index, {
          infographicId: inf.id,
          imageUrl: inf.url,
          status: 'completed',
          progress: 100,
        })
      })

      // Restaurar jobs activos
      const mapping: Record<string, number> = {}
      jobs.forEach((job) => {
        if (!job.slide_number) return
        mapping[job.id] = job.slide_number
        if (job.status === 'pending' || job.status === 'running') {
          setSlideState(job.slide_number, {
            jobId: job.id,
            status: job.status as 'pending' | 'running',
            progress: job.progress ?? 0,
          })
        } else if (job.status === 'failed') {
          const alreadyDone = infographics.some((i) => i.slide_index === job.slide_number)
          if (!alreadyDone) {
            setSlideState(job.slide_number, {
              jobId: job.id,
              status: 'failed',
              error: job.error ?? 'Error desconocido',
            })
          }
        }
      })
      if (Object.keys(mapping).length > 0) {
        setJobIdToSlide(mapping)
      }
    }

    resetAll()
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setIsStarting(true)
    setLoadError(null)

    const result = await generateProposalInfographics(projectId)

    if ('error' in result) {
      setLoadError(result.error)
      setIsStarting(false)
      return
    }

    const { jobIdToSlide: newMapping, slides: newSlides } = result.data

    // Inicializar (o re-inicializar) slides
    initSlides(newSlides.map((s) => ({ slideIndex: s.slideNumber, slideTitle: s.title })))

    // Marcar todos como pending
    Object.entries(newMapping).forEach(([jobId, slideIndex]) => {
      setSlideState(slideIndex, { jobId, status: 'pending', progress: 0 })
    })

    setJobIdToSlide(newMapping)
    setIsStarting(false)
  }

  async function handleRetry(slideIndex: number) {
    const result = await retryProposalSlide(projectId, slideIndex)
    if ('error' in result) return

    const { jobId } = result.data
    setSlideState(slideIndex, { jobId, status: 'pending', progress: 0, error: null })
    setJobIdToSlide((prev) => ({ ...prev, [jobId]: slideIndex }))
  }

  const anyCompleted = slideOrder.some((i) => slides[i]?.status === 'completed')
  const anyRunning = slideOrder.some(
    (i) => slides[i]?.status === 'pending' || slides[i]?.status === 'running'
  )
  const noSlides = slideOrder.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Infografías de la Propuesta</h2>
          <p className="mt-1 text-sm text-gray-500">
            {slideOrder.length > 0
              ? `${slideOrder.length} slides del storyboard. Genera todas con IA o usa ↺ para regenerar una sola.`
              : 'Genera las infografías a partir del storyboard aprobado.'}
          </p>
        </div>

        {!anyRunning && (
          <button
            onClick={handleGenerate}
            disabled={isStarting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isStarting
              ? 'Iniciando...'
              : anyCompleted
              ? 'Regenerar todas'
              : 'Generar infografías'}
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
            Generando infografías con IA... Puede tardar 30–60 segundos por slide.
          </p>
        </div>
      )}

      {/* Grid de slides */}
      {!noSlides && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slideOrder.map((slideIndex) => (
            <ProposalSlideCard
              key={slideIndex}
              slideIndex={slideIndex}
              state={slides[slideIndex]}
              onRetry={handleRetry}
              onZoom={setLightboxSlide}
            />
          ))}
        </div>
      )}

      {noSlides && !loadError && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-500">
            Cargando slides del storyboard...
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSlide !== null && (
        <ProposalLightbox
          openSlideIndex={lightboxSlide}
          slides={slides}
          slideOrder={slideOrder}
          onClose={() => setLightboxSlide(null)}
          onNavigate={setLightboxSlide}
        />
      )}
    </div>
  )
}
