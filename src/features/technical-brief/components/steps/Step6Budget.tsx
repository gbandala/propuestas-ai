'use client'

import { useState } from 'react'
import type { Step6Data, BudgetItem } from '../../types'

interface Step6Props {
  initialData?: Step6Data
  onNext: (data: Step6Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const emptyItem = (): BudgetItem => ({ type: 'VPS', specification: '', monthlyCost: 0, notes: '' })

export function Step6Budget({ initialData, onNext, onBack, isSaving }: Step6Props) {
  const [budget, setBudget] = useState<BudgetItem[]>(
    initialData?.budget ?? [emptyItem()]
  )
  const [currency, setCurrency] = useState<'USD' | 'MXN' | 'EUR'>(initialData?.currency ?? 'USD')

  function update(i: number, field: keyof BudgetItem, value: string | number) {
    const updated = [...budget]
    updated[i] = { ...updated[i], [field]: value } as BudgetItem
    setBudget(updated)
  }

  function add() { setBudget([...budget, emptyItem()]) }
  function remove(i: number) {
    if (budget.length <= 1) return
    setBudget(budget.filter((_, idx) => idx !== i))
  }

  const totalMonthly = budget.reduce((sum, item) => sum + (item.monthlyCost || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext({ budget, currency })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Presupuesto & Recursos</h2>
        <p className="mt-1 text-sm text-gray-500">Infraestructura, licencias y recursos necesarios.</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Moneda:</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as 'USD' | 'MXN' | 'EUR')}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="USD">USD</option>
          <option value="MXN">MXN</option>
          <option value="EUR">EUR</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-3 font-medium w-28">Tipo</th>
              <th className="pb-2 pr-3 font-medium">Especificación</th>
              <th className="pb-2 pr-3 font-medium w-32">Costo/mes ({currency})</th>
              <th className="pb-2 pr-3 font-medium">Notas</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {budget.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="pr-3 py-2">
                  <select
                    value={item.type}
                    onChange={(e) => update(i, 'type', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="VPS">VPS</option>
                    <option value="Storage">Storage</option>
                    <option value="License">Licencia</option>
                    <option value="Other">Otro</option>
                  </select>
                </td>
                <td className="pr-3 py-2">
                  <input
                    type="text"
                    value={item.specification}
                    onChange={(e) => update(i, 'specification', e.target.value)}
                    placeholder="Ej: 4 CPU, 8GB RAM"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="pr-3 py-2">
                  <input
                    type="number"
                    min="0"
                    value={item.monthlyCost}
                    onChange={(e) => update(i, 'monthlyCost', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="pr-3 py-2">
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => update(i, 'notes', e.target.value)}
                    placeholder="Notas adicionales..."
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2">
                  <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={2} className="pt-2 pr-3 text-right text-sm font-semibold">Total mensual:</td>
              <td className="pt-2 pr-3 text-sm font-bold text-blue-700">{totalMonthly.toLocaleString()} {currency}</td>
              <td colSpan={2} className="pt-2 text-xs text-gray-400">({(totalMonthly * 12).toLocaleString()} {currency}/año)</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" onClick={add} className="text-sm text-blue-600 hover:underline">
        + Agregar recurso
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
