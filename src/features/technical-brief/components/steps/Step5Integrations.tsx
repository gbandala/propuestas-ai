'use client'

import { useState } from 'react'
import type { Step5Data, Integration } from '../../types'

interface Step5Props {
  initialData?: Step5Data
  onNext: (data: Step5Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const emptyIntegration = (): Integration => ({ name: '', type: 'API', description: '' })

export function Step5Integrations({ initialData, onNext, onBack, isSaving }: Step5Props) {
  const [integrations, setIntegrations] = useState<Integration[]>(
    initialData?.integrations ?? [emptyIntegration()]
  )

  function update(i: number, field: keyof Integration, value: string) {
    const updated = [...integrations]
    updated[i] = { ...updated[i], [field]: value } as Integration
    setIntegrations(updated)
  }

  function add() { setIntegrations([...integrations, emptyIntegration()]) }
  function remove(i: number) {
    if (integrations.length <= 1) return
    setIntegrations(integrations.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filled = integrations.filter((int) => int.name.trim())
    await onNext({ integrations: filled })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Integraciones Técnicas</h2>
        <p className="mt-1 text-sm text-gray-500">Sistemas externos, APIs o bases de datos que se deben conectar.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-3 font-medium">Sistema / API</th>
              <th className="pb-2 pr-3 font-medium w-32">Tipo</th>
              <th className="pb-2 pr-3 font-medium">Descripción</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((int, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="pr-3 py-2">
                  <input
                    type="text"
                    value={int.name}
                    onChange={(e) => update(i, 'name', e.target.value)}
                    placeholder="Ej: SAP ERP"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="pr-3 py-2">
                  <select
                    value={int.type}
                    onChange={(e) => update(i, 'type', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="BD">Base de Datos</option>
                    <option value="API">API Externa</option>
                    <option value="internal">Sistema Interno</option>
                  </select>
                </td>
                <td className="pr-3 py-2">
                  <input
                    type="text"
                    value={int.description}
                    onChange={(e) => update(i, 'description', e.target.value)}
                    placeholder="Propósito y datos que se consumen..."
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2">
                  <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="text-sm text-blue-600 hover:underline">
        + Agregar integración
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
