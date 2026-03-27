'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { GenerationProgressBar } from './GenerationProgressBar'
import type { ProposalSlideState } from '../store/proposal.store'

function DownloadButton({ url, label }: { url: string; label: string }) {
  const filename = `slide-${label.toLowerCase().replace(/\s+/g, '-')}.png`
  const href = `/api/download-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
  return (
    <a
      href={href}
      download={filename}
      onClick={(e) => e.stopPropagation()}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
      title="Descargar imagen"
    >
      ↓ Descargar
    </a>
  )
}

interface ProposalSlideCardProps {
  slideIndex: number
  state: ProposalSlideState
  onRetry: (slideIndex: number) => Promise<void>
  onZoom: (slideIndex: number) => void
}

export function ProposalSlideCard({ slideIndex, state, onRetry, onZoom }: ProposalSlideCardProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  // Track image URL that existed before a retry started (to keep showing it during regeneration)
  const prevImageUrlRef = useRef(state.imageUrl)
  const retryingWithImageRef = useRef<string | null>(null)

  const isCompleted = state.status === 'completed'
  const isFailed = state.status === 'failed'
  const isLoading = state.status === 'pending' || state.status === 'running'

  // Reset isRetrying once the polling confirms the job is running
  useEffect(() => {
    if (isLoading) setIsRetrying(false)
  }, [isLoading])

  // Detect when a new image URL arrives (regeneration completed) — show loading
  // overlay until the browser finishes downloading the new image.
  useEffect(() => {
    if (state.imageUrl && state.imageUrl !== prevImageUrlRef.current) {
      setIsImageLoading(true)
      prevImageUrlRef.current = state.imageUrl
    }
  }, [state.imageUrl])

  // Clear the "retrying with image" snapshot once the slide is no longer loading
  useEffect(() => {
    if (!isLoading && !isRetrying) {
      retryingWithImageRef.current = null
    }
  }, [isLoading, isRetrying])

  async function handleRetryClick() {
    // Snapshot the current image URL so we can keep showing it during regeneration
    if (state.imageUrl) retryingWithImageRef.current = state.imageUrl
    setIsRetrying(true)
    await onRetry(slideIndex)
  }

  const buttonBusy = isRetrying || isImageLoading
  // Image to show while a retry is in-flight (keeps the previous image visible)
  const frozenImageUrl = retryingWithImageRef.current

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Slide header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          {slideIndex}
        </span>
        <p className="text-sm font-medium text-gray-800 truncate">{state.slideTitle}</p>
        {isCompleted && (
          <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Lista
          </span>
        )}
        {isLoading && (
          <span className="ml-auto shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 animate-pulse">
            Generando...
          </span>
        )}
        {isFailed && (
          <span className="ml-auto shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Error
          </span>
        )}
      </div>

      {/* Image area */}
      <div className="relative aspect-[4/3] bg-gray-50">
        {/* Completed — show image */}
        {isCompleted && state.imageUrl ? (
          <>
            <Image
              src={state.imageUrl}
              alt={state.slideTitle}
              fill
              className="object-cover"
              unoptimized
              onLoad={() => setIsImageLoading(false)}
            />
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            )}
            {!isImageLoading && (
              <button
                onClick={() => onZoom(slideIndex)}
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                title="Ver en detalle"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            )}
          </>
        ) : (isLoading || isRetrying) && frozenImageUrl ? (
          // Regenerating — keep showing previous image with overlay spinner
          <>
            <Image
              src={frozenImageUrl}
              alt={state.slideTitle}
              fill
              className="object-cover opacity-60"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs font-medium text-gray-700">Regenerando...</p>
              </div>
            </div>
          </>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3 px-4">
              <div className="mx-auto h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500">Generando imagen...</p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2 px-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <span className="text-red-600 text-lg">!</span>
              </div>
              <p className="text-sm text-red-600">Error al generar</p>
              <p className="text-xs text-gray-400">Verifica tu conexión e intenta de nuevo</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center px-4 space-y-2">
              <div className="mx-auto h-12 w-12 rounded-lg bg-gray-200" />
              <p className="text-sm text-gray-400">En espera</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-2">
        {(isLoading || isFailed) && (
          <GenerationProgressBar
            status={state.status}
            progress={state.progress}
            error={state.error}
          />
        )}

        {isFailed && (
          <button
            onClick={handleRetryClick}
            disabled={buttonBusy}
            className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonBusy ? 'Iniciando...' : 'Reintentar'}
          </button>
        )}

        {isCompleted && (
          <div className="flex gap-2">
            {state.imageUrl && !isImageLoading && (
              <DownloadButton url={state.imageUrl} label={`slide-${slideIndex}`} />
            )}
            <button
              onClick={handleRetryClick}
              disabled={buttonBusy}
              className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Regenerar este slide"
            >
              {isRetrying ? '⟳ Iniciando...' : isImageLoading ? '⟳ Cargando...' : '↺ Regenerar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
