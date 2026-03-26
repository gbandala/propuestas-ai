'use client'

import { useEffect, useRef } from 'react'
import { useProposalStore } from '../store/proposal.store'
import { getProposalInfographics } from '@/actions/infographics'
import type { VariantStatus } from '../types'

const POLL_INTERVAL = 3000 // 3 seconds

/** Polling-based progress tracker for proposal infographic generation.
 *  Replaces Realtime which has a race condition with fast jobs. */
export function useProposalJobProgress(
  projectId: string,
  jobIdToSlide: Record<string, number>
) {
  const { setSlideState } = useProposalStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIds = Object.keys(jobIdToSlide)

  useEffect(() => {
    if (!projectId || jobIds.length === 0) return

    async function poll() {
      const result = await getProposalInfographics(projectId)
      if ('error' in result) return

      const { jobs, infographics } = result.data

      // Slides with active jobs — must not be overridden by stale infographic data
      const activeSlidess = new Set(
        jobs
          .filter((j) => j.status === 'pending' || j.status === 'running')
          .map((j) => j.slide_number)
          .filter(Boolean)
      )

      // Update job statuses (pending / running / failed)
      for (const job of jobs) {
        if (!job.slide_number) continue
        setSlideState(job.slide_number, {
          status: job.status as VariantStatus,
          progress: job.progress ?? 0,
          error: job.error ?? null,
        })
      }

      // Update completed infographics — skip slides that still have an active job
      // (the old infographic row still exists in DB while the new one is generating)
      for (const inf of infographics) {
        if (inf.slide_index == null) continue
        if (activeSlidess.has(inf.slide_index)) continue
        setSlideState(inf.slide_index, {
          infographicId: inf.id,
          imageUrl: inf.url,
          status: 'completed',
          progress: 100,
          error: null,
        })
      }

      // Stop polling when no jobs are active (pending or running)
      const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'running')
      if (!hasActive) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    // Poll immediately then every POLL_INTERVAL ms
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [projectId, jobIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
}
