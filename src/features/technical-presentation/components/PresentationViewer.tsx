'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  generatePresentation,
  getPresentationSlides,
  retryPresentationSlide,
  type PresentationSlide,
} from '@/actions/presentations'

const SLIDE_LABELS: Record<number, string> = {
  1: 'Portada',
  2: 'El Problema',
  3: 'Objetivo y Alcance',
  4: 'Solución Técnica',
  5: 'Arquitectura y Stack',
  6: 'Infografía Técnica',
  7: 'Decisiones de Arquitectura',
  8: 'Entregables',
  9: 'Criterios de Éxito',
  10: 'Próximos Pasos',
}

type SlideStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed'

interface SlideState {
  status: SlideStatus
  progress: number
  imageUrl: string | null
  error: string | null
}

function makeSlides(): Record<number, SlideState> {
  return Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      i + 1,
      { status: 'idle' as SlideStatus, progress: 0, imageUrl: null, error: null },
    ])
  )
}

interface PresentationViewerProps {
  projectId: string
}

export function PresentationViewer({ projectId }: PresentationViewerProps) {
  const [slides, setSlides] = useState<Record<number, SlideState>>(makeSlides)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxSlide, setLightboxSlide] = useState<number | null>(null)
  const [retrySlide, setRetrySlide] = useState<number | null>(null)
  const [retryComment, setRetryComment] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function updateSlide(n: number, patch: Partial<SlideState>) {
    setSlides((prev) => ({ ...prev, [n]: { ...prev[n], ...patch } }))
  }

  // Aplica resultados de polling al estado local
  const applyPollResult = useCallback((
    existing: PresentationSlide[],
    jobs: Array<{ id: string; status: string; progress: number; error?: string | null; slide_number?: number | null }>
  ) => {
    setSlides((prev) => {
      const next = { ...prev }

      // Completados
      for (const s of existing) {
        if (next[s.slide_number]?.status !== 'completed') {
          next[s.slide_number] = { status: 'completed', progress: 100, imageUrl: s.url, error: null }
        }
      }

      // Jobs activos o fallidos — solo para slides sin imagen
      const completedNums = new Set(existing.map((s) => s.slide_number))
      for (const job of jobs) {
        const n = job.slide_number
        if (!n || completedNums.has(n)) continue
        if (job.status === 'pending' || job.status === 'running') {
          next[n] = { status: job.status as SlideStatus, progress: job.progress ?? 0, imageUrl: null, error: null }
        } else if (job.status === 'failed') {
          next[n] = { status: 'failed', progress: 0, imageUrl: null, error: job.error ?? 'Error al generar' }
        }
      }

      return next
    })
  }, [])

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function startPolling() {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      const result = await getPresentationSlides(projectId, 'technical')
      if ('error' in result) return

      const { slides: existing, jobs } = result.data as {
        slides: PresentationSlide[]
        jobs: Array<{ id: string; status: string; progress: number; error?: string | null; slide_number?: number | null }>
      }

      applyPollResult(existing, jobs)

      // Parar cuando no haya jobs activos
      const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'running')
      if (!hasActive) stopPolling()
    }, 3000)
  }

  // Carga inicial
  useEffect(() => {
    async function load() {
      const result = await getPresentationSlides(projectId, 'technical')
      if ('error' in result) return

      const { slides: existing, jobs } = result.data as {
        slides: PresentationSlide[]
        jobs: Array<{ id: string; status: string; progress: number; error?: string | null; slide_number?: number | null }>
      }

      applyPollResult(existing, jobs)

      // Si hay jobs activos al cargar, iniciar polling
      const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'running')
      if (hasActive) startPolling()
    }
    load()
    return () => stopPolling()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerateAll() {
    setIsStarting(true)
    setError(null)
    setSlides(makeSlides())

    const result = await generatePresentation(projectId)
    if ('error' in result) {
      setError(result.error)
      setIsStarting(false)
      return
    }

    // Marcar todos como pending e iniciar polling
    setSlides(Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        i + 1,
        { status: 'pending' as SlideStatus, progress: 0, imageUrl: null, error: null },
      ])
    ))
    setIsStarting(false)
    startPolling()
  }

  async function handleRetry(slideNum: number) {
    const comment = retryComment.trim() || undefined
    setRetrySlide(null)
    setRetryComment('')

    updateSlide(slideNum, { status: 'pending', progress: 0, error: null })

    const result = await retryPresentationSlide(projectId, slideNum, comment)
    if ('error' in result) {
      updateSlide(slideNum, { status: 'failed', error: result.error })
      return
    }

    startPolling()
  }

  const slideValues = Object.values(slides)
  const anyCompleted = slideValues.some((s) => s.status === 'completed')
  const anyRunning = slideValues.some((s) => s.status === 'pending' || s.status === 'running')
  const allIdle = slideValues.every((s) => s.status === 'idle')
  const lightboxData = lightboxSlide ? slides[lightboxSlide] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Presentación Técnica</h2>
          <p className="mt-1 text-sm text-gray-500">
            10 slides generados como imágenes con IA. Usa ↺ en cada slide para regenerar individualmente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {anyCompleted && (
            <a
              href={`/api/presentation/download-pptx?projectId=${projectId}&type=technical`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Descargar PPTX
            </a>
          )}
          {(allIdle || anyCompleted) && (
            <button
              onClick={handleGenerateAll}
              disabled={isStarting || anyRunning}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isStarting ? 'Iniciando...' : anyCompleted ? 'Regenerar todos' : 'Generar slides'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {anyRunning && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
          Generando slides con IA... Cada slide tarda ~30-60 segundos. Aparecen a medida que se completan.
        </div>
      )}

      {/* Grid de slides */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <SlideCard
            key={n}
            slideNumber={n}
            label={SLIDE_LABELS[n]}
            state={slides[n]}
            onZoom={() => setLightboxSlide(n)}
            onRetry={() => { setRetrySlide(n); setRetryComment('') }}
          />
        ))}
      </div>

      {/* Retry modal */}
      {retrySlide !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-900">
              Regenerar Slide {retrySlide} — {SLIDE_LABELS[retrySlide]}
            </h3>
            <textarea
              value={retryComment}
              onChange={(e) => setRetryComment(e.target.value)}
              placeholder="Comentario opcional: ej. 'Muestra el stack con colores más vivos' o 'Agrega más detalle al diagrama de flujo'"
              rows={3}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRetrySlide(null); setRetryComment('') }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRetry(retrySlide)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Regenerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSlide !== null && lightboxData?.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxSlide(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-medium text-white">
                Slide {lightboxSlide} — {SLIDE_LABELS[lightboxSlide]}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLightboxSlide((p) => (p && p > 1 ? p - 1 : p))}
                  disabled={lightboxSlide <= 1}
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setLightboxSlide((p) => (p && p < 10 ? p + 1 : p))}
                  disabled={lightboxSlide >= 10}
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20 disabled:opacity-40"
                >
                  Siguiente →
                </button>
                <button
                  onClick={() => setLightboxSlide(null)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxData.imageUrl} alt={`Slide ${lightboxSlide}`} className="w-full rounded-xl" />
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => { setLightboxSlide(null); setRetrySlide(lightboxSlide); setRetryComment('') }}
                className="rounded-lg bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
              >
                ↺ Regenerar este slide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SlideCard
// ---------------------------------------------------------------------------

interface SlideCardProps {
  slideNumber: number
  label: string
  state: SlideState
  onZoom: () => void
  onRetry: () => void
}

function SlideCard({ slideNumber, label, state, onZoom, onRetry }: SlideCardProps) {
  const isActive = state.status === 'pending' || state.status === 'running'

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
      <div className="absolute top-2 left-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-xs font-bold text-white">
        {slideNumber}
      </div>

      <div className="relative aspect-video">
        {state.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.imageUrl} alt={`Slide ${slideNumber}`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <button onClick={onZoom} className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-white">Ver</button>
              <button onClick={onRetry} className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-white">↺</button>
            </div>
          </>
        ) : isActive ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <div className="w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${state.progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{state.progress}%</span>
          </div>
        ) : state.status === 'failed' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="text-xs text-red-500">{state.error ?? 'Error al generar'}</span>
            <button onClick={onRetry} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
              ↺ Reintentar
            </button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300" />
          </div>
        )}
      </div>

      <div className="px-3 py-2">
        <p className="truncate text-xs font-medium text-gray-700">{label}</p>
      </div>
    </div>
  )
}
