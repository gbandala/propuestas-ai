'use client'

import { useState, useTransition } from 'react'
import { updateImageQuality } from '@/actions/projects'
import type { ImageQuality } from '@/types/database'

interface ImageQualityToggleProps {
  projectId: string
  currentQuality: ImageQuality
  geminiAvailable: boolean
  disabled?: boolean
}

export function ImageQualityToggle({ projectId, currentQuality, geminiAvailable, disabled }: ImageQualityToggleProps) {
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
  const proUnavailable = quality === 'pro' && !geminiAvailable

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
      </div>

      {proUnavailable ? (
        <p className="max-w-[220px] text-right text-xs text-amber-600">
          Pro requiere GEMINI_API_KEY. Usando Flash vía OpenRouter.
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          {quality === 'flash' ? 'Rápido · gemini-2.5-flash' : 'Alta calidad · gemini-2.5-pro'}
        </p>
      )}
    </div>
  )
}
