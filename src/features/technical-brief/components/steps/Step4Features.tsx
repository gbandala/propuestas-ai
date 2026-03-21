'use client'

import { useState } from 'react'
import type { Step4Data, Feature } from '../../types'

interface Step4Props {
  initialData?: Step4Data
  onNext: (data: Step4Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const emptyFeature = (): Feature => ({ name: '', description: '', priority: 'Must' })

export function Step4Features({ initialData, onNext, onBack, isSaving }: Step4Props) {
  const [features, setFeatures] = useState<Feature[]>(
    initialData?.features ?? [emptyFeature()]
  )

  function updateFeature(i: number, field: keyof Feature, value: string) {
    const updated = [...features]
    updated[i] = { ...updated[i], [field]: value } as Feature
    setFeatures(updated)
  }

  function addFeature() { setFeatures([...features, emptyFeature()]) }
  function removeFeature(i: number) {
    if (features.length <= 1) return
    setFeatures(features.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filled = features.filter((f) => f.name.trim())
    if (filled.length === 0) return
    await onNext({ features: filled })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Funcionalidades</h2>
        <p className="mt-1 text-sm text-gray-500">Lista las funcionalidades que debe tener el sistema.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-3 font-medium w-1/4">Funcionalidad</th>
              <th className="pb-2 pr-3 font-medium">Descripción</th>
              <th className="pb-2 pr-3 font-medium w-28">Prioridad</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="pr-3 py-2">
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => updateFeature(i, 'name', e.target.value)}
                    placeholder="Ej: Dashboard de métricas"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="pr-3 py-2">
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => updateFeature(i, 'description', e.target.value)}
                    placeholder="Descripción de la funcionalidad..."
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="pr-3 py-2">
                  <select
                    value={feature.priority}
                    onChange={(e) => updateFeature(i, 'priority', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="Must">Must</option>
                    <option value="Should">Should</option>
                    <option value="Could">Could</option>
                  </select>
                </td>
                <td className="py-2">
                  <button type="button" onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addFeature} className="text-sm text-blue-600 hover:underline">
        + Agregar funcionalidad
      </button>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:underline">← Anterior</button>
        <button type="submit" disabled={isSaving} className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSaving ? 'Guardando...' : 'Siguiente →'}
        </button>
      </div>
    </form>
  )
}
