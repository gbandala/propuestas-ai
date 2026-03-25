'use client'

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
  onRetry: (slideIndex: number) => void
  onZoom: (slideIndex: number) => void
}

export function ProposalSlideCard({ slideIndex, state, onRetry, onZoom }: ProposalSlideCardProps) {
  const isCompleted = state.status === 'completed'
  const isFailed = state.status === 'failed'
  const isLoading = state.status === 'pending' || state.status === 'running'

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
        {isCompleted && state.imageUrl ? (
          <>
            <Image
              src={state.imageUrl}
              alt={state.slideTitle}
              fill
              className="object-cover"
              unoptimized
            />
            <button
              onClick={() => onZoom(slideIndex)}
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              title="Ver en detalle"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
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
              {state.error && <p className="text-xs text-gray-400">{state.error}</p>}
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
            onClick={() => onRetry(slideIndex)}
            className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Reintentar
          </button>
        )}

        {isCompleted && (
          <div className="flex gap-2">
            {state.imageUrl && <DownloadButton url={state.imageUrl} label={`slide-${slideIndex}`} />}
            <button
              onClick={() => onRetry(slideIndex)}
              className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              title="Regenerar este slide"
            >
              ↺ Regenerar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
