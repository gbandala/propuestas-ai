'use client'

import { useState, useRef } from 'react'
import { uploadBrandImage, removeBrandImage } from '@/actions/brand-identity'

interface BrandImagesTabProps {
  projectId: string
  initialLogoUrl: string | null
  initialBgUrl: string | null
}

// Expected dimensions for each image type
const EXPECTED = {
  logo: { minWidth: 100, label: '350×90px recomendado · ratio horizontal' },
  background: { width: 1280, height: 960, ratio: 1280 / 960, label: '1280×960px (4:3) recomendado · también acepta 16:9' },
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

function validateDimensions(
  imageType: 'logo' | 'background',
  width: number,
  height: number
): string | null {
  if (imageType === 'logo') {
    if (width < EXPECTED.logo.minWidth) {
      return `El logo es muy pequeño (${width}px de ancho). Recomendamos al menos 100px de ancho.`
    }
    if (height > width) {
      return `El logo es más alto que ancho (${width}×${height}px). Los logos suelen ser horizontales — verifica que subiste la imagen correcta.`
    }
    return null
  }

  // Background: warn only if it's portrait or very unusual (square). Both 4:3 and 16:9 landscape work.
  const ratio = width / height
  if (ratio < 1.0) {
    return `El fondo es vertical (${width}×${height}px). Los slides son horizontales — sube una imagen landscape (ancho > alto).`
  }
  if (ratio < 1.2) {
    return `El fondo está cerca del formato cuadrado (${width}×${height}px). Recomendamos 16:9 o 4:3 (landscape).`
  }
  return null
}

function ImageUploader({
  projectId,
  imageType,
  currentUrl,
  label,
  acceptedFormats,
  maxSizeMb,
}: {
  projectId: string
  imageType: 'logo' | 'background'
  currentUrl: string | null
  label: string
  acceptedFormats: string
  maxSizeMb: number
}) {
  const [url, setUrl] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [transparentBg, setTransparentBg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setError(null)
    setWarning(null)

    // Validate dimensions before uploading (skip SVG — no raster dimensions)
    if (!file.name.toLowerCase().endsWith('.svg')) {
      try {
        const { width, height } = await getImageDimensions(file)
        const warn = validateDimensions(imageType, width, height)
        if (warn) setWarning(warn)
      } catch {
        // Ignore dimension read errors — still allow upload
      }
    }

    setUploading(true)
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
    setWarning(null)
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

  const expectedLabel = EXPECTED[imageType].label

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{expectedLabel}</p>
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

      {/* Dimension warning */}
      {warning && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Aviso de proporciones: </span>
            {warning}
          </p>
        </div>
      )}

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
          onChange={handleFileChange}
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
          acceptedFormats="PNG, SVG, JPG, WEBP"
          maxSizeMb={2}
        />
        <ImageUploader
          projectId={projectId}
          imageType="background"
          currentUrl={initialBgUrl}
          label="Fondo de slides"
          acceptedFormats="PNG, JPG, WEBP"
          maxSizeMb={5}
        />
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-1">
        <p className="text-xs text-blue-800 font-medium">Cómo funciona el logo en los slides</p>
        <p className="text-xs text-blue-700">
          Si subes un <strong>logo por separado</strong>, se composita automáticamente en la esquina inferior-derecha de cada slide generado — sin importar el fondo.
        </p>
        <p className="text-xs text-blue-600">
          Si solo usas el fondo con el logo ya incluido, el AI intentará replicarlo pero no está garantizado. Subir el logo por separado es la forma confiable.
        </p>
      </div>
    </div>
  )
}
