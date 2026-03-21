export type UserRole = 'architect' | 'commercial' | 'admin'
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type InfographicType = 'technical' | 'roi' | 'roadmap'
export type PresentationType = 'technical' | 'commercial'
export type JobType = 'technical_infographics' | 'commercial_infographics' | 'technical_presentation' | 'commercial_presentation'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'
export type DownloadType = 'technical' | 'commercial' | 'complete'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  client_name: string
  description: string | null
  architect_id: string
  commercial_id: string | null
  status: ProjectStatus
  technical_completed_at: string | null
  commercial_completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TechnicalBrief {
  id: string
  project_id: string
  step_data: Record<string, unknown>
  current_step: number
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface BrandSpec {
  id: string
  project_id: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  created_at: string
  updated_at: string
}

export interface Infographic {
  id: string
  project_id: string
  type: InfographicType
  variant: number
  url: string | null
  prompt_used: string | null
  selected: boolean
  created_at: string
}

export interface Presentation {
  id: string
  project_id: string
  type: PresentationType
  html_content: string | null
  slides_count: number
  created_at: string
  updated_at: string
}

export interface CommercialProposal {
  id: string
  project_id: string
  markdown_content: string | null
  phases_data: unknown[]
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface GenerationJob {
  id: string
  project_id: string
  type: JobType
  status: JobStatus
  progress: number
  error: string | null
  created_at: string
  updated_at: string
}

export interface Download {
  id: string
  project_id: string
  type: DownloadType
  zip_url: string | null
  downloaded_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'technical_completed_at' | 'commercial_completed_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at'>>
      }
      technical_briefs: {
        Row: TechnicalBrief
        Insert: Omit<TechnicalBrief, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TechnicalBrief, 'id' | 'created_at'>>
      }
      brand_specs: {
        Row: BrandSpec
        Insert: Omit<BrandSpec, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BrandSpec, 'id' | 'created_at'>>
      }
      infographics: {
        Row: Infographic
        Insert: Omit<Infographic, 'id' | 'created_at'>
        Update: Partial<Omit<Infographic, 'id' | 'created_at'>>
      }
      presentations: {
        Row: Presentation
        Insert: Omit<Presentation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Presentation, 'id' | 'created_at'>>
      }
      commercial_proposals: {
        Row: CommercialProposal
        Insert: Omit<CommercialProposal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CommercialProposal, 'id' | 'created_at'>>
      }
      generation_jobs: {
        Row: GenerationJob
        Insert: Omit<GenerationJob, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<GenerationJob, 'id' | 'created_at'>>
      }
      downloads: {
        Row: Download
        Insert: Omit<Download, 'id'>
        Update: Partial<Omit<Download, 'id'>>
      }
    }
  }
}
