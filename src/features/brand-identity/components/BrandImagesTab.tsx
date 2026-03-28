'use client'

import { useState } from 'react'
import { BrandImageGenerator } from './BrandImageGenerator'
import type { BrandVariant } from '@/actions/brand-identity'

interface BrandImagesTabProps {
  projectId: string
  initialLogoUrl: string | null
  initialBgUrl: string | null
  initialLogoVariants: BrandVariant[]
  initialBgVariants: BrandVariant[]
  suggestedLogoPrompt: string
  suggestedBgPrompt: string
}

export function BrandImagesTab({
  projectId,
  initialLogoUrl,
  initialBgUrl,
  initialLogoVariants,
  initialBgVariants,
  suggestedLogoPrompt,
  suggestedBgPrompt,
}: BrandImagesTabProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [bgUrl, setBgUrl] = useState(initialBgUrl)

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Logo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <BrandImageGenerator
            projectId={projectId}
            imageType="logo"
            currentUrl={logoUrl}
            initialVariants={initialLogoVariants}
            suggestedPrompt={suggestedLogoPrompt}
            onCurrentUrlChange={setLogoUrl}
          />
        </div>

        {/* Background */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <BrandImageGenerator
            projectId={projectId}
            imageType="background"
            currentUrl={bgUrl}
            initialVariants={initialBgVariants}
            suggestedPrompt={suggestedBgPrompt}
            onCurrentUrlChange={setBgUrl}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Logo y fondo son opcionales. Puedes usar uno, ambos, o ninguno. Si los configuras, se incluirán automáticamente en las infografías generadas.
      </p>
    </div>
  )
}
