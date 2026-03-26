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
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs text-gray-600">
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        <span className="font-semibold uppercase tracking-wide text-gray-400 text-[10px]">IA</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono font-semibold text-gray-900">{formatTokens(totalTokens)}</span>
        <span className="text-gray-400">tokens</span>
      </div>
      {byTaskType.storyboard > 0 && (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
          {byTaskType.storyboard} story
        </span>
      )}
      {byTaskType.infographics > 0 && (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
          {byTaskType.infographics} infos
        </span>
      )}
    </div>
  )
}
