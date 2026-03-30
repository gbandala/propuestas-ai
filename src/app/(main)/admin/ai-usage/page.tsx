import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUsageLogs, getModelRatings, getOpenRouterBalance } from '@/actions/ai-usage'
import { getStorageStats } from '@/actions/admin'
import { ProjectSummaryTable } from './ProjectSummaryTable'
import type { ProjectSummaryRow } from './ProjectSummaryTable'
import { StorageMonitorWidget } from '@/features/admin/components/StorageMonitorWidget'

export default async function AiUsagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [logsResult, ratingsResult, balanceResult, storageResult] = await Promise.all([
    getUsageLogs(),
    getModelRatings(),
    getOpenRouterBalance(),
    getStorageStats(),
  ])

  const logs = 'data' in logsResult ? logsResult.data : []
  const ratings = 'data' in ratingsResult ? ratingsResult.data : []
  const balance = 'data' in balanceResult ? balanceResult.data : null
  const storageStats = 'data' in storageResult ? storageResult.data : null

  // Estadísticas globales
  const totalTokens = logs.reduce((s, l) => s + (l.total_tokens ?? 0), 0)
  const totalRevisions = logs.filter((l) => l.is_revision).length

  // Agrupado por proyecto para el tablero de resumen
  const projectMap = new Map<string, ProjectSummaryRow>()
  for (const log of logs) {
    const key = log.project_id
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        project_id: key,
        project_name: log.project_name ?? log.project_id.slice(0, 8),
        user_id: log.project_user_id ?? null,
        user_email: null,
        storyboard_count: 0,
        infographic_count: 0,
        revision_count: 0,
        total_tokens: 0,
        logs: [],
      })
    }
    const entry = projectMap.get(key)!
    entry.logs.push(log)
    entry.total_tokens += log.total_tokens ?? 0
    if (log.is_revision) entry.revision_count++
    if (log.task_type?.startsWith('storyboard')) entry.storyboard_count++
    if (log.task_type?.startsWith('infographic')) entry.infographic_count++
  }

  // Resolver emails de owners
  const userIds = [...new Set(
    Array.from(projectMap.values()).map((r) => r.user_id).filter(Boolean) as string[]
  )]
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)
    const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]))
    for (const row of projectMap.values()) {
      if (row.user_id) row.user_email = emailMap.get(row.user_id) ?? null
    }
  }

  const projectSummaries = Array.from(projectMap.values())

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Bitácora de IA</h1>
            <p className="mt-1 text-sm text-gray-500">
              Uso de modelos, créditos y rating de eficacia por proyecto
            </p>
          </div>
          <Link
            href="/admin/storage"
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Gestión de Storage →
          </Link>
        </div>

        {/* Storage Monitor */}
        <StorageMonitorWidget stats={storageStats} />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Generaciones totales" value={logs.length.toString()} />
          <StatCard label="Tokens totales" value={totalTokens.toLocaleString()} />
          <StatCard
            label="Proyectos con IA"
            value={projectSummaries.length.toString()}
            sub="proyectos activos"
          />
          <StatCard
            label="Revisiones"
            value={totalRevisions.toString()}
            sub={`${logs.length > 0 ? Math.round((totalRevisions / logs.length) * 100) : 0}% del total`}
          />
        </div>

        {/* Balance OpenRouter */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Créditos OpenRouter</h2>
          {balance ? (
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Comprados</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  ${balance.totalCredits.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Usados</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">
                  ${balance.totalUsage.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Restantes</p>
                <p className={`mt-1 text-2xl font-bold ${balance.remaining > 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                  ${balance.remaining.toFixed(4)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {'error' in balanceResult ? balanceResult.error : 'No disponible — requiere Management API Key'}
            </p>
          )}
        </section>

        {/* Rating de modelos */}
        {ratings.length > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Rating de Modelos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Menos revisiones = modelo más efectivo. Ordenado por eficacia (mejor primero).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left">Modelo</th>
                    <th className="px-6 py-3 text-right">Generaciones</th>
                    <th className="px-6 py-3 text-right">Revisiones</th>
                    <th className="px-6 py-3 text-right">% Revisiones</th>
                    <th className="px-6 py-3 text-right">Tokens prom.</th>
                    <th className="px-6 py-3 text-right">Latencia prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ratings.map((r, i) => (
                    <tr key={`${r.provider}-${r.model}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${r.provider === 'gemini' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{r.model.replace('google/', '')}</p>
                            <p className="text-xs text-gray-400 capitalize">{r.provider}</p>
                          </div>
                          {i === 0 && ratings.length > 1 && (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Mejor
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">{r.total_generations}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{r.revisions}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${
                          r.revision_rate === 0 ? 'text-green-600' :
                          r.revision_rate < 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {r.revision_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {r.avg_tokens != null ? r.avg_tokens.toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {r.avg_latency_ms != null ? `${(r.avg_latency_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tablero por proyecto */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Uso por Proyecto</h2>
            <p className="mt-1 text-sm text-gray-500">
              Resumen de generaciones por proyecto activo. Haz clic en &quot;Ver detalle&quot; para
              ver cada registro.
            </p>
          </div>
          <ProjectSummaryTable summaries={projectSummaries} />
        </section>

      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
