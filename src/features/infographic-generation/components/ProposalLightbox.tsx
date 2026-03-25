'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import type { ProposalSlideState } from '../store/proposal.store'

interface ProposalLightboxProps {
  openSlideIndex: number
  slides: Record<number, ProposalSlideState>
  slideOrder: number[]
  onClose: () => void
  onNavigate: (slideIndex: number) => void
}

export function ProposalLightbox({
  openSlideIndex,
  slides,
  slideOrder,
  onClose,
  onNavigate,
}: ProposalLightboxProps) {
  const available = slideOrder.filter(
    (idx) => slides[idx]?.status === 'completed' && slides[idx]?.imageUrl
  )
  const currentIndex = available.indexOf(openSlideIndex)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < available.length - 1
  const state = slides[openSlideIndex]

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(available[currentIndex - 1])
      if (e.key === 'ArrowRight' && hasNext) onNavigate(available[currentIndex + 1])
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openSlideIndex, hasPrev, hasNext, available, currentIndex, onClose, onNavigate])

  if (!state?.imageUrl) return null

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
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {openSlideIndex}
            </span>
            <p className="font-semibold text-gray-900">{state.slideTitle}</p>
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
          <div className="relative min-h-[400px] w-full">
            <Image
              src={state.imageUrl}
              alt={state.slideTitle}
              width={1280}
              height={960}
              className="h-auto w-full object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Footer — navigation only */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
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
          <p className="text-xs text-gray-400">Slide {openSlideIndex} incluida en el PPT</p>
        </div>
      </div>
    </div>
  )
}
