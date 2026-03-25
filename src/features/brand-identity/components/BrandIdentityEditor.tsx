'use client'

import { useState, useRef, useTransition } from 'react'
import { BRAND_IDENTITY_TEMPLATE } from '../types'
import type { BrandIdentityData } from '../types'
import { uploadBrandImage, removeBrandImage } from '@/actions/brand-identity'

interface BrandIdentityEditorProps {
  projectId: string
  initial: BrandIdentityData | null
  onSave: (markdown: string) => Promise<void>
}

export function BrandIdentityEditor({ projectId, initial, onSave }: BrandIdentityEditorProps) {
  const [markdown, setMarkdown] = useState(initial?.markdown_content ?? BRAND_IDENTITY_TEMPLATE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Imagen state
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logo_url ?? null)
  const [bgUrl, setBgUrl] = useState<string | null>(initial?.background_url ?? null)
  const [logoUploading, startLogoTransition] = useTransition()
  const [bgUploading, startBgTransition] = useTransition()
  const [logoError, setLogoError] = useState<string | null>(null)
  const [bgError, setBgError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(markdown)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (confirm('¿Reemplazar con la plantilla base? Se perderán los cambios no guardados.')) {
      setMarkdown(BRAND_IDENTITY_TEMPLATE)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      setError('Solo se aceptan archivos .md o .txt')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setMarkdown(ev.target?.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: 'logo' | 'background'
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const formData = new FormData()
    formData.append('file', file)

    if (imageType === 'logo') {
      setLogoError(null)
      startLogoTransition(async () => {
        const result = await uploadBrandImage(projectId, formData, 'logo')
        if ('error' in result) {
          setLogoError(result.error)
        } else {
          setLogoUrl(result.url)
        }
      })
    } else {
      setBgError(null)
      startBgTransition(async () => {
        const result = await uploadBrandImage(projectId, formData, 'background')
        if ('error' in result) {
          setBgError(result.error)
        } else {
          setBgUrl(result.url)
        }
      })
    }
  }

  function handleRemoveImage(imageType: 'logo' | 'background') {
    if (imageType === 'logo') {
      setLogoError(null)
      startLogoTransition(async () => {
        const result = await removeBrandImage(projectId, 'logo')
        if ('error' in result) {
          setLogoError(result.error)
        } else {
          setLogoUrl(null)
        }
      })
    } else {
      setBgError(null)
      startBgTransition(async () => {
        const result = await removeBrandImage(projectId, 'background')
        if ('error' in result) {
          setBgError(result.error)
        } else {
          setBgUrl(null)
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + botones markdown */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Identidad de Marca</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Define colores, tipografia y tono visual. Este documento se usa en todas las piezas generadas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Subir .md
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Plantilla base
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Editor Markdown + Preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Editor Markdown
          </label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="h-[500px] w-full rounded-lg border border-gray-200 bg-white p-4 font-mono text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Preview
          </label>
          <div className="h-[500px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
            <BrandIdentityPreview markdown={markdown} />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Tip: Edita directamente el Markdown o sube tu propio archivo .md. Si no tienes uno, la plantilla base es un buen punto de partida.
      </p>

      {/* Sección de imágenes */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="mb-1 text-base font-semibold text-gray-900">Imágenes de Marca</h3>
        <p className="mb-4 text-sm text-gray-500">
          Opcionales. Si las subes, se incluirán en la generación de las infografías.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Logo */}
          <ImageUploadCard
            label="Logo"
            hint="PNG, SVG, JPG — máx. 2MB"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            imageUrl={logoUrl}
            uploading={logoUploading}
            error={logoError}
            inputRef={logoInputRef}
            onUpload={(e) => handleImageUpload(e, 'logo')}
            onRemove={() => handleRemoveImage('logo')}
          />

          {/* Fondo */}
          <ImageUploadCard
            label="Fondo de infografías"
            hint="PNG, JPG — máx. 5MB"
            accept="image/png,image/jpeg,image/webp"
            imageUrl={bgUrl}
            uploading={bgUploading}
            error={bgError}
            inputRef={bgInputRef}
            onUpload={(e) => handleImageUpload(e, 'background')}
            onRemove={() => handleRemoveImage('background')}
          />
        </div>
      </div>
    </div>
  )
}

interface ImageUploadCardProps {
  label: string
  hint: string
  accept: string
  imageUrl: string | null
  uploading: boolean
  error: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}

function ImageUploadCard({
  label, hint, accept, imageUrl, uploading, error, inputRef, onUpload, onRemove,
}: ImageUploadCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
        {imageUrl && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Eliminar
          </button>
        )}
      </div>

      {imageUrl ? (
        <div className="mb-3 overflow-hidden rounded-md border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={label}
            className="max-h-24 w-full object-contain p-2"
          />
        </div>
      ) : (
        <div className="mb-3 flex h-24 items-center justify-center rounded-md border-2 border-dashed border-gray-200 bg-white">
          <p className="text-xs text-gray-400">Sin imagen</p>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onUpload}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Subiendo...' : imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
      </button>
    </div>
  )
}

function BrandIdentityPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')

  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-gray-900 mt-0">{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-1 border-b border-gray-100 pb-1">{line.slice(3)}</h2>
        if (line.startsWith('- ')) {
          const content = line.slice(2)
          const hexMatch = content.match(/#([0-9A-Fa-f]{6})/)
          return (
            <div key={i} className="flex items-center gap-2 py-0.5 text-sm text-gray-700">
              {hexMatch && (
                <span
                  className="inline-block h-4 w-4 rounded border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: hexMatch[0] }}
                />
              )}
              <span>{content}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i} className="text-sm text-gray-600 my-0.5">{line}</p>
      })}
    </div>
  )
}
