export type StoryboardType = 'technical' | 'commercial'
export type StoryboardStatus = 'idle' | 'generating' | 'ready' | 'approved'

export interface StoryboardData {
  id: string
  project_id: string
  type: StoryboardType
  content_md: string
  version: number
  approved_at: string | null
  created_at: string
  updated_at: string
}
