'use client'

import Image from 'next/image'
import { VARIANT_LABELS, VARIANT_DESCRIPTIONS } from '../types'
import { GenerationProgressBar } from './GenerationProgressBar'
import type { TechnicalVariant, VariantState } from '../types'

function DownloadButton({ url, label }: { url: string; label: string }) {
  const filename = `infografia-${label.toLowerCase().replace(/\s+/g, '-')}.png`
  const href = `/api/download-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
  return (
    <a
      href={href}
      download={filename}
      onClick={(e) => e.stopPropagation()}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
      title="Descargar imagen"
    >
      ↓
    </a>
  )
}

interface InfographicVariantCardProps {
  variant: TechnicalVariant
  state: VariantState
  onSelect: (variant: TechnicalVariant) => void
  onRetry: (variant: TechnicalVariant) => void
  onZoom: (variant: TechnicalVariant) => void
}

export function InfographicVariantCard({
  variant,
  state,
  onSelect,
  onRetry,
  onZoom,
}: InfographicVariantCardProps) {
  const isCompleted = state.status === 'completed'
  const isFailed = state.status === 'failed'
  const isLoading = state.status === 'pending' || state.status === 'running'
  const isSelected = state.selected

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        isSelected
          ? 'border-blue-500 shadow-lg shadow-blue-100'
          : isCompleted
          ? 'border-gray-200 hover:border-blue-300 cursor-pointer'
          : 'border-gray-200'
      }`}
      onClick={() => isCompleted && !isSelected && onSelect(variant)}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-gray-50">
        {isCompleted && state.imageUrl ? (
          <>
            <Image
              src={state.imageUrl}
              alt={VARIANT_LABELS[variant]}
              fill
              className="object-cover"
              unoptimized
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                onZoom(variant)
              }}
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

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
            Seleccionada
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-medium text-sm text-gray-900">{VARIANT_LABELS[variant]}</p>
          <p className="text-xs text-gray-500 mt-0.5">{VARIANT_DESCRIPTIONS[variant]}</p>
        </div>

        {(isLoading || isFailed) && (
          <GenerationProgressBar
            status={state.status}
            progress={state.progress}
            error={state.error}
          />
        )}

        {isFailed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetry(variant)
            }}
            className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Reintentar
          </button>
        )}

        {isCompleted && !isSelected && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(variant)
              }}
              className="flex-1 rounded-lg bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Seleccionar
            </button>
            {state.imageUrl && <DownloadButton url={state.imageUrl} label={VARIANT_LABELS[variant]} />}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry(variant)
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              title="Regenerar solo esta variante"
            >
              ↺
            </button>
          </div>
        )}

        {isSelected && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(variant)
              }}
              className="flex-1 rounded-lg bg-blue-500 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
              title="Toca para deseleccionar"
            >
              Variante seleccionada ✓
            </button>
            {state.imageUrl && <DownloadButton url={state.imageUrl} label={VARIANT_LABELS[variant]} />}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry(variant)
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              title="Regenerar solo esta variante"
            >
              ↺
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
