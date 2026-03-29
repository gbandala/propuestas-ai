'use client'

import { useState, useRef } from 'react'
import { uploadBrandImage, removeBrandImage } from '@/actions/brand-identity'

interface BrandImagesTabProps {
  projectId: string
  initialLogoUrl: string | null
  initialBgUrl: string | null
}

function ImageUploader({
  projectId,
  imageType,
  currentUrl,
  label,
  dimensions,
  acceptedFormats,
  maxSizeMb,
}: {
  projectId: string
  imageType: 'logo' | 'background'
  currentUrl: string | null
  label: string
  dimensions: string
  acceptedFormats: string
  maxSizeMb: number
}) {
  const [url, setUrl] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transparentBg, setTransparentBg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadBrandImage(projectId, formData, imageType, imageType === 'logo' ? transparentBg : undefined)
    setUploading(false)

    if ('error' in result) {
      setError(result.error)
    } else {
      setUrl(result.url)
    }
  }

  async function handleRemove() {
    if (!confirm(`¿Eliminar el ${label.toLowerCase()} actual?`)) return
    setRemoving(true)
    setError(null)
    const result = await removeBrandImage(projectId, imageType)
    setRemoving(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      setUrl(null)
    }
  }

  const bgStyle = imageType === 'logo'
    ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 0 0 / 12px 12px'
    : '#e5e7eb'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{dimensions}</p>
      </div>

      {/* Preview */}
      <div
        className={`flex items-center justify-center rounded-lg overflow-hidden ${imageType === 'logo' ? 'h-24' : 'h-40'}`}
        style={{ background: bgStyle }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="max-h-full max-w-full object-contain p-2"
          />
        ) : (
          <p className="text-xs text-gray-400">Sin imagen</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      {/* Transparent background option (logo only) */}
      {imageType === 'logo' && (
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={(e) => setTransparentBg(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600 leading-snug">
            <span className="font-medium">Fondo transparente</span>
            <span className="text-gray-400"> — elimina fondo gris o tablero al subir</span>
          </span>
        </label>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={imageType === 'logo' ? '.png,.svg,.jpg,.jpeg,.webp' : '.png,.jpg,.jpeg,.webp'}
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? 'Subiendo...' : url ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {url && (
          <button
            onClick={handleRemove}
            disabled={uploading || removing}
            className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {removing ? '...' : 'Eliminar'}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Formatos: {acceptedFormats} · Máx {maxSizeMb}MB
      </p>
    </div>
  )
}

export function BrandImagesTab({ projectId, initialLogoUrl, initialBgUrl }: BrandImagesTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ImageUploader
          projectId={projectId}
          imageType="logo"
          currentUrl={initialLogoUrl}
          label="Logo"
          dimensions="350×90px · PNG transparente recomendado"
          acceptedFormats="PNG, SVG, JPG, WEBP"
          maxSizeMb={2}
        />
        <ImageUploader
          projectId={projectId}
          imageType="background"
          currentUrl={initialBgUrl}
          label="Fondo de slides"
          dimensions="1376×768px · 16:9"
          acceptedFormats="PNG, JPG, WEBP"
          maxSizeMb={5}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Logo y fondo son opcionales. Si los configuras, se incluirán automáticamente en las infografías generadas.
      </p>
    </div>
  )
}
