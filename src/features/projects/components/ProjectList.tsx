'use client'

import { useState } from 'react'
import { ProjectCard } from './ProjectCard'
import { CreateProjectModal } from './CreateProjectModal'
import { useProjects } from '../hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'

export function ProjectList() {
  const { projects, loading, createProject, archiveProject } = useProjects()
  const { profile } = useAuth()
  const [showModal, setShowModal] = useState(false)

  const isAdmin = profile?.role === 'admin'

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
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} activo{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No hay proyectos todavía.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-sm font-medium text-blue-600 hover:underline"
          >
            Crear el primer proyecto →
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canArchive={isAdmin}
              onArchive={archiveProject}
            />
          ))}
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
