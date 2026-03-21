'use client'

import { useState } from 'react'
import type { StoryboardData, StoryboardType } from '../types'

interface StoryboardReviewerProps {
  projectId: string
  type: StoryboardType
  storyboard: StoryboardData | null
  onGenerate: (comments?: string) => Promise<void>
  onApprove: () => Promise<void>
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

  const isApproved = !!storyboard?.approved_at
  const hasStoryboard = !!storyboard?.content_md

  const typeLabel = type === 'technical' ? 'Técnico' : 'Comercial'

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    setShowFeedback(false)
    try {
      await onGenerate(comments || undefined)
      setComments('')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Storyboard {typeLabel}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Borrador textual de las infografias y slides. Revisalo, pide cambios y apruebalo antes de generar las imagenes.
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

      {/* Sin storyboard aun */}
      {!hasStoryboard && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900">Sin storyboard aun</h3>
          <p className="mt-1 text-sm text-gray-500">
            Genera el borrador textual de las {type === 'technical' ? '3 infografias + 10 slides tecnicos' : '4 infografias + 10 slides comerciales'}.
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

      {/* Storyboard existente */}
      {hasStoryboard && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Contenido del Storyboard — Version {storyboard.version}
              </p>
            </div>
            <div className="h-[480px] overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">
                {storyboard.content_md}
              </pre>
            </div>
          </div>

          {!isApproved && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-sm font-semibold text-gray-800">¿Que quieres hacer?</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Aprobar */}
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 text-left"
                >
                  <div className="font-semibold">Aprobar storyboard</div>
                  <div className="mt-0.5 text-xs text-green-600">Proceder a generar las imagenes con IA</div>
                </button>

                {/* Pedir cambios */}
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100 text-left"
                >
                  <div className="font-semibold">Pedir cambios</div>
                  <div className="mt-0.5 text-xs text-orange-600">Describir ajustes y generar nueva version</div>
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
                    placeholder="Ej: La infografia 2 deberia mostrar un timeline en lugar de la arquitectura. El slide 5 necesita incluir el logo del cliente mas grande."
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

          {isApproved && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-700">
                  Storyboard aprobado. Ya puedes generar las infografias.
                </p>
              </div>
              <p className="mt-2 text-xs text-green-600">
                Aprobado el {new Date(storyboard.approved_at!).toLocaleDateString('es-MX', { dateStyle: 'long' })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
