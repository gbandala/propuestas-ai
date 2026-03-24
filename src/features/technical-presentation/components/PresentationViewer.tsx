'use client'

import { useState, useTransition } from 'react'
import { generatePresentation } from '@/actions/presentations'

interface PresentationViewerProps {
  projectId: string
  htmlContent: string | null
}

export function PresentationViewer({ projectId, htmlContent: initialHtml }: PresentationViewerProps) {
  const [html, setHtml] = useState(initialHtml)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showRefine, setShowRefine] = useState(false)
  const [refinementText, setRefinementText] = useState('')

  function handleGenerate(refinementInstructions?: string) {
    setError(null)
    startTransition(async () => {
      const result = await generatePresentation(projectId, refinementInstructions)
      if ('error' in result) {
        setError(result.error)
        return
      }
      // Recargar el html desde el servidor
      window.location.reload()
    })
  }

  function handleRefine() {
    if (!refinementText.trim()) return
    handleGenerate(refinementText.trim())
    setShowRefine(false)
    setRefinementText('')
  }

  function openFullscreen() {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  if (!html) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">Sin presentación generada</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            La IA generará una presentación HTML de 10 slides a partir del storyboard técnico aprobado y la identidad de marca del proyecto.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Puede tardar 15–30 segundos dependiendo del modelo de IA.
          </p>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            onClick={() => handleGenerate()}
            disabled={isPending}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isPending ? 'Generando presentación...' : 'Generar Presentación Técnica'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Presentación Técnica</h2>
          <p className="text-sm text-gray-500">10 slides generados con IA a partir del storyboard aprobado.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openFullscreen}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver en pantalla completa ↗
          </button>
          <button
            onClick={() => setShowRefine(!showRefine)}
            disabled={isPending}
            className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            Refinar ✎
          </button>
          <button
            onClick={() => handleGenerate()}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            )}
            {isPending ? 'Regenerando...' : 'Regenerar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Preview en iframe */}
      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <iframe
          srcDoc={html}
          className="w-full"
          style={{ height: '600px', border: 'none' }}
          title="Presentación Técnica"
          sandbox="allow-scripts"
        />
      </div>

      <p className="text-xs text-gray-400 text-center">
        Preview interactivo — usa las flechas del teclado o los botones para navegar. Para mejor experiencia usa "Ver en pantalla completa".
      </p>

      {/* Sección Refinar */}
      {showRefine && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-orange-800">Refinar presentación</h3>
          <p className="text-xs text-orange-700">
            Describe los ajustes que necesitas. Por ejemplo: &ldquo;El slide 3 necesita más detalle sobre la arquitectura&rdquo; o &ldquo;Agrega un slide de preguntas frecuentes al final&rdquo;.
          </p>
          <textarea
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            placeholder="Ej: El slide 5 debe mostrar el stack tecnológico con logos. El slide 8 necesita una tabla de entregables más detallada."
            rows={4}
            className="w-full rounded-lg border border-orange-200 bg-white p-3 text-sm text-gray-800 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRefine}
              disabled={isPending || !refinementText.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isPending ? 'Refinando...' : 'Refinar con instrucciones'}
            </button>
            <button
              onClick={() => { setShowRefine(false); setRefinementText('') }}
              className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
