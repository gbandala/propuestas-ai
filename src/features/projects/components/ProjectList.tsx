'use client'

import { useState } from 'react'
import { ProjectCard } from './ProjectCard'
import { ArchivedProjectCard } from './ArchivedProjectCard'
import { CreateProjectModal } from './CreateProjectModal'
import { useProjects } from '../hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'

export function ProjectList() {
  const { projects, loading, createProject, archiveProject } = useProjects()
  const { profile } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const isAdmin = profile?.role === 'admin'

  const activeProjects = projects.filter((p) => p.status !== 'archived')
  const archivedProjects = projects.filter((p) => p.status === 'archived')

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeProjects.length} proyecto{activeProjects.length !== 1 ? 's' : ''} activo{activeProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo proyecto
        </button>
      </div>

      {activeProjects.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No hay proyectos activos todavía.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-sm font-medium text-blue-600 hover:underline"
          >
            Crear el primer proyecto →
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canArchive={isAdmin}
              onArchive={archiveProject}
            />
          ))}
        </div>
      )}

      {archivedProjects.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showArchived ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Proyectos archivados ({archivedProjects.length})
          </button>

          {showArchived && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
              {archivedProjects.map((project) => (
                <ArchivedProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreate={createProject}
      />
    </div>
  )
}
