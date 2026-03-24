'use client'

import { useInfographicStore } from '../store/infographic.store'
import { InfographicVariantCard } from './InfographicVariantCard'
import type { TechnicalVariant } from '../types'

interface InfographicVariantGridProps {
  onSelect: (variant: TechnicalVariant) => void
  onRetry: (variant: TechnicalVariant) => void
  onZoom: (variant: TechnicalVariant) => void
}

export function InfographicVariantGrid({ onSelect, onRetry, onZoom }: InfographicVariantGridProps) {
  const { variants } = useInfographicStore()

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {([1, 2, 3] as TechnicalVariant[]).map((variant) => (
        <InfographicVariantCard
          key={variant}
          variant={variant}
          state={variants[variant]}
          onSelect={onSelect}
          onRetry={onRetry}
          onZoom={onZoom}
        />
      ))}
    </div>
  )
}
