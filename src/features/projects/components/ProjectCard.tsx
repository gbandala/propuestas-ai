'use client'

import Link from 'next/link'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import type { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
  onArchive?: (id: string) => void
  canArchive?: boolean
}

export function ProjectCard({ project, onArchive, canArchive }: ProjectCardProps) {
  const technicalDone = !!project.technical_completed_at
  const commercialDone = !!project.commercial_completed_at

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">
            {project.name}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">{project.client_name}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{project.description}</p>
      )}

      <div className="mt-3 flex gap-2">
        <span className={`text-xs font-medium ${technicalDone ? 'text-green-600' : 'text-gray-400'}`}>
          {technicalDone ? '✓' : '○'} Técnica
        </span>
        <span className={`text-xs font-medium ${commercialDone ? 'text-green-600' : technicalDone ? 'text-gray-500' : 'text-gray-300'}`}>
          {commercialDone ? '✓' : '○'} Comercial
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver proyecto →
        </Link>
        {canArchive && onArchive && (
          <button
            onClick={() => onArchive(project.id)}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Archivar
          </button>
        )}
      </div>
    </div>
  )
}
