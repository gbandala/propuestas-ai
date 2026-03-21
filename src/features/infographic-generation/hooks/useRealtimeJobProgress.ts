'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInfographicStore } from '../store/infographic.store'
import type { TechnicalVariant, VariantStatus } from '../types'

interface GenerationJob {
  id: string
  project_id: string
  type: string
  status: string
  progress: number
  error: string | null
}

interface InfographicRecord {
  id: string
  project_id: string
  type: string
  variant: number
  url: string
  selected: boolean
}

export function useRealtimeJobProgress(
  projectId: string,
  jobIds: string[]
) {
  const { setVariantState } = useInfographicStore()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!projectId || jobIds.length === 0) return

    const supabase = createClient()

    // Subscribe to generation_jobs changes for these job IDs
    const channel = supabase
      .channel(`infographic-jobs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generation_jobs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const job = payload.new as GenerationJob
          if (!jobIds.includes(job.id)) return

          const jobIndex = jobIds.indexOf(job.id)
          const variant = (jobIndex + 1) as TechnicalVariant

          setVariantState(variant, {
            status: job.status as VariantStatus,
            progress: job.progress ?? 0,
            error: job.error ?? null,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'infographics',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const infographic = payload.new as InfographicRecord
          if (infographic.type !== 'technical') return

          const variant = infographic.variant as TechnicalVariant
          setVariantState(variant, {
            infographicId: infographic.id,
            imageUrl: infographic.url,
            status: 'completed',
            progress: 100,
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, jobIds, setVariantState])
}
