'use client'

import { useState, useRef } from 'react'
import { BRAND_IDENTITY_TEMPLATE } from '../types'
import type { BrandIdentityData } from '../types'

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
