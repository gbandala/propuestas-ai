import { create } from 'zustand'
import type { Project } from '@/types/database'
import type { ProjectWithProgress } from '@/actions/projects'

interface ProjectsStore {
  projects: ProjectWithProgress[]
  loading: boolean
  setProjects: (projects: ProjectWithProgress[]) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [],
  loading: false,
  setProjects: (projects) => set({ projects }),
  // Nuevo proyecto sin progreso aún
  addProject: (project) =>
    set((state) => ({
      projects: [
        { ...project, proposalProgress: { infoLoaded: false, storyboardApproved: false, hasInfographics: false } },
        ...state.projects,
      ],
    })),
  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
  setLoading: (loading) => set({ loading }),
}))
