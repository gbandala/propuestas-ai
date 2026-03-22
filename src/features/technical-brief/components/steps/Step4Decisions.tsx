'use client'

import { useState } from 'react'
import type { Step4Data } from '../../types'

interface Step4Props {
  initialData?: Step4Data
  onNext: (data: Step4Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

export function Step4Decisions({ initialData, onNext, onBack, isSaving }: Step4Props) {
  const [data, setData] = useState<Step4Data>({
    architectureDecisions: initialData?.architectureDecisions ?? '',
    selfServiceConfig: initialData?.selfServiceConfig ?? '',
    whenToEscalate: initialData?.whenToEscalate ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Registro de Decisiones</h2>
        <p className="mt-1 text-sm text-gray-500">
          Documenta el razonamiento detras de la arquitectura y define que puede operar el cliente de forma autonoma.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Decisiones de arquitectura y sus razones *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Por que esta arquitectura y no otra. Incluye alternativas consideradas y por que se descartaron.
            Este registro protege al cliente de cuestionamientos futuros y al arquitecto de cambios no fundamentados.
          </p>
          <textarea
            required
            rows={5}
            value={data.architectureDecisions}
            onChange={(e) => setData({ ...data, architectureDecisions: e.target.value })}
            placeholder={`Ej:
- Se eligio arquitectura serverless (AWS Lambda) sobre servidor dedicado porque el patron de uso es por rafagas (picos de carga a las 9am y 5pm). Un servidor dedicado estaria ocioso el 80% del tiempo con un costo fijo de $400/mes vs ~$40/mes en Lambda.
- Se descarto MongoDB porque el equipo de operaciones del cliente ya conoce SQL y el ERP exporta en formato relacional. Usar PostgreSQL reduce la curva de aprendizaje.
- Se eligio Google Document AI sobre Textract (AWS) porque ya tienen credenciales de Google activas y el soporte de español es superior en el contexto de sus proveedores.`}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Que puede configurar o ajustar el cliente sin solicitar ayuda *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Parametros, umbrales, usuarios, reglas o contenido que el cliente puede modificar directamente
            a traves del panel de administracion o archivos de configuracion documentados.
          </p>
          <textarea
            required
            rows={4}
            value={data.selfServiceConfig}
            onChange={(e) => setData({ ...data, selfServiceConfig: e.target.value })}
            placeholder={`Ej:
- Agregar o desactivar usuarios y asignar roles (admin, operador, auditor) desde el panel.
- Cambiar umbrales de alerta: monto minimo para notificacion ($50,000 por defecto), tiempo maximo de procesamiento (2 min).
- Actualizar plantilla del reporte PDF (logo, colores) subiendo archivos desde el panel.
- Activar/desactivar portales de proveedores sin tocar codigo.`}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            En que casos si solicitar ayuda del arquitecto *
          </label>
          <p className="mt-0.5 text-xs text-gray-400">
            Escenarios que requieren intervencion tecnica. Establecer esto evita que el cliente
            intente resolver problemas complejos por su cuenta y rompa el sistema.
          </p>
          <textarea
            required
            rows={4}
            value={data.whenToEscalate}
            onChange={(e) => setData({ ...data, whenToEscalate: e.target.value })}
            placeholder={`Ej:
- Agregar soporte para un nuevo portal de proveedor (requiere mapeo de campos y pruebas).
- Cambiar el ERP destino o actualizar credenciales de API del ERP.
- Errores con codigo 5XX que persisten mas de 30 minutos (indica falla de infraestructura).
- Necesidad de procesar volumenes mayores a 1,000 ordenes/dia (requiere ajuste de limites en Lambda).
- Cambios en la logica de validacion de ordenes o reglas de negocio.`}
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
