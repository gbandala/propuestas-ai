'use client'

import Link from 'next/link'
import type { ProjectWithProgress } from '@/actions/projects'

interface ArchivedProjectCardProps {
  project: ProjectWithProgress
}

export function ArchivedProjectCard({ project }: ArchivedProjectCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-500">{project.name}</h3>
          <p className="mt-0.5 text-sm text-gray-400">{project.client_name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
          Archivado
        </span>
      </div>

      <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-400">
        {project.description ?? '—'}
      </p>

      {project.archived_at && (
        <p className="mt-2 text-xs text-gray-400">
          Archivado el {new Date(project.archived_at).toLocaleDateString('es-MX')}
        </p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center gap-3">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Ver proyecto →
        </Link>
        {project.archive_url && (
          <a
            href={project.archive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Descargar ZIP
          </a>
        )}
      </div>
    </div>
  )
}
