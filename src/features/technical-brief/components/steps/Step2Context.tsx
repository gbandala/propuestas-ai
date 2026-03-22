'use client'

import { useState } from 'react'
import type { Step2Data } from '../../types'

interface Step2Props {
  initialData?: Step2Data
  onNext: (data: Step2Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

export function Step2Context({ initialData, onNext, onBack, isSaving }: Step2Props) {
  const [data, setData] = useState<Step2Data>({
    problem: initialData?.problem ?? '',
    objective: initialData?.objective ?? '',
    inputs: initialData?.inputs ?? '',
    expectedOutput: initialData?.expectedOutput ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Contexto del Problema</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define el punto de partida: que dolor existe, que se quiere lograr y que fluye a traves de la solucion.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Problema *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Que dolor existe hoy y a quien afecta. Ser especifico: frecuencia, magnitud, costo.
          </p>
          <textarea
            required
            rows={3}
            value={data.problem}
            onChange={(e) => setData({ ...data, problem: e.target.value })}
            placeholder="Ej: El equipo de operaciones registra manualmente 200+ ordenes diarias en Excel, lo que genera errores de captura en el 12% de los casos y retrasos de 3 horas en el cierre del dia."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Objetivo *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Que debe lograr la solucion. Resultado medible y con criterio de exito claro.
          </p>
          <textarea
            required
            rows={3}
            value={data.objective}
            onChange={(e) => setData({ ...data, objective: e.target.value })}
            placeholder="Ej: Automatizar el registro de ordenes para reducir el tiempo de cierre diario de 3 horas a menos de 20 minutos, eliminando los errores de captura manual."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Insumos *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Que datos, archivos, sistemas o procesos entran al sistema para que funcione.
          </p>
          <textarea
            required
            rows={3}
            value={data.inputs}
            onChange={(e) => setData({ ...data, inputs: e.target.value })}
            placeholder="Ej: Ordenes en PDF desde el portal del cliente, catalogo de productos del ERP (SAP), credenciales de usuario autenticado, parametros de configuracion regional (moneda, impuestos)."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Producto o Resultado Esperado *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Que entrega concretamente el sistema al final del proceso. Formato, destino y frecuencia.
          </p>
          <textarea
            required
            rows={3}
            value={data.expectedOutput}
            onChange={(e) => setData({ ...data, expectedOutput: e.target.value })}
            placeholder="Ej: Ordenes procesadas y registradas en ERP en menos de 2 minutos. Reporte diario PDF enviado automaticamente a las 6pm. Dashboard en tiempo real accesible para el equipo de operaciones."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
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
          {isSaving ? 'Guardando...' : 'Siguiente →'}
        </button>
      </div>
    </form>
  )
}
