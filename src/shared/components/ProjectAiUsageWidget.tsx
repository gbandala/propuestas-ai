import { getProjectAiSummary } from '@/actions/ai-usage'

interface ProjectAiUsageWidgetProps {
  projectId: string
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export async function ProjectAiUsageWidget({ projectId }: ProjectAiUsageWidgetProps) {
  const result = await getProjectAiSummary(projectId)
  if ('error' in result) return null

  const { totalTokens, totalGenerations, byTaskType } = result.data

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Créditos IA · Proyecto
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600">Tokens usados</span>
          <span className="font-mono text-sm font-semibold text-gray-900">
            {formatTokens(totalTokens)}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600">Generaciones</span>
          <span className="text-sm font-semibold text-gray-900">{totalGenerations}</span>
        </div>
      </div>

      {totalGenerations > 0 && (
        <>
          <div className="my-3 border-t border-gray-100" />
          <div className="space-y-1.5">
            {byTaskType.storyboard > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Storyboard</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                  {byTaskType.storyboard}
                </span>
              </div>
            )}
            {byTaskType.infographics > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Infografías</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                  {byTaskType.infographics}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {totalGenerations === 0 && (
        <p className="mt-2 text-xs text-gray-400">Sin generaciones aún</p>
      )}
    </div>
  )
}
