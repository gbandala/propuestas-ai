'use client'

import { useState } from 'react'
import { updateProjectStatus } from '@/actions/projects'

interface DownloadPptButtonProps {
  projectId: string
}

export function DownloadPptButton({ projectId }: DownloadPptButtonProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    // Marcar proyecto como completado
    await updateProjectStatus(projectId, 'completed')
    // Disparar la descarga
    const link = document.createElement('a')
    link.href = `/api/presentation/download-pptx?projectId=${projectId}&type=proposal`
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setDownloading(false)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
    >
      {downloading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Generando...
        </>
      ) : (
        <>
          Descargar PPT &rarr;
        </>
      )}
    </button>
  )
}
