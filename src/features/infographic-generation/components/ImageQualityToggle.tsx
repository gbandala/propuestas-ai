'use client'

import { useState, useTransition } from 'react'
import { updateImageQuality } from '@/actions/projects'
import type { ImageQuality } from '@/types/database'

interface ImageQualityToggleProps {
  projectId: string
  currentQuality: ImageQuality
  disabled?: boolean
}

const QUALITY_LABELS: Record<ImageQuality, string> = {
  flash: 'Gemini Flash · rápido',
  pro:   'Gemini Pro · alta calidad',
  flux:  'Flux Pro · ultra detalle',
}

export function ImageQualityToggle({ projectId, currentQuality, disabled }: ImageQualityToggleProps) {
  const [quality, setQuality] = useState<ImageQuality>(currentQuality)
  const [isPending, startTransition] = useTransition()

  function handleToggle(next: ImageQuality) {
    if (next === quality || disabled || isPending) return
    setQuality(next)
    startTransition(async () => {
      await updateImageQuality(projectId, next)
    })
  }

  const isDisabled = disabled || isPending

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1">
        <button
          onClick={() => handleToggle('flash')}
          disabled={isDisabled}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            quality === 'flash'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          ⚡ Flash
        </button>
        <button
          onClick={() => handleToggle('pro')}
          disabled={isDisabled}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            quality === 'pro'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          ✦ Pro
        </button>
        <button
          onClick={() => handleToggle('flux')}
          disabled={isDisabled}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            quality === 'flux'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          ✺ Flux
        </button>
      </div>
      <p className="text-xs text-gray-400">{QUALITY_LABELS[quality]}</p>
    </div>
  )
}
