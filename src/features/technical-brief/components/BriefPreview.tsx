'use client'

interface BriefPreviewProps {
  markdown: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  isGenerating: boolean
}

export function BriefPreview({ markdown, onConfirm, onCancel, isGenerating }: BriefPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative flex w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Preview del Brief Técnico</h2>
            <p className="text-sm text-gray-500">Revisa el documento antes de confirmar.</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800 bg-gray-50 rounded-lg p-4">
            {markdown}
          </pre>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </button>
          <button
            onClick={onConfirm}
            disabled={isGenerating}
            className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isGenerating ? 'Guardando y redirigiendo...' : '✓ Confirmar y guardar brief'}
          </button>
        </div>
      </div>
    </div>
  )
}
