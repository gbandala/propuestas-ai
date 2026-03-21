'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_COLORS } from '@/shared/constants/brand'
import type { Step8Data } from '../../types'

interface Step8Props {
  projectId: string
  initialData?: Step8Data
  onNext: (data: Step8Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

export function Step8Brand({ projectId, initialData, onNext, onBack, isSaving }: Step8Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData?.logoUrl ?? null)
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor ?? DEFAULT_COLORS.primary)
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondaryColor ?? DEFAULT_COLORS.secondary)
  const [accentColor, setAccentColor] = useState(initialData?.accentColor ?? DEFAULT_COLORS.accent)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo debe ser menor a 5MB')
      return
    }
    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      setUploadError('Solo se permiten archivos PNG o SVG')
      return
    }

    setUploading(true)
    setUploadError(null)
    const supabase = createClient()
    const path = `projects/${projectId}/logo/${file.name}`

    const { error } = await supabase.storage
      .from('project-assets')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploadError(error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('project-assets')
      .getPublicUrl(path)

    setLogoUrl(publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext({ logoUrl, primaryColor, secondaryColor, accentColor })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Identidad de Marca</h2>
        <p className="mt-1 text-sm text-gray-500">
          Sube el logo y elige los colores de tu consultora. Se usarán en todas las infografías.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Logo de la Consultora</label>
        <p className="text-xs text-gray-400 mb-2">PNG o SVG, máximo 5MB</p>
        <input
          type="file"
          accept=".png,.svg,image/png,image/svg+xml"
          onChange={handleLogoUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploading && <p className="mt-1 text-sm text-blue-600">Subiendo logo...</p>}
        {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
        {logoUrl && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo preview" className="h-16 object-contain" />
            <p className="mt-1 text-xs text-green-600">✓ Logo subido correctamente</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Color Primario</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Color Secundario</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Color Acento</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Preview de colores:</p>
        <div className="flex gap-2">
          <div className="flex-1 rounded p-3 text-white text-xs text-center font-medium" style={{ backgroundColor: primaryColor }}>
            Primario
          </div>
          <div className="flex-1 rounded p-3 text-white text-xs text-center font-medium" style={{ backgroundColor: secondaryColor }}>
            Secundario
          </div>
          <div className="flex-1 rounded p-3 text-white text-xs text-center font-medium" style={{ backgroundColor: accentColor }}>
            Acento
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:underline">← Anterior</button>
        <button
          type="submit"
          disabled={isSaving || uploading}
          className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Completar y generar brief →'}
        </button>
      </div>
    </form>
  )
}
