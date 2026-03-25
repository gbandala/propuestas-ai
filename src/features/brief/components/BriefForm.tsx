'use client'

import { useState, useTransition } from 'react'
import { saveBrief } from '@/actions/brief'

const BRIEF_TEMPLATE = `## Problema / Dolores Específicos
(Describe la situación actual, qué no funciona, cuánto tiempo/dinero se pierde y por qué es urgente resolverlo)


## Objetivo / ROI
(Qué se quiere lograr, cuál es el beneficio esperado medible — tiempo ahorrado, costo reducido, ingresos generados)


## Insumos
(Qué datos, sistemas, archivos o APIs existen hoy que alimentarán la solución)


## Producto Esperado
(Cómo debe verse y funcionar el entregable final — reporte, dashboard, API, automatización, etc.)


## Qué Hace / Solución Técnica
(Descripción técnica de la solución: procesos, transformaciones, integraciones, stack propuesto)


## Entregables
(Lista de documentos, sistemas o artefactos que se entregarán al cliente con su criterio de aceptación)


## Roadmap de Ejecución
(Tareas, tiempos e hitos. Formato libre: tabla, lista o descripción)


## Modelo de Inversión
(Momentos de pago, montos y condiciones. Ej: arranque / demo / producción / mantenimiento)
`

interface BriefFormProps {
  projectId: string
  initialContent: string | null
  briefCompleted: boolean
}

export function BriefForm({ projectId, initialContent, briefCompleted }: BriefFormProps) {
  const [content, setContent] = useState(initialContent ?? BRIEF_TEMPLATE)
  const [saved, setSaved] = useState(briefCompleted)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await saveBrief(projectId, content)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Guía de secciones */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Secciones del brief
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {[
            'Problema / Dolores',
            'Objetivo / ROI',
            'Insumos',
            'Producto esperado',
            'Solución técnica',
            'Entregables',
            'Roadmap',
            'Modelo de inversión',
          ].map((s) => (
            <span key={s} className="text-xs text-blue-700">
              · {s}
            </span>
          ))}
        </div>
      </div>

      {/* Textarea principal */}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setSaved(false)
        }}
        rows={60}
        className="w-full rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        placeholder="Escribe aquí el brief del proyecto..."
        spellCheck={false}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Brief guardado
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending || !content.trim()}
            className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : 'Guardar Brief'}
          </button>

          {saved && (
            <a
              href={`/projects/${projectId}/storyboard?type=infographic`}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Continuar al Storyboard →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
