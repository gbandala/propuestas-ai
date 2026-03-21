'use client'

import { useState } from 'react'
import type { Step1Data } from '../../types'

interface Step1Props {
  initialData?: Step1Data
  onNext: (data: Step1Data) => Promise<void>
  isSaving: boolean
}

export function Step1ProjectData({ initialData, onNext, isSaving }: Step1Props) {
  const [data, setData] = useState<Step1Data>({
    projectName: initialData?.projectName ?? '',
    clientCompany: initialData?.clientCompany ?? '',
    date: initialData?.date ?? new Date().toISOString().split('T')[0],
    architectName: initialData?.architectName ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Datos del Proyecto</h2>
        <p className="mt-1 text-sm text-gray-500">Información básica del proyecto y el cliente.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre del Proyecto *</label>
          <input
            type="text"
            required
            value={data.projectName}
            onChange={(e) => setData({ ...data, projectName: e.target.value })}
            placeholder="Ej: Sistema de gestión de contratos"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Empresa Cliente *</label>
          <input
            type="text"
            required
            value={data.clientCompany}
            onChange={(e) => setData({ ...data, clientCompany: e.target.value })}
            placeholder="Ej: Inmobiliaria XYZ S.A. de C.V."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Propuesta *</label>
          <input
            type="date"
            required
            value={data.date}
            onChange={(e) => setData({ ...data, date: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Arquitecto Responsable *</label>
          <input
            type="text"
            required
            value={data.architectName}
            onChange={(e) => setData({ ...data, architectName: e.target.value })}
            placeholder="Ej: Ing. Juan Pérez"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
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
