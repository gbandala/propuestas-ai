import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET
if (!INTERNAL_SECRET) throw new Error('INTERNAL_API_SECRET environment variable is required')

export async function POST(req: NextRequest) {
  if (req.headers.get('x-internal-secret') !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await req.json()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  )

  const zip = new JSZip()

  const { data: brief } = await supabase.from('briefs').select('content').eq('project_id', projectId).maybeSingle()
  if (brief?.content) zip.file('brief.md', brief.content)

  const { data: brand } = await supabase.from('brand_identity').select('markdown_content').eq('project_id', projectId).maybeSingle()
  if (brand?.markdown_content) zip.file('brand/identity.md', brand.markdown_content)

  const { data: storyboards } = await supabase.from('storyboards').select('content_md, type').eq('project_id', projectId).not('approved_at', 'is', null)
  for (const sb of storyboards ?? []) {
    zip.file(`storyboard-${sb.type}.md`, sb.content_md ?? '')
  }

  const { data: infographics } = await supabase.from('infographics').select('url, slide_index').eq('project_id', projectId).order('slide_index')
  const slidesFolder = zip.folder('slides')!
  for (const inf of infographics ?? []) {
    try {
      const res = await fetch(inf.url)
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        slidesFolder.file(`slide-${inf.slide_index}.png`, buffer)
      }
    } catch { /* continúa con los demás slides */ }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  const projectSlug = projectId.slice(0, 8)
  const zipKey = `projects/${projectId}/archive/propuesta-${projectSlug}.zip`

  const { error: uploadError } = await supabase.storage
    .from('project-assets')
    .upload(zipKey, zipBuffer, { contentType: 'application/zip', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('project-assets').getPublicUrl(zipKey)

  const { data: infoFiles } = await supabase.storage.from('project-assets').list(`projects/${projectId}/infographics`, { limit: 500 })
  const { data: brandFiles } = await supabase.storage.from('project-assets').list(`projects/${projectId}/brand`, { limit: 100 })

  const toDelete: string[] = [
    ...(infoFiles ?? []).map(f => `projects/${projectId}/infographics/${f.name}`),
    ...(brandFiles ?? []).map(f => `projects/${projectId}/brand/${f.name}`),
  ]

  if (toDelete.length > 0) {
    await supabase.storage.from('project-assets').remove(toDelete)
  }

  return NextResponse.json({ archiveUrl: publicUrl })
}
