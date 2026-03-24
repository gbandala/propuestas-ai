'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { VARIANT_LABELS, VARIANT_DESCRIPTIONS } from '../types'
import type { TechnicalVariant, VariantState } from '../types'

interface InfographicLightboxProps {
  openVariant: TechnicalVariant
  variants: Record<TechnicalVariant, VariantState>
  onClose: () => void
  onNavigate: (variant: TechnicalVariant) => void
  onSelect: (variant: TechnicalVariant) => void
}

export function InfographicLightbox({
  openVariant,
  variants,
  onClose,
  onNavigate,
  onSelect,
}: InfographicLightboxProps) {
  const available = ([1, 2, 3] as TechnicalVariant[]).filter(
    (v) => variants[v].status === 'completed' && variants[v].imageUrl
  )
  const currentIndex = available.indexOf(openVariant)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < available.length - 1
  const state = variants[openVariant]
  const isSelected = state.selected

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(available[currentIndex - 1])
      if (e.key === 'ArrowRight' && hasNext) onNavigate(available[currentIndex + 1])
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openVariant, hasPrev, hasNext, available, currentIndex, onClose, onNavigate])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex max-h-[90vh] max-w-5xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <p className="font-semibold text-gray-900">{VARIANT_LABELS[openVariant]}</p>
            <p className="text-xs text-gray-500">{VARIANT_DESCRIPTIONS[openVariant]}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {currentIndex + 1} / {available.length}
            </span>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative flex-1 overflow-auto bg-gray-50">
          {state.imageUrl && (
            <div className="relative min-h-[400px] w-full">
              <Image
                src={state.imageUrl}
                alt={VARIANT_LABELS[openVariant]}
                width={1200}
                height={900}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => hasPrev && onNavigate(available[currentIndex - 1])}
              disabled={!hasPrev}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ← Anterior
            </button>
            <button
              onClick={() => hasNext && onNavigate(available[currentIndex + 1])}
              disabled={!hasNext}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>

          {/* Select */}
          {isSelected ? (
            <div className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white">
              Variante seleccionada
            </div>
          ) : (
            <button
              onClick={() => onSelect(openVariant)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Seleccionar esta variante
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
