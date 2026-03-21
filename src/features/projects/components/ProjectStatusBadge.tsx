import type { ProjectStatus } from '@/types/database'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En progreso', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
  archived: { label: 'Archivado', className: 'bg-red-100 text-red-700' },
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
