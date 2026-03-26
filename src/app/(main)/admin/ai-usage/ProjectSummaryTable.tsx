'use client'

import React, { useState } from 'react'
import type { UsageLogRow } from '@/actions/ai-usage'

const TASK_LABELS: Record<string, string> = {
  storyboard_technical: 'Storyboard Técnico',
  storyboard_commercial: 'Storyboard Comercial',
  storyboard_infographic: 'Storyboard Propuesta',
  infographic_v1: 'Infografía V1',
  infographic_v2: 'Infografía V2',
  infographic_v3: 'Infografía V3',
}

function taskLabel(taskType: string): string {
  if (TASK_LABELS[taskType]) return TASK_LABELS[taskType]
  const slideMatch = taskType.match(/^infographic_slide_(\d+)$/)
  if (slideMatch) return `Infografía Slide ${slideMatch[1]}`
  return taskType
}

export interface ProjectSummaryRow {
  project_id: string
  project_name: string
  storyboard_count: number
  infographic_count: number
  revision_count: number
  total_tokens: number
  logs: UsageLogRow[]
}

interface Props {
  summaries: ProjectSummaryRow[]
}

export function ProjectSummaryTable({ summaries }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (summaries.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-gray-400">
        Sin registros aún. Los logs aparecen cuando se generan storyboards o infografías.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-6 py-3 text-left">Proyecto</th>
            <th className="px-6 py-3 text-right">Storyboards</th>
            <th className="px-6 py-3 text-right">Infografías</th>
            <th className="px-6 py-3 text-right">Revisiones</th>
            <th className="px-6 py-3 text-right">Tokens</th>
            <th className="px-6 py-3 text-center">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {summaries.map((row) => (
            <React.Fragment key={row.project_id}>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{row.project_name}</td>
                <td className="px-6 py-4 text-right text-gray-700">{row.storyboard_count}</td>
                <td className="px-6 py-4 text-right text-gray-700">{row.infographic_count}</td>
                <td className="px-6 py-4 text-right">
                  {row.revision_count > 0 ? (
                    <span className="font-medium text-yellow-600">{row.revision_count}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-gray-700">
                  {row.total_tokens.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setExpandedId(expandedId === row.project_id ? null : row.project_id)}
                    className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600"
                  >
                    {expandedId === row.project_id ? 'Cerrar' : 'Ver detalle'}
                  </button>
                </td>
              </tr>
              {expandedId === row.project_id && (
                <tr>
                  <td colSpan={6} className="bg-gray-50 px-6 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Registros de {row.project_name}
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-2 pr-4">Fecha</th>
                          <th className="pb-2 pr-4">Tarea</th>
                          <th className="pb-2 pr-4">Modelo</th>
                          <th className="pb-2 pr-4 text-right">Tokens</th>
                          <th className="pb-2 pr-4 text-right">Latencia</th>
                          <th className="pb-2 text-center">Revisión</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {row.logs.map((log) => (
                          <tr key={log.id} className="text-gray-600">
                            <td className="py-2 pr-4 whitespace-nowrap text-gray-400">
                              {new Date(log.created_at).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 pr-4">{taskLabel(log.task_type)}</td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    log.provider === 'gemini' ? 'bg-blue-500' : 'bg-purple-500'
                                  }`}
                                />
                                {log.model.replace('google/', '')}
                              </div>
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {log.total_tokens != null ? log.total_tokens.toLocaleString() : '—'}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              {log.latency_ms != null
                                ? `${(log.latency_ms / 1000).toFixed(1)}s`
                                : '—'}
                            </td>
                            <td className="py-2 text-center">
                              {log.is_revision ? (
                                <span
                                  title={log.revision_notes ?? ''}
                                  className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700"
                                >
                                  Sí
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
