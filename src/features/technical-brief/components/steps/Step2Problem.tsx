'use client'

import { useState } from 'react'
import type { Step2Data } from '../../types'

interface Step2Props {
  initialData?: Step2Data
  onNext: (data: Step2Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

export function Step2Problem({ initialData, onNext, onBack, isSaving }: Step2Props) {
  const [problemDescription, setProblemDescription] = useState(initialData?.problemDescription ?? '')
  const [technicalConstraints, setTechnicalConstraints] = useState(initialData?.technicalConstraints ?? '')
  const [impacts, setImpacts] = useState<string[]>(
    initialData?.impacts ?? ['', '', '']
  )

  function addImpact() {
    setImpacts([...impacts, ''])
  }

  function removeImpact(i: number) {
    if (impacts.length <= 3) return
    setImpacts(impacts.filter((_, idx) => idx !== i))
  }

  function updateImpact(i: number, value: string) {
    const updated = [...impacts]
    updated[i] = value
    setImpacts(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filledImpacts = impacts.filter((imp) => imp.trim())
    if (filledImpacts.length < 3) return
    await onNext({ problemDescription, impacts: filledImpacts, technicalConstraints })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Problema e Impacto</h2>
        <p className="mt-1 text-sm text-gray-500">Describe el problema que resuelve esta solución.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Descripción del Problema *
        </label>
        <textarea
          required
          rows={4}
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          minLength={50}
          placeholder="Describe el problema principal de negocio con detalle..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">{problemDescription.length} caracteres (mínimo 50)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Impactos Negativos * (mínimo 3)
        </label>
        <p className="mb-2 text-xs text-gray-400">Cuantifica cada impacto si es posible.</p>
        <div className="space-y-2">
          {impacts.map((impact, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={impact}
                onChange={(e) => updateImpact(i, e.target.value)}
                placeholder={`Impacto ${i + 1}: Ej. Pérdida de $X por mes...`}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {impacts.length > 3 && (
                <button
                  type="button"
                  onClick={() => removeImpact(i)}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addImpact}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          + Agregar impacto
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Restricciones Técnicas Actuales
        </label>
        <textarea
          rows={3}
          value={technicalConstraints}
          onChange={(e) => setTechnicalConstraints(e.target.value)}
          placeholder="Limitaciones tecnológicas existentes que dificultan resolver el problema..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:underline">
          ← Anterior
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Siguiente →'}
        </button>
      </div>
    </form>
  )
}
