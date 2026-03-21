'use client'

import { useEffect } from 'react'
import { getProjects, createProject, archiveProject } from '@/actions/projects'
import { useProjectsStore } from '../store/projects.store'
import type { CreateProjectInput } from '@/actions/projects'

export function useProjects() {
  const { projects, loading, setProjects, addProject, removeProject, setLoading } =
    useProjectsStore()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getProjects()
      if ('data' in result) setProjects(result.data)
      setLoading(false)
    }
    load()
  }, [setProjects, setLoading])

  async function handleCreate(input: CreateProjectInput) {
    const result = await createProject(input)
    if ('data' in result) {
      addProject(result.data)
      return { success: true as const }
    }
    return { error: result.error }
  }

  async function handleArchive(id: string) {
    const result = await archiveProject(id)
    if ('success' in result) {
      removeProject(id)
      return { success: true as const }
    }
    return { error: result.error }
  }

  return { projects, loading, createProject: handleCreate, archiveProject: handleArchive }
}
