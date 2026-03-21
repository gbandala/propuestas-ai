'use client'

import { useState } from 'react'
import type { Step7Data, Phase } from '../../types'

interface Step7Props {
  initialData?: Step7Data
  onNext: (data: Step7Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const emptyPhase = (): Phase => ({ name: '', duration: '', dates: '' })

export function Step7TechSolution({ initialData, onNext, onBack, isSaving }: Step7Props) {
  const [architectureDescription, setArchitectureDescription] = useState(
    initialData?.architectureDescription ?? ''
  )
  const [stackBackend, setStackBackend] = useState(initialData?.stackBackend ?? '')
  const [stackFrontend, setStackFrontend] = useState(initialData?.stackFrontend ?? '')
  const [stackDatabase, setStackDatabase] = useState(initialData?.stackDatabase ?? '')
  const [phases, setPhases] = useState<Phase[]>(
    initialData?.phases ?? [
      { name: 'Discovery', duration: '2 semanas', dates: '' },
      { name: 'Diseño', duration: '3 semanas', dates: '' },
      { name: 'Implementación', duration: '8 semanas', dates: '' },
      { name: 'Rollout', duration: '2 semanas', dates: '' },
    ]
  )

  function updatePhase(i: number, field: keyof Phase, value: string) {
    const updated = [...phases]
    updated[i] = { ...updated[i], [field]: value }
    setPhases(updated)
  }

  function addPhase() { setPhases([...phases, emptyPhase()]) }
  function removePhase(i: number) {
    if (phases.length <= 1) return
    setPhases(phases.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext({ architectureDescription, stackBackend, stackFrontend, stackDatabase, phases })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Solución Técnica Propuesta</h2>
        <p className="mt-1 text-sm text-gray-500">Describe la arquitectura y el plan de implementación.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Descripción de la Arquitectura *</label>
        <textarea
          required
          rows={5}
          value={architectureDescription}
          onChange={(e) => setArchitectureDescription(e.target.value)}
          placeholder="Describe la arquitectura de alto nivel: componentes principales, flujo de datos, patrones utilizados..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Stack Backend</label>
          <input
            type="text"
            value={stackBackend}
            onChange={(e) => setStackBackend(e.target.value)}
            placeholder="Ej: Node.js + Express + PostgreSQL"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stack Frontend</label>
          <input
            type="text"
            value={stackFrontend}
            onChange={(e) => setStackFrontend(e.target.value)}
            placeholder="Ej: Next.js + React + Tailwind"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Base de Datos</label>
          <input
            type="text"
            value={stackDatabase}
            onChange={(e) => setStackDatabase(e.target.value)}
            placeholder="Ej: PostgreSQL 14 + Redis"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fases de Implementación</label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium">Fase</th>
                <th className="pb-2 pr-3 font-medium w-32">Duración</th>
                <th className="pb-2 pr-3 font-medium">Fechas (opcional)</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="pr-3 py-2">
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(i, 'name', e.target.value)}
                      placeholder="Ej: Discovery"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="pr-3 py-2">
                    <input
                      type="text"
                      value={phase.duration}
                      onChange={(e) => updatePhase(i, 'duration', e.target.value)}
                      placeholder="Ej: 2 semanas"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="pr-3 py-2">
                    <input
                      type="text"
                      value={phase.dates}
                      onChange={(e) => updatePhase(i, 'dates', e.target.value)}
                      placeholder="Ej: 01/04 - 14/04"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2">
                    <button type="button" onClick={() => removePhase(i)} className="text-red-400 hover:text-red-600">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addPhase} className="mt-2 text-sm text-blue-600 hover:underline">
          + Agregar fase
        </button>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:underline">← Anterior</button>
        <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? 'Guardando...' : 'Siguiente →'}
        </button>
      </div>
    </form>
  )
}
