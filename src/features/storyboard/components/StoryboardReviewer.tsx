'use client'

import { useState } from 'react'
import { updateStoryboardContent, reopenStoryboard } from '@/actions/storyboard'
import type { StoryboardData, StoryboardType } from '../types'

interface StoryboardReviewerProps {
  projectId: string
  type: StoryboardType
  storyboard: StoryboardData | null
  onGenerate: (comments?: string) => Promise<void>
  onApprove: () => Promise<void>
}

interface ParsedSection {
  title: string
  content: string
  index: number
}

/** Parsea el markdown en secciones por encabezados ### */
function parseSections(markdown: string): ParsedSection[] {
  const lines = markdown.split('\n')
  const sections: ParsedSection[] = []
  const currentSection = { title: '', lines: [] as string[], active: false }
  let index = 0

  function flushCurrent() {
    if (currentSection.active) {
      sections.push({
        title: currentSection.title,
        content: currentSection.lines.join('\n').trim(),
        index: index++,
      })
    }
  }

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushCurrent()
      currentSection.title = line.replace('### ', '').trim()
      currentSection.lines = []
      currentSection.active = true
    } else if (line.startsWith('## ') && !currentSection.active) {
      flushCurrent()
      currentSection.title = line.replace('## ', '').trim()
      currentSection.lines = []
      currentSection.active = true
    } else if (currentSection.active) {
      currentSection.lines.push(line)
    } else if (line.trim()) {
      currentSection.title = 'Encabezado'
      currentSection.lines = [line]
      currentSection.active = true
    }
  }

  flushCurrent()
  return sections
}

/** Reconstruye el markdown completo con una sección editada */
function rebuildMarkdown(sections: ParsedSection[]): string {
  return sections
    .map((s) => `### ${s.title}\n${s.content}`)
    .join('\n\n')
}

export function StoryboardReviewer({
  type,
  storyboard,
  onGenerate,
  onApprove,
}: StoryboardReviewerProps) {
  const [comments, setComments] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const [sections, setSections] = useState<ParsedSection[]>(() =>
    storyboard?.content_md ? parseSections(storyboard.content_md) : []
  )

  const isApproved = !!storyboard?.approved_at
  const hasStoryboard = !!storyboard?.content_md
  const typeLabel = 'de la Propuesta'

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    setShowFeedback(false)
    setEditingIndex(null)
    try {
      await onGenerate(comments || undefined)
      setComments('')
      // Las secciones se actualizan cuando la página hace revalidatePath y re-renderiza
    } catch {
      setError('Error al generar el storyboard. Intenta de nuevo.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleApprove() {
    setIsApproving(true)
    setError(null)
    try {
      await onApprove()
    } catch {
      setError('Error al aprobar el storyboard.')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReopen() {
    if (!storyboard?.id) return
    setIsReopening(true)
    setError(null)
    const result = await reopenStoryboard(storyboard.id)
    if ('error' in result) {
      setError('Error al reabrir el storyboard: ' + result.error)
    }
    // La página se revalida via revalidatePath en el page.tsx al hacer approve/generate
    // Para reabrir sin reload forzamos actualización de estado local
    window.location.reload()
  }

  function startEdit(section: ParsedSection) {
    setEditingIndex(section.index)
    setEditContent(section.content)
  }

  async function saveEdit(index: number) {
    if (!storyboard?.id) return
    setIsSaving(true)
    setError(null)

    const updated = sections.map((s) =>
      s.index === index ? { ...s, content: editContent } : s
    )
    const newMarkdown = rebuildMarkdown(updated)

    const result = await updateStoryboardContent(storyboard.id, newMarkdown)
    if ('error' in result) {
      setError('Error al guardar el cambio: ' + result.error)
      setIsSaving(false)
      return
    }

    setSections(updated)
    setEditingIndex(null)
    setIsSaving(false)
  }

  // Si el storyboard se regenera (revalidatePath), resincronizar secciones
  // (esto ocurre al montar de nuevo, así que el estado inicial se toma del prop)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Storyboard {typeLabel}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Revisa cada slide, edita lo que no te guste y aprueba cuando estés conforme.
          </p>
        </div>
        {storyboard && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">v{storyboard.version}</span>
            {isApproved ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Aprobado
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                Pendiente de aprobacion
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Sin storyboard */}
      {!hasStoryboard && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">Sin storyboard aun</h3>
          <p className="mt-1 text-sm text-gray-500">
            Genera el borrador textual de los 7 slides de la propuesta.
            La IA usará el brief y la identidad de marca del proyecto.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generando storyboard...' : `Generar Storyboard ${typeLabel}`}
          </button>
        </div>
      )}

      {/* Slides individuales */}
      {hasStoryboard && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.index}
              className={`rounded-xl border bg-white transition-shadow ${
                editingIndex === section.index
                  ? 'border-blue-300 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Título del slide */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800">{section.title}</p>
                {!isApproved && editingIndex !== section.index && (
                  <button
                    onClick={() => startEdit(section)}
                    className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                )}
                {editingIndex === section.index && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => saveEdit(section.index)}
                      disabled={isSaving}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="px-4 py-3">
                {editingIndex === section.index ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full rounded-lg border border-gray-200 p-3 font-mono text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-600 leading-relaxed max-h-48 overflow-y-auto">
                    {section.content || <span className="text-gray-400 italic">Sin contenido</span>}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acciones (solo si hay storyboard y no está aprobado) */}
      {hasStoryboard && !isApproved && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-sm font-semibold text-gray-800">Acciones</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleApprove}
              disabled={isApproving || editingIndex !== null}
              className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 text-left"
            >
              <div className="font-semibold">Aprobar storyboard</div>
              <div className="mt-0.5 text-xs text-green-600">Proceder a generar las imagenes con IA</div>
            </button>

            <button
              onClick={() => setShowFeedback(!showFeedback)}
              disabled={editingIndex !== null}
              className="rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 text-left"
            >
              <div className="font-semibold">Regenerar con IA</div>
              <div className="mt-0.5 text-xs text-orange-600">Describe cambios y la IA genera una nueva version</div>
            </button>
          </div>

          {showFeedback && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Describe los cambios que necesitas:
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Ej: El slide 5 necesita incluir el stack tecnologico. La infografia 2 debe mostrar un timeline."
                rows={4}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !comments.trim()}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {isGenerating ? 'Generando nueva version...' : 'Generar version actualizada'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aprobado */}
      {isApproved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-700">
                  Storyboard aprobado.
                </p>
              </div>
              <p className="mt-1 text-xs text-green-600">
                Aprobado el {new Date(storyboard!.approved_at!).toLocaleDateString('es-MX', { dateStyle: 'long' })}
              </p>
            </div>
            <button
              onClick={handleReopen}
              disabled={isReopening}
              className="shrink-0 rounded-md border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              {isReopening ? 'Reabriendo...' : 'Reabrir para editar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
