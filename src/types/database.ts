export type UserRole = 'architect' | 'commercial' | 'admin'
export type AiProvider = 'gemini' | 'openrouter'
// Tipos activos en el nuevo flujo (propuesta unificada)
export type AiTaskType =
  | 'storyboard_infographic'
  | 'infographic_slide_1'
  | 'infographic_slide_2'
  | 'infographic_slide_3'
  | 'infographic_slide_4'
  | 'infographic_slide_5'
  | 'infographic_slide_6'
  | 'infographic_slide_7'
  | 'infographic_slide_8'
  | 'infographic_slide_9'
  | 'infographic_slide_10'
  // Legado — conservados para logs históricos
  | 'storyboard_technical'
  | 'storyboard_commercial'
  | 'infographic_v1'
  | 'infographic_v2'
  | 'infographic_v3'
  | 'presentation_technical'
  | 'presentation_commercial'
  | 'slide_technical_1'
  | 'slide_technical_2'
  | 'slide_technical_3'
  | 'slide_technical_4'
  | 'slide_technical_5'
  | 'slide_technical_6'
  | 'slide_technical_7'
  | 'slide_technical_8'
  | 'slide_technical_9'
  | 'slide_technical_10'
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type InfographicType = 'technical' | 'roi' | 'roadmap'
export type PresentationType = 'technical' | 'commercial'
// Tipos activos: 'proposal_infographics'. Legado conservado para jobs históricos.
export type JobType = 'proposal_infographics' | 'technical_infographics' | 'commercial_infographics' | 'technical_presentation' | 'commercial_presentation'
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'
export type DownloadType = 'technical' | 'commercial' | 'complete'
// Tipo activo: 'infographic'. Legado: 'technical', 'commercial'.
export type StoryboardType = 'infographic' | 'technical' | 'commercial'

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
  user_id: string
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
  markdown_content: string | null
  created_at: string
  updated_at: string
}

export interface BrandIdentity {
  id: string
  project_id: string
  markdown_content: string
  logo_url: string | null
  background_url: string | null
  created_at: string
  updated_at: string
}

export interface Brief {
  id: string
  project_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Storyboard {
  id: string
  project_id: string
  type: StoryboardType
  content_md: string
  version: number
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Infographic {
  id: string
  project_id: string
  type: InfographicType
  variant: number
  slide_index: number | null  // posición en la propuesta (1-10), nuevo flujo
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
  slide_number: number | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface AiUsageLog {
  id: string
  project_id: string
  user_id: string | null
  task_type: AiTaskType
  provider: AiProvider
  model: string
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  cost_usd: number | null
  latency_ms: number | null
  is_revision: boolean
  revision_notes: string | null
  created_at: string
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
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'user_id'>>
      }
      briefs: {
        Row: Brief
        Insert: Omit<Brief, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Brief, 'id' | 'created_at'>>
      }
      technical_briefs: {
        Row: TechnicalBrief
        Insert: Omit<TechnicalBrief, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TechnicalBrief, 'id' | 'created_at'>>
      }
      brand_identity: {
        Row: BrandIdentity
        Insert: Omit<BrandIdentity, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BrandIdentity, 'id' | 'created_at'>>
      }
      storyboards: {
        Row: Storyboard
        Insert: Omit<Storyboard, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Storyboard, 'id' | 'created_at'>>
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
      ai_usage_logs: {
        Row: AiUsageLog
        Insert: Omit<AiUsageLog, 'id' | 'created_at'>
        Update: Partial<Omit<AiUsageLog, 'id' | 'created_at'>>
      }
    }
  }
}
