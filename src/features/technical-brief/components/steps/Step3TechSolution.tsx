'use client'

import { useState } from 'react'
import type { Step3Data } from '../../types'

interface Step3Props {
  initialData?: Step3Data
  onNext: (data: Step3Data) => Promise<void>
  onBack: () => void
  isSaving: boolean
}

const fieldConfig: Array<{
  key: keyof Step3Data
  label: string
  hint: string
  placeholder: string
}> = [
  {
    key: 'whatItDoes',
    label: 'Que hace',
    hint: 'Descripcion funcional de la solucion. Que acciones ejecuta, que transforma, que coordina.',
    placeholder: 'Ej: Recibe PDFs de ordenes, extrae los datos con OCR, valida contra el catalogo del ERP, registra las ordenes aprobadas y notifica al equipo de operaciones.',
  },
  {
    key: 'requirements',
    label: 'Que necesita para funcionar',
    hint: 'Dependencias externas: APIs, servicios, credenciales, infraestructura, permisos.',
    placeholder: 'Ej: Credenciales de API de SAP ERP (lectura/escritura), bucket S3 para archivos PDF, servicio OCR (Google Document AI), SMTP para notificaciones, VPN corporativa para acceso al ERP.',
  },
  {
    key: 'outputs',
    label: 'Que produce',
    hint: 'Outputs concretos: archivos, registros, eventos, notificaciones, cambios de estado.',
    placeholder: 'Ej: Ordenes registradas en SAP, emails de confirmacion al cliente, reporte PDF diario, logs de errores en S3, webhook a sistema de facturacion cuando orden supera $50,000.',
  },
  {
    key: 'howToTest',
    label: 'Como probarlo',
    hint: 'Criterios de aceptacion y casos de prueba clave. Como saber que funciona correctamente.',
    placeholder: 'Ej: Cargar 10 ordenes de prueba y verificar que 9/10 se registran en SAP en menos de 2 min. Probar orden con producto inexistente: debe rechazarse y notificar. Verificar reporte PDF a las 6pm con datos del dia.',
  },
  {
    key: 'failureHandling',
    label: 'Que hacer en caso de falla',
    hint: 'Fallbacks, alertas y procedimientos de recuperacion ante errores o caidas.',
    placeholder: 'Ej: Si SAP no responde: guardar orden en cola y reintentar cada 5 min por 1 hora, luego alertar a operaciones. Si OCR falla: marcar para revision manual. Logs completos en CloudWatch con alertas a Slack para errores criticos.',
  },
  {
    key: 'validCases',
    label: 'En que casos funciona',
    hint: 'Precondiciones, limites y alcance del sistema. Que escenarios estan dentro y fuera del scope.',
    placeholder: 'Ej: Funciona con PDFs de hasta 20 paginas y formatos de los 5 portales validados. No soporta ordenes en moneda extranjera (V2). Requiere que el producto exista en el catalogo SAP. No procesa ordenes de clientes bloqueados por cobranza.',
  },
]

export function Step3TechSolution({ initialData, onNext, onBack, isSaving }: Step3Props) {
  const [data, setData] = useState<Step3Data>({
    whatItDoes: initialData?.whatItDoes ?? '',
    requirements: initialData?.requirements ?? '',
    outputs: initialData?.outputs ?? '',
    howToTest: initialData?.howToTest ?? '',
    failureHandling: initialData?.failureHandling ?? '',
    validCases: initialData?.validCases ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onNext(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Solucion Tecnica</h2>
        <p className="mt-1 text-sm text-gray-500">
          Especificacion completa de la solucion: que hace, como funciona, como falla y como se valida.
        </p>
      </div>

      <div className="space-y-5">
        {fieldConfig.map(({ key, label, hint, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700">{label} *</label>
            <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
            <textarea
              required
              rows={3}
              value={data[key]}
              onChange={(e) => setData({ ...data, [key]: e.target.value })}
              placeholder={placeholder}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
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
