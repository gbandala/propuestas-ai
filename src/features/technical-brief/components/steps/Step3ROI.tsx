'use client'

import { useState } from 'react'
import type { Step3Data, KPI } from '../../types'

interface Step3Props {
  initialData?: Step3Data
  onNext: (data: Step3Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const emptyKPI = (): KPI => ({ name: '', current: '', target: '', timeline: '' })

export function Step3ROI({ initialData, onNext, onBack, isSaving }: Step3Props) {
  const [kpis, setKpis] = useState<KPI[]>(
    initialData?.currentKPIs ?? [emptyKPI(), emptyKPI()]
  )
  const [returnTimeline, setReturnTimeline] = useState(initialData?.returnTimeline ?? '')
  const [totalInvestment, setTotalInvestment] = useState(initialData?.totalInvestment ?? '')
  const [annualSavings, setAnnualSavings] = useState(initialData?.annualSavings ?? '')

  function updateKPI(i: number, field: keyof KPI, value: string) {
    const updated = [...kpis]
    updated[i] = { ...updated[i], [field]: value }
    setKpis(updated)
  }

  function addKPI() { setKpis([...kpis, emptyKPI()]) }
  function removeKPI(i: number) {
    if (kpis.length <= 1) return
    setKpis(kpis.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext({
      currentKPIs: kpis,
      targetKPIs: kpis,
      returnTimeline,
      totalInvestment,
      annualSavings,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">ROI Esperado</h2>
        <p className="mt-1 text-sm text-gray-500">Define los KPIs a mejorar y el retorno esperado.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">KPIs a Mejorar *</label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium">KPI</th>
                <th className="pb-2 pr-3 font-medium">Valor Actual</th>
                <th className="pb-2 pr-3 font-medium">Valor Objetivo</th>
                <th className="pb-2 pr-3 font-medium">Timeline</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {kpis.map((kpi, i) => (
                <tr key={i}>
                  <td className="pr-3 py-1">
                    <input
                      type="text"
                      value={kpi.name}
                      onChange={(e) => updateKPI(i, 'name', e.target.value)}
                      placeholder="Ej: Tiempo por propuesta"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="pr-3 py-1">
                    <input
                      type="text"
                      value={kpi.current}
                      onChange={(e) => updateKPI(i, 'current', e.target.value)}
                      placeholder="Ej: 6 horas"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="pr-3 py-1">
                    <input
                      type="text"
                      value={kpi.target}
                      onChange={(e) => updateKPI(i, 'target', e.target.value)}
                      placeholder="Ej: 30 min"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="pr-3 py-1">
                    <input
                      type="text"
                      value={kpi.timeline}
                      onChange={(e) => updateKPI(i, 'timeline', e.target.value)}
                      placeholder="Ej: 3 meses"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-1">
                    <button type="button" onClick={() => removeKPI(i)} className="text-red-400 hover:text-red-600">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addKPI} className="mt-2 text-sm text-blue-600 hover:underline">
          + Agregar KPI
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Inversión Total</label>
          <input
            type="text"
            value={totalInvestment}
            onChange={(e) => setTotalInvestment(e.target.value)}
            placeholder="Ej: $150,000 USD"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ahorro Anual Estimado</label>
          <input
            type="text"
            value={annualSavings}
            onChange={(e) => setAnnualSavings(e.target.value)}
            placeholder="Ej: $80,000 USD"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Payback Period</label>
          <input
            type="text"
            value={returnTimeline}
            onChange={(e) => setReturnTimeline(e.target.value)}
            placeholder="Ej: 18 meses"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
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
