'use server'

import { createClient } from '@/lib/supabase/server'
import { OpenRouter } from '@openrouter/sdk'
import type { AiUsageLog } from '@/types/database'

// ---------------------------------------------------------------------------
// Logs de uso por proyecto o globales (solo admin)
// ---------------------------------------------------------------------------

export interface UsageLogRow extends AiUsageLog {
  project_name?: string
}

export async function getUsageLogs(projectId?: string): Promise<
  { data: UsageLogRow[] } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('ai_usage_logs')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (projectId) {
    query = query.eq('project_id', projectId)
  } else if (profile?.role !== 'admin') {
    // No-admin solo puede ver sus propios proyectos
    return { error: 'Acceso denegado' }
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  const rows = (data ?? []).map((row) => ({
    ...row,
    project_name: (row.projects as { name: string } | null)?.name,
  }))

  return { data: rows as UsageLogRow[] }
}

// ---------------------------------------------------------------------------
// Rating de modelos (agrupado por modelo)
// ---------------------------------------------------------------------------

export interface ModelRating {
  provider: string
  model: string
  total_generations: number
  revisions: number
  revision_rate: number       // porcentaje 0-100
  avg_tokens: number | null
  total_tokens: number | null
  total_cost_usd: number | null
  avg_latency_ms: number | null
}

export async function getModelRatings(): Promise<
  { data: ModelRating[] } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Acceso denegado' }

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('provider, model, is_revision, total_tokens, cost_usd, latency_ms')

  if (error) return { error: error.message }

  // Agrupar en memoria (evita SQL raw)
  const map = new Map<string, {
    provider: string
    model: string
    total: number
    revisions: number
    tokens: number[]
    costs: number[]
    latencies: number[]
  }>()

  for (const row of data ?? []) {
    const key = `${row.provider}::${row.model}`
    if (!map.has(key)) {
      map.set(key, {
        provider: row.provider,
        model: row.model,
        total: 0,
        revisions: 0,
        tokens: [],
        costs: [],
        latencies: [],
      })
    }
    const entry = map.get(key)!
    entry.total++
    if (row.is_revision) entry.revisions++
    if (row.total_tokens != null) entry.tokens.push(row.total_tokens)
    if (row.cost_usd != null) entry.costs.push(Number(row.cost_usd))
    if (row.latency_ms != null) entry.latencies.push(row.latency_ms)
  }

  const ratings: ModelRating[] = Array.from(map.values()).map((e) => ({
    provider: e.provider,
    model: e.model,
    total_generations: e.total,
    revisions: e.revisions,
    revision_rate: e.total > 0 ? Math.round((e.revisions / e.total) * 100) : 0,
    avg_tokens: e.tokens.length > 0 ? Math.round(e.tokens.reduce((a, b) => a + b, 0) / e.tokens.length) : null,
    total_tokens: e.tokens.length > 0 ? e.tokens.reduce((a, b) => a + b, 0) : null,
    total_cost_usd: e.costs.length > 0 ? e.costs.reduce((a, b) => a + b, 0) : null,
    avg_latency_ms: e.latencies.length > 0 ? Math.round(e.latencies.reduce((a, b) => a + b, 0) / e.latencies.length) : null,
  }))

  // Ordenar por revision_rate ASC (mejor modelo primero)
  ratings.sort((a, b) => a.revision_rate - b.revision_rate)

  return { data: ratings }
}

// ---------------------------------------------------------------------------
// Balance de créditos OpenRouter
// ---------------------------------------------------------------------------

export interface OpenRouterBalance {
  totalCredits: number
  totalUsage: number
  remaining: number
}

export async function getOpenRouterBalance(): Promise<
  { data: OpenRouterBalance } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Acceso denegado' }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return { error: 'OPENROUTER_API_KEY no configurada' }

  try {
    const openrouter = new OpenRouter({ apiKey })
    const result = await openrouter.credits.getCredits()
    return {
      data: {
        totalCredits: result.data.totalCredits,
        totalUsage: result.data.totalUsage,
        remaining: result.data.totalCredits - result.data.totalUsage,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error consultando créditos'
    return { error: msg }
  }
}

// ---------------------------------------------------------------------------
// Resumen de uso AI por proyecto (para el widget en las páginas de flujo)
// ---------------------------------------------------------------------------

export interface ProjectAiSummary {
  totalTokens: number
  totalCostUsd: number
  totalGenerations: number
  byTaskType: {
    storyboard: number
    infographics: number
  }
}

export async function getProjectAiSummary(
  projectId: string
): Promise<{ data: ProjectAiSummary } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('task_type, total_tokens, cost_usd')
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  const rows = data ?? []
  let totalTokens = 0
  let totalCostUsd = 0
  let storyboard = 0
  let infographics = 0

  for (const row of rows) {
    totalTokens += row.total_tokens ?? 0
    totalCostUsd += Number(row.cost_usd ?? 0)
    if (row.task_type?.startsWith('storyboard')) storyboard++
    if (row.task_type?.startsWith('infographic')) infographics++
  }

  return {
    data: {
      totalTokens,
      totalCostUsd,
      totalGenerations: rows.length,
      byTaskType: { storyboard, infographics },
    },
  }
}

// ---------------------------------------------------------------------------
// Último log de un proyecto/tipo (para el badge en UI)
// ---------------------------------------------------------------------------

export async function getLastAiLog(
  projectId: string,
  taskTypes: string[]
): Promise<{ data: AiUsageLog | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .eq('project_id', projectId)
    .in('task_type', taskTypes)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data }
}
