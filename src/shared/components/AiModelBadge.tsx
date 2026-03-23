import type { AiUsageLog } from '@/types/database'

interface AiModelBadgeProps {
  log: AiUsageLog | null
}

export function AiModelBadge({ log }: AiModelBadgeProps) {
  if (!log) return null

  const isGemini = log.provider === 'gemini'
  const label = isGemini ? 'Gemini (free)' : 'OpenRouter'
  const modelShort = log.model.replace('gemini-', 'Gemini ').replace('google/', '')

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
      <span
        className={`h-1.5 w-1.5 rounded-full ${isGemini ? 'bg-blue-500' : 'bg-purple-500'}`}
      />
      <span className="font-medium text-gray-700">{modelShort}</span>
      <span className="text-gray-400">via {label}</span>
      {log.total_tokens != null && (
        <>
          <span className="text-gray-300">·</span>
          <span>{log.total_tokens.toLocaleString()} tokens</span>
        </>
      )}
      {log.latency_ms != null && (
        <>
          <span className="text-gray-300">·</span>
          <span>{(log.latency_ms / 1000).toFixed(1)}s</span>
        </>
      )}
    </div>
  )
}
