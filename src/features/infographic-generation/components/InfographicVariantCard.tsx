'use client'

import Image from 'next/image'
import { VARIANT_LABELS, VARIANT_DESCRIPTIONS } from '../types'
import { GenerationProgressBar } from './GenerationProgressBar'
import type { TechnicalVariant, VariantState } from '../types'

interface InfographicVariantCardProps {
  variant: TechnicalVariant
  state: VariantState
  onSelect: (variant: TechnicalVariant) => void
  onRetry: (variant: TechnicalVariant) => void
}

export function InfographicVariantCard({
  variant,
  state,
  onSelect,
  onRetry,
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
          <Image
            src={state.imageUrl}
            alt={VARIANT_LABELS[variant]}
            fill
            className="object-cover"
            unoptimized
          />
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(variant)
            }}
            className="w-full rounded-lg bg-blue-50 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            Seleccionar esta variante
          </button>
        )}

        {isSelected && (
          <div className="w-full rounded-lg bg-blue-500 py-1.5 text-center text-xs font-medium text-white">
            Variante seleccionada
          </div>
        )}
      </div>
    </div>
  )
}
