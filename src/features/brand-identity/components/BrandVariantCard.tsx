'use client'

import { useState } from 'react'

interface BrandVariantCardProps {
  variantIndex: 1 | 2 | 3
  imageUrl: string | null
  status: 'idle' | 'queued' | 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  error: string | null
  isSelected: boolean
  imageType: 'logo' | 'background'
  onSelect: (url: string) => void
  onRetry: (variantIndex: 1 | 2 | 3, comment: string) => void
}

export function BrandVariantCard({
  variantIndex, imageUrl, status, progress, error, isSelected, imageType, onSelect, onRetry,
}: BrandVariantCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [retryModalOpen, setRetryModalOpen] = useState(false)
  const [comment, setComment] = useState('')
  const isQueued = status === 'queued'
  const isActive = status === 'pending' || status === 'running'
  const isFailed = status === 'failed'
  const isComplete = status === 'completed' && !!imageUrl

  return (
    <>
      <div className={`relative rounded-xl border-2 overflow-hidden transition-all ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
      }`}>
        {/* Label */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-600">Versión {variantIndex}</span>
          {isSelected && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Seleccionada</span>
          )}
        </div>

        {/* Image area */}
        <div className={`relative flex items-center justify-center bg-gray-100 ${
          imageType === 'logo' ? 'h-28' : 'h-36'
        }`}
          style={{ background: imageType === 'logo' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 0 0 / 12px 12px' : '#e5e7eb' }}
        >
          {isQueued && (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-2xl">⏳</span>
              <p className="text-xs">En espera...</p>
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-2" />
              <div className="w-32 bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{progress}%</p>
            </div>
          )}
          {isFailed && !imageUrl && (
            <div className="flex flex-col items-center gap-1 text-center px-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-xs text-red-600">{error ?? 'Error al generar'}</p>
            </div>
          )}
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`Variante ${variantIndex}`}
              className="max-h-full max-w-full object-contain p-2"
            />
          )}
          {!isQueued && !isActive && !imageUrl && !isFailed && (
            <p className="text-xs text-gray-400">Pendiente</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 p-2 bg-white">
          {isComplete && (
            <>
              <button
                onClick={() => setLightboxOpen(true)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                title="Ver en grande"
              >
                🔍
              </button>
              <button
                onClick={() => onSelect(imageUrl!)}
                disabled={isSelected}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-100 text-blue-600 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSelected ? '✓ Elegida' : 'Elegir esta'}
              </button>
              <a
                href={imageUrl!}
                download={`${imageType}-v${variantIndex}.png`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 flex items-center"
                title="Descargar"
              >
                ↓
              </a>
              <button
                onClick={() => setRetryModalOpen(true)}
                className="rounded-md border border-amber-200 px-2 py-1.5 text-xs text-amber-600 hover:bg-amber-50"
                title="Ajustar con comentario y regenerar"
              >
                ✏️
              </button>
            </>
          )}
          {isFailed && (
            <button
              onClick={() => setRetryModalOpen(true)}
              className="flex-1 rounded-md border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              ↻ Reintentar
            </button>
          )}
          {!isActive && !isComplete && !isFailed && (
            <div className="flex-1 h-8" />
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white text-sm hover:text-gray-300"
            >
              ✕ Cerrar
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Versión ${variantIndex}`}
              className="w-full rounded-lg"
              style={{ background: 'repeating-conic-gradient(#374151 0% 25%, #4b5563 0% 50%) 0 0 / 16px 16px' }}
            />
            <div className="mt-3 flex justify-center gap-3">
              <a
                href={imageUrl}
                download={`${imageType}-v${variantIndex}.png`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                ↓ Descargar
              </a>
              <button
                onClick={() => { onSelect(imageUrl!); setLightboxOpen(false) }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Elegir esta versión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retry/Adjust modal */}
      {retryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Ajustar versión {variantIndex}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Describe qué cambiar. Se regenerará solo esta versión.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej: Más minimalista, quitar el ícono, usar solo texto..."
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 h-24"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={() => { setRetryModalOpen(false); setComment('') }}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onRetry(variantIndex, comment)
                  setRetryModalOpen(false)
                  setComment('')
                }}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Regenerar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
