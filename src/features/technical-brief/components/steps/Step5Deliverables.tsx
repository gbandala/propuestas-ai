'use client'

import { useState } from 'react'
import type { Step5Data, Deliverable } from '../../types'

interface Step5Props {
  initialData?: Step5Data
  onNext: (data: Step5Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const emptyDeliverable = (): Deliverable => ({ name: '', format: '', acceptanceCriteria: '' })

export function Step5Deliverables({ initialData, onNext, onBack, isSaving }: Step5Props) {
  const [data, setData] = useState<Step5Data>({
    deliverables: initialData?.deliverables?.length
      ? initialData.deliverables
      : [emptyDeliverable()],
    finalAcceptanceCriteria: initialData?.finalAcceptanceCriteria ?? '',
  })

  function updateDeliverable(index: number, field: keyof Deliverable, value: string) {
    const updated = data.deliverables.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    )
    setData({ ...data, deliverables: updated })
  }

  function addDeliverable() {
    setData({ ...data, deliverables: [...data.deliverables, emptyDeliverable()] })
  }

  function removeDeliverable(index: number) {
    if (data.deliverables.length === 1) return
    setData({ ...data, deliverables: data.deliverables.filter((_, i) => i !== index) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Entregables de la Solucion</h2>
        <p className="mt-1 text-sm text-gray-500">
          Lista exacta de lo que se entrega al cerrar el proyecto. Cada entregable con su formato y
          criterio de aceptacion. Esto es lo que el cliente firma al cierre.
        </p>
      </div>

      <div className="space-y-3">
        <div className="hidden grid-cols-[2fr_1.5fr_2fr_auto] gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid">
          <span>Entregable</span>
          <span>Formato</span>
          <span>Criterio de aceptacion</span>
          <span />
        </div>

        {data.deliverables.map((deliverable, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[2fr_1.5fr_2fr_auto] sm:items-start sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
            <div>
              <label className="block text-xs text-gray-500 sm:hidden">Entregable</label>
              <input
                type="text"
                required
                value={deliverable.name}
                onChange={(e) => updateDeliverable(index, 'name', e.target.value)}
                placeholder="Ej: Codigo fuente del sistema"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 sm:hidden">Formato</label>
              <input
                type="text"
                required
                value={deliverable.format}
                onChange={(e) => updateDeliverable(index, 'format', e.target.value)}
                placeholder="Ej: Repositorio Git privado"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 sm:hidden">Criterio de aceptacion</label>
              <input
                type="text"
                required
                value={deliverable.acceptanceCriteria}
                onChange={(e) => updateDeliverable(index, 'acceptanceCriteria', e.target.value)}
                placeholder="Ej: Acceso transferido y pipeline CI/CD funcional"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => removeDeliverable(index)}
                disabled={data.deliverables.length === 1}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addDeliverable}
          className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          + Agregar entregable
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Criterio de aceptacion final del proyecto *
        </label>
        <p className="mt-0.5 text-xs text-gray-400">
          Como se determina que el proyecto esta completo y listo para firma de cierre.
          Debe ser verificable y no sujeto a interpretacion.
        </p>
        <textarea
          required
          rows={3}
          value={data.finalAcceptanceCriteria}
          onChange={(e) => setData({ ...data, finalAcceptanceCriteria: e.target.value })}
          placeholder="Ej: El sistema procesa correctamente el 95%+ de ordenes de prueba en ambiente de produccion durante 5 dias habiles consecutivos. Todos los entregables listados han sido transferidos y verificados por el cliente. El equipo de operaciones completo el curso de capacitacion (con asistencia firmada)."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Anterior
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Generar Brief →'}
        </button>
      </div>
    </form>
  )
}
