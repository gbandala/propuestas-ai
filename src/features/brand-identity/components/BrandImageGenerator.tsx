'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { BrandVariantCard } from './BrandVariantCard'
import {
  createBrandGenerationJobs,
  getBrandJobStatuses,
  getBrandVariants,
  selectBrandVariant,
  discardBrandVariants,
  uploadBrandImage,
  removeBrandImage,
} from '@/actions/brand-identity'
import type { BrandVariant } from '@/actions/brand-identity'

interface VariantState {
  variantIndex: 1 | 2 | 3
  jobId: string | null
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  imageUrl: string | null
  error: string | null
}

const IDLE: VariantState = { variantIndex: 1, jobId: null, status: 'idle', progress: 0, imageUrl: null, error: null }

interface BrandImageGeneratorProps {
  projectId: string
  imageType: 'logo' | 'background'
  currentUrl: string | null
  initialVariants: BrandVariant[]
  suggestedPrompt: string
  onCurrentUrlChange: (url: string | null) => void
}

const POLL_INTERVAL = 3000

export function BrandImageGenerator({
  projectId, imageType, currentUrl, initialVariants, suggestedPrompt, onCurrentUrlChange,
}: BrandImageGeneratorProps) {
  const [prompt, setPrompt] = useState(suggestedPrompt)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState<string | null>(null)
  const [variants, setVariants] = useState<VariantState[]>(() => {
    if (initialVariants.length > 0) {
      return ([1, 2, 3] as const).map((idx) => {
        const v = initialVariants.find((iv) => iv.variantIndex === idx)
        return {
          variantIndex: idx,
          jobId: null,
          status: v ? 'completed' : 'idle',
          progress: v ? 100 : 0,
          imageUrl: v?.url ?? null,
          error: null,
        }
      })
    }
    return ([1, 2, 3] as const).map((idx) => ({ ...IDLE, variantIndex: idx }))
  })
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingCurrent, startUploadTransition] = useTransition()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refFileInput = useRef<HTMLInputElement>(null)
  const uploadFileInput = useRef<HTMLInputElement>(null)
  const userTokenRef = useRef<string>('')

  // Get user token for API calls
  useEffect(() => {
    async function getToken() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      userTokenRef.current = session?.access_token ?? ''
    }
    getToken()
  }, [])

  // Start/stop polling
  useEffect(() => {
    const hasActive = variants.some((v) => v.status === 'pending' || v.status === 'running')
    if (hasActive) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(poll, POLL_INTERVAL)
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants])

  async function poll() {
    const activeJobIds = variants.filter((v) => v.jobId && (v.status === 'pending' || v.status === 'running')).map((v) => v.jobId!)
    if (!activeJobIds.length) return

    const result = await getBrandJobStatuses(activeJobIds)
    if ('error' in result) return

    const completedJobIds = result.data.filter((j) => j.status === 'completed').map((j) => j.id)
    const hasNewCompleted = completedJobIds.some((id) => variants.find((v) => v.jobId === id && v.status !== 'completed'))

    // Update statuses
    setVariants((prev) =>
      prev.map((v) => {
        if (!v.jobId) return v
        const job = result.data.find((j) => j.id === v.jobId)
        if (!job) return v
        return { ...v, status: job.status as VariantState['status'], progress: job.progress }
      })
    )

    // Fetch updated URLs for newly completed variants
    if (hasNewCompleted) {
      const variantsResult = await getBrandVariants(projectId, imageType)
      if ('data' in variantsResult) {
        setVariants((prev) =>
          prev.map((v) => {
            const completed = variantsResult.data.find((bv) => bv.variantIndex === v.variantIndex)
            if (completed?.url && v.status === 'completed') {
              return { ...v, imageUrl: completed.url, status: 'completed', progress: 100 }
            }
            // re-check from job result
            const job = result.data.find((j) => j.id === v.jobId)
            if (job?.status === 'completed' && completed?.url) {
              return { ...v, imageUrl: completed.url, status: 'completed', progress: 100 }
            }
            if (job?.status === 'failed') {
              return { ...v, status: 'failed', error: job.error, progress: 0 }
            }
            return v
          })
        )
      }
    }
  }

  function handleReferenceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReferenceFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setReferencePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleGenerate() {
    if (!prompt.trim()) return
    setGenerating(true)
    setMessage(null)

    // Convert reference image to base64 if present
    let referenceBase64: { data: string; mimeType: string } | null = null
    if (referenceFile) {
      const arrayBuffer = await referenceFile.arrayBuffer()
      referenceBase64 = {
        data: Buffer.from(arrayBuffer).toString('base64'),
        mimeType: referenceFile.type,
      }
    }

    // Create 3 jobs in DB
    const jobsResult = await createBrandGenerationJobs(projectId, imageType)
    if ('error' in jobsResult) {
      setMessage({ type: 'error', text: jobsResult.error })
      setGenerating(false)
      return
    }

    // Set all variants to pending
    const newVariants: VariantState[] = jobsResult.data.map(({ jobId, variantIndex }) => ({
      variantIndex,
      jobId,
      status: 'pending' as const,
      progress: 0,
      imageUrl: null,
      error: null,
    }))
    setVariants(newVariants)
    setSelectedUrl(null)
    setGenerating(false)
    setReferenceFile(null)
    setReferencePreview(null)

    // Fire 3 generation requests (fire and forget)
    const baseUrl = window.location.origin
    jobsResult.data.forEach(({ jobId, variantIndex }) => {
      fetch(`${baseUrl}/api/brand/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': 'propuestasai-internal',
          'x-user-token': userTokenRef.current,
        },
        body: JSON.stringify({ projectId, jobId, imageType, variantIndex, prompt, referenceBase64 }),
      }).catch(console.error)
    })
  }

  async function handleRetry(variantIndex: 1 | 2 | 3, comment: string) {
    const existingJob = variants.find((v) => v.variantIndex === variantIndex)

    // Create a single new job
    const jobsResult = await createBrandGenerationJobs(projectId, imageType)
    if ('error' in jobsResult) {
      setMessage({ type: 'error', text: jobsResult.error })
      return
    }
    const { jobId } = jobsResult.data.find((j) => j.variantIndex === variantIndex) ?? jobsResult.data[variantIndex - 1]

    setVariants((prev) =>
      prev.map((v) =>
        v.variantIndex === variantIndex
          ? { ...v, jobId, status: 'pending', progress: 0, error: null }
          : v
      )
    )

    const adjustedPrompt = comment ? `${prompt}\n\nAJUSTE SOLICITADO: ${comment}` : prompt
    const baseUrl = window.location.origin
    fetch(`${baseUrl}/api/brand/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': 'propuestasai-internal',
        'x-user-token': userTokenRef.current,
      },
      body: JSON.stringify({ projectId, jobId, imageType, variantIndex, prompt: adjustedPrompt }),
    }).catch(console.error)

    void existingJob // suppress unused warning
  }

  async function handleSelect(url: string) {
    const allUrls = variants.map((v) => v.imageUrl).filter(Boolean) as string[]
    const result = await selectBrandVariant(projectId, imageType, url, allUrls)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
      return
    }
    setSelectedUrl(url)
    onCurrentUrlChange(url)
    setVariants(([1, 2, 3] as const).map((idx) => ({ ...IDLE, variantIndex: idx })))
    setMessage({ type: 'success', text: `${imageType === 'logo' ? 'Logo' : 'Fondo'} actualizado correctamente.` })
  }

  async function handleDiscard() {
    const result = await discardBrandVariants(projectId, imageType)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
      return
    }
    setVariants(([1, 2, 3] as const).map((idx) => ({ ...IDLE, variantIndex: idx })))
    setSelectedUrl(null)
  }

  function handleUploadCurrent(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const formData = new FormData()
    formData.append('file', file)
    startUploadTransition(async () => {
      const result = await uploadBrandImage(projectId, formData, imageType)
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error })
      } else {
        onCurrentUrlChange(result.url)
        setMessage({ type: 'success', text: 'Imagen actualizada.' })
      }
    })
  }

  async function handleRemoveCurrent() {
    startUploadTransition(async () => {
      const result = await removeBrandImage(projectId, imageType)
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error })
      } else {
        onCurrentUrlChange(null)
      }
    })
  }

  const hasVariants = variants.some((v) => v.status !== 'idle')
  const anyActive = variants.some((v) => v.status === 'pending' || v.status === 'running')
  const label = imageType === 'logo' ? 'Logo' : 'Fondo de slides'
  const dimensions = imageType === 'logo' ? '350×90px · PNG transparente' : '1376×768px · 16:9'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-400">{dimensions}</p>
        </div>
        {currentUrl && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt="Actual"
              className="h-10 rounded border border-gray-200 object-contain px-1"
              style={imageType === 'logo' ? { background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%) 0 0 / 8px 8px' } : {}}
            />
            <span className="text-xs text-green-600 font-medium">Imagen activa</span>
          </div>
        )}
      </div>

      {message && (
        <div className={`rounded-md px-3 py-2 text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Prompt + reference */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Describe el {imageType === 'logo' ? 'logo' : 'fondo'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder={imageType === 'logo' ? 'Logo minimalista, símbolo geométrico simple...' : 'Fondo corporativo abstracto, tonos azules...'}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Imagen de referencia <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          {referencePreview ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referencePreview} alt="Referencia" className="h-14 w-auto rounded border border-gray-200 object-contain" />
              <div>
                <p className="text-xs text-gray-600">{referenceFile?.name}</p>
                <button onClick={() => { setReferenceFile(null); setReferencePreview(null) }} className="text-xs text-red-500 hover:text-red-700">
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => refFileInput.current?.click()}
              className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors w-full"
            >
              <span>📎</span> Subir imagen de referencia (PNG, JPG)
            </button>
          )}
          <input ref={refFileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleReferenceChange} />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleGenerate}
            disabled={generating || anyActive || !prompt.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {anyActive ? 'Generando...' : generating ? 'Iniciando...' : '✦ Generar 3 versiones'}
          </button>
          {hasVariants && !anyActive && (
            <button
              onClick={handleDiscard}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
              title="Descartar variantes"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Variants grid */}
      {hasVariants && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase text-gray-400">Versiones generadas</p>
          <div className="grid grid-cols-3 gap-3">
            {variants.map((v) => (
              <BrandVariantCard
                key={v.variantIndex}
                variantIndex={v.variantIndex}
                imageUrl={v.imageUrl}
                status={v.status}
                progress={v.progress}
                error={v.error}
                isSelected={selectedUrl === v.imageUrl && !!v.imageUrl}
                imageType={imageType}
                onSelect={handleSelect}
                onRetry={handleRetry}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            Si no eliges ninguna, la imagen activa actual se mantiene.
          </p>
        </div>
      )}

      {/* Upload own image */}
      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs text-gray-400">O sube tu propia imagen</p>
        <div className="flex gap-2">
          <button
            onClick={() => uploadFileInput.current?.click()}
            disabled={uploadingCurrent}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploadingCurrent ? 'Subiendo...' : currentUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {currentUrl && (
            <button
              onClick={handleRemoveCurrent}
              disabled={uploadingCurrent}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar
            </button>
          )}
        </div>
        <input
          ref={uploadFileInput}
          type="file"
          accept={imageType === 'logo' ? 'image/png,image/svg+xml,image/jpeg,image/webp' : 'image/png,image/jpeg,image/webp'}
          className="hidden"
          onChange={handleUploadCurrent}
        />
      </div>
    </div>
  )
}
