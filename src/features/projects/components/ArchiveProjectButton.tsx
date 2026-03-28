'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { archiveProject } from '@/actions/projects'

interface ArchiveProjectButtonProps {
  projectId: string
  projectName: string
  status: string
}

export function ArchiveProjectButton({ projectId, projectName, status }: ArchiveProjectButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (status === 'archived') return null

  function handleClick() {
    const confirmed = window.confirm(
      `¿Archivar "${projectName}"? Se generará un ZIP descargable y se liberará el storage del bucket. Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await archiveProject(projectId)
      if ('error' in result) {
        alert(result.error)
        return
      }
      router.push('/dashboard')
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      {isPending ? 'Archivando...' : 'Archivar proyecto'}
    </button>
  )
}
