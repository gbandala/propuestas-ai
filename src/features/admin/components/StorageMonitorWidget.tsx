'use client'

import { useState, useTransition } from 'react'
import type { StorageStats } from '@/actions/admin'
import { autoCleanOldProjects } from '@/actions/admin'

function fmtMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const PLAN_OPTIONS = [
  { label: 'Free (1 GB)', value: 1024 },
  { label: 'Pro (100 GB)', value: 102400 },
]

export function StorageMonitorWidget({ stats }: { stats: StorageStats | null }) {
  const [planLimitMB, setPlanLimitMB] = useState(1024)
  const [cleanMessage, setCleanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAutoClean() {
    setCleanMessage(null)
    startTransition(async () => {
      const result = await autoCleanOldProjects()
      if ('error' in result) {
        setCleanMessage({ type: 'error', text: result.error })
      } else if (result.archived === 0) {
        setCleanMessage({ type: 'info', text: 'No hay proyectos elegibles (completados >30 días)' })
      } else {
        setCleanMessage({
          type: 'success',
          text: `${result.archived} proyecto${result.archived !== 1 ? 's' : ''} archivado${result.archived !== 1 ? 's' : ''}, ~${result.freedMB} MB liberados`,
        })
      }
    })
  }

  if (!stats) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7M4 7l8-4 8 4M4 7h16" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Storage del Bucket</h2>
        </div>
        <p className="text-sm text-gray-400">No se pudo cargar la información de storage.</p>
      </section>
    )
  }

  const usedMB = stats.totalBytes / 1024 / 1024
  const pct = Math.min((usedMB / planLimitMB) * 100, 100)
  const barColor = pct < 60 ? 'bg-green-500' : pct < 80 ? 'bg-yellow-500' : 'bg-red-500'
  const limitLabel = planLimitMB >= 1024 ? `${(planLimitMB / 1024).toFixed(0)} GB` : `${planLimitMB} MB`

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7M4 7l8-4 8 4M4 7h16" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Storage del Bucket</h2>
        </div>
        <select
          value={planLimitMB}
          onChange={(e) => setPlanLimitMB(Number(e.target.value))}
          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-2 flex justify-between text-sm text-gray-600">
        <span>{fmtMB(stats.totalBytes)} usados de {limitLabel}</span>
        <span className="font-medium">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {pct > 80 && (
        <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
          Considera archivar propuestas completadas para liberar espacio.
        </div>
      )}

      {/* Auto-limpieza — siempre visible */}
      <div className="mt-3">
        <button
          onClick={handleAutoClean}
          disabled={isPending}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Limpiando...' : '⚡ Auto-limpiar proyectos completados >30 días'}
        </button>
        {cleanMessage && (
          <div
            className={`mt-2 rounded-md px-3 py-2 text-sm ${
              cleanMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : cleanMessage.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-gray-50 border border-gray-200 text-gray-600'
            }`}
          >
            {cleanMessage.text}
          </div>
        )}
      </div>

      {stats.byProject.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase text-gray-400">Top proyectos por uso</p>
          <ul className="space-y-2">
            {stats.byProject.map((p) => {
              const projectPct = Math.min((p.bytes / (planLimitMB * 1024 * 1024)) * 100, 100)
              return (
                <li key={p.projectId}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span className="truncate max-w-[200px]">{p.projectName}</span>
                    <span className="ml-2 shrink-0">{fmtMB(p.bytes)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${projectPct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
