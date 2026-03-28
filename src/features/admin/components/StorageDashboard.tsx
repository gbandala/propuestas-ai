'use client'

import { useState, useTransition } from 'react'
import type { StorageDashboardData } from '@/actions/admin'
import { permanentlyDeleteProject } from '@/actions/admin'

function fmtMB(bytes: number) {
  if (bytes === 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:       { label: 'Borrador',    cls: 'bg-gray-100 text-gray-600' },
  active:      { label: 'Activo',      cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En progreso', cls: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Completado',  cls: 'bg-green-100 text-green-700' },
  archived:    { label: 'Archivado',   cls: 'bg-amber-100 text-amber-700' },
}

const PLAN_OPTIONS = [
  { label: 'Free (1 GB)', valueMB: 1024 },
  { label: 'Pro (100 GB)', valueMB: 102400 },
]

interface Props {
  data: StorageDashboardData
}

export function StorageDashboard({ data }: Props) {
  const [planLimitMB, setPlanLimitMB] = useState(1024)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const NINETY_DAYS_AGO = Date.now() - 90 * 24 * 60 * 60 * 1000

  const eligible = data.projects.filter(
    (p) => p.status === 'archived' && p.archived_at && new Date(p.archived_at).getTime() < NINETY_DAYS_AGO
  )
  const archivedRecent = data.projects.filter(
    (p) => p.status === 'archived' && !(p.archived_at && new Date(p.archived_at).getTime() < NINETY_DAYS_AGO)
  )
  const active = data.projects.filter((p) => p.status !== 'archived')

  const usedMB = data.totalBytes / 1024 / 1024
  const pct = Math.min((usedMB / planLimitMB) * 100, 100)
  const barColor = pct < 60 ? 'bg-green-500' : pct < 80 ? 'bg-yellow-500' : 'bg-red-500'
  const limitLabel = planLimitMB >= 1024 ? `${(planLimitMB / 1024).toFixed(0)} GB` : `${planLimitMB} MB`

  function handleDelete(projectId: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await permanentlyDeleteProject(projectId)
      setConfirmId(null)
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Proyecto eliminado permanentemente.' })
      }
    })
  }

  return (
    <div className="space-y-8">

      {/* Storage progress */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Uso del bucket</h2>
          <select
            value={planLimitMB}
            onChange={(e) => setPlanLimitMB(Number(e.target.value))}
            className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.valueMB} value={opt.valueMB}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>{fmtMB(data.totalBytes)} usados de {limitLabel}</span>
          <span className="font-medium">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        {pct > 80 && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Espacio crítico. Elimina proyectos archivados elegibles para liberar espacio.
          </p>
        )}
      </section>

      {/* Global message */}
      {message && (
        <div className={`rounded-md px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Eligible for permanent deletion */}
      <section className="rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 bg-red-50 px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠</span>
            <h2 className="text-base font-semibold text-red-800">
              Elegibles para limpieza total — archivados &gt;90 días ({eligible.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-red-600">
            Estos proyectos ya tienen un ZIP descargable. Al eliminarlos se borran todos los registros de BD y archivos del bucket. Es irreversible.
          </p>
        </div>
        {eligible.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-400">Ningún proyecto elegible por ahora.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Proyecto</th>
                <th className="px-6 py-3 text-right">Tamaño</th>
                <th className="px-6 py-3 text-right">Archivado</th>
                <th className="px-6 py-3 text-right">ZIP</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eligible.map((p) => (
                <tr key={p.id} className="hover:bg-red-50/30">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.client_name}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">{fmtMB(p.bucketBytes)}</td>
                  <td className="px-6 py-4 text-right text-gray-500 text-xs">{fmtDate(p.archived_at)}</td>
                  <td className="px-6 py-4 text-right">
                    {p.archive_url ? (
                      <a href={p.archive_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        Descargar
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">Sin ZIP</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {confirmId === p.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600">¿Eliminar definitivamente?</span>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={isPending}
                          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {isPending ? '...' : 'Sí, eliminar'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(p.id)}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Archived recent */}
      <ProjectTable title={`Archivados recientes — <90 días (${archivedRecent.length})`} projects={archivedRecent} />

      {/* Active */}
      <ProjectTable title={`Proyectos activos (${active.length})`} projects={active} />

    </div>
  )
}

function ProjectTable({ title, projects }: { title: string; projects: StorageDashboardData['projects'] }) {
  const [open, setOpen] = useState(true)

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border-b border-gray-100 px-6 py-4 text-left hover:bg-gray-50"
      >
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        projects.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-400">Sin proyectos en esta categoría.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Proyecto</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-right">Tamaño en bucket</th>
                <th className="px-6 py-3 text-right">Creado</th>
                <th className="px-6 py-3 text-right">Últ. actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => {
                const st = STATUS_LABEL[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.client_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{fmtMB(p.bucketBytes)}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">{fmtDate(p.created_at)}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">{fmtDate(p.updated_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      )}
    </section>
  )
}
