'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProposalStore } from '../store/proposal.store'
import type { VariantStatus } from '../types'

interface GenerationJobUpdate {
  id: string
  status: string
  progress: number
  error: string | null
}

interface InfographicInsert {
  id: string
  slide_index: number | null
  url: string
}

/** Maps jobId → slideIndex for realtime progress updates */
export function useProposalJobProgress(
  projectId: string,
  jobIdToSlide: Record<string, number>
) {
  const { setSlideState } = useProposalStore()
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const jobIds = Object.keys(jobIdToSlide)

  useEffect(() => {
    if (!projectId || jobIds.length === 0) return

    const supabase = createClient()

    const channel = supabase
      .channel(`proposal-jobs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generation_jobs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const job = payload.new as GenerationJobUpdate
          const slideIndex = jobIdToSlide[job.id]
          if (!slideIndex) return
          setSlideState(slideIndex, {
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
          const inf = payload.new as InfographicInsert
          if (!inf.slide_index) return
          setSlideState(inf.slide_index, {
            infographicId: inf.id,
            imageUrl: inf.url,
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
  }, [projectId, jobIds.join(','), setSlideState]) // eslint-disable-line react-hooks/exhaustive-deps
}
