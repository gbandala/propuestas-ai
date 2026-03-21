'use client'

import type { VariantStatus } from '../types'

interface GenerationProgressBarProps {
  status: VariantStatus
  progress: number
  error: string | null
}

const STATUS_LABELS: Record<VariantStatus, string> = {
  idle: 'En espera',
  pending: 'Iniciando...',
  running: 'Generando...',
  completed: 'Completado',
  failed: 'Error',
}

export function GenerationProgressBar({ status, progress, error }: GenerationProgressBarProps) {
  if (status === 'idle') return null

  const isError = status === 'failed'
  const isComplete = status === 'completed'

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{STATUS_LABELS[status]}</span>
        {!isError && <span>{progress}%</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isError
              ? 'bg-red-500'
              : isComplete
              ? 'bg-green-500'
              : 'bg-blue-500 animate-pulse'
          }`}
          style={{ width: `${isError ? 100 : progress}%` }}
        />
      </div>
      {isError && error && (
        <p className="text-xs text-red-500 truncate">{error}</p>
      )}
    </div>
  )
}
