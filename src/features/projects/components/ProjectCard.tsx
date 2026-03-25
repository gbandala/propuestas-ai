'use client'

import Link from 'next/link'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import type { ProjectWithProgress } from '@/actions/projects'

interface StageProps {
  label: string
  done: boolean
  active: boolean
}

function Stage({ label, done, active }: StageProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
          done
            ? 'border-green-500 bg-green-500 text-white'
            : active
            ? 'border-blue-400 bg-white text-blue-400'
            : 'border-gray-200 bg-white text-gray-300'
        }`}
      >
        {done ? '✓' : '·'}
      </div>
      <span
        className={`text-[10px] font-medium leading-none ${
          done ? 'text-green-600' : active ? 'text-blue-500' : 'text-gray-300'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function Connector({ done }: { done: boolean }) {
  return (
    <div
      className={`mb-4 h-0.5 flex-1 transition-colors ${done ? 'bg-green-400' : 'bg-gray-200'}`}
    />
  )
}

interface ProjectCardProps {
  project: ProjectWithProgress
  onArchive?: (id: string) => void
  canArchive?: boolean
}

export function ProjectCard({ project, onArchive, canArchive }: ProjectCardProps) {
  const { infoLoaded, storyboardApproved, hasInfographics } = project.proposalProgress
  const isComplete = hasInfographics

  // Una etapa es "active" (siguiente paso) si la anterior está done y ella no
  const infoActive = !infoLoaded
  const storyActive = infoLoaded && !storyboardApproved
  const imgActive = storyboardApproved && !hasInfographics
  const pptActive = hasInfographics && !isComplete // nunca activo si hasInfographics = complete

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">{project.name}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{project.client_name}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{project.description}</p>
      )}

      {/* Propuesta progress */}
      <div className="mt-4 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Propuesta
          </span>
          {isComplete && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              Lista ✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-0">
          <Stage label="Información" done={infoLoaded} active={infoActive} />
          <Connector done={infoLoaded} />
          <Stage label="Storyboard" done={storyboardApproved} active={storyActive} />
          <Connector done={storyboardApproved} />
          <Stage label="Infografías" done={hasInfographics} active={imgActive} />
          <Connector done={hasInfographics} />
          <Stage label="PPT" done={isComplete} active={pptActive} />
        </div>
      </div>

      {/* Footer */}
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
