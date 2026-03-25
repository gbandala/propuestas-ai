import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import PptxGenJS from 'pptxgenjs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const type = searchParams.get('type') ?? 'technical'

  if (!projectId) {
    return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Nombre del proyecto para el archivo
  const { data: project } = await supabase
    .from('projects')
    .select('name, client_name')
    .eq('id', projectId)
    .single()

  const projectName = project?.name ?? 'Presentacion'
  const clientName = project?.client_name ?? ''

  // --- Flujo propuesta: infografías ordenadas por slide_index ---
  let slidesData: Array<{ slideNumber: number; url: string }>

  if (type === 'proposal') {
    const { data: infographics, error: infError } = await supabase
      .from('infographics')
      .select('slide_index, url')
      .eq('project_id', projectId)
      .not('slide_index', 'is', null)
      .not('url', 'is', null)
      .order('slide_index', { ascending: true })

    if (infError) return NextResponse.json({ error: infError.message }, { status: 500 })
    if (!infographics || infographics.length === 0) {
      return NextResponse.json({ error: 'No hay infografías generadas para este proyecto.' }, { status: 404 })
    }

    slidesData = infographics.map((inf) => ({
      slideNumber: inf.slide_index!,
      url: inf.url!,
    }))
  } else {
    // --- Flujo legacy: presentation_slides ---
    const { data: slides, error } = await supabase
      .from('presentation_slides')
      .select('slide_number, url')
      .eq('project_id', projectId)
      .eq('type', type)
      .order('slide_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: 'No hay slides generados para este proyecto.' }, { status: 404 })
    }

    slidesData = slides.map((s) => ({ slideNumber: s.slide_number, url: s.url }))
  }

  // Descargar imágenes en paralelo
  const imageBuffers = await Promise.all(
    slidesData.map(async (slide) => {
      const res = await fetch(slide.url)
      if (!res.ok) throw new Error(`Error descargando slide ${slide.slideNumber}`)
      const buf = await res.arrayBuffer()
      return { slideNumber: slide.slideNumber, buffer: buf }
    })
  )

  // Construir PPTX con dimensiones 1376x768 (aspect ratio de las imágenes)
  // PptxGenJS trabaja en pulgadas: 1376/96 ≈ 14.33" x 768/96 = 8"
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33" x 7.5" (16:9)
  pptx.author = 'PropuestasAI'
  pptx.company = clientName
  pptx.title = type === 'proposal'
    ? `${projectName} — Propuesta`
    : `${projectName} — Presentación Técnica`

  for (const { slideNumber, buffer } of imageBuffers.sort((a, b) => a.slideNumber - b.slideNumber)) {
    const slide = pptx.addSlide()
    // Convertir buffer a base64
    const base64 = Buffer.from(buffer).toString('base64')
    slide.addImage({
      data: `data:image/png;base64,${base64}`,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    })
  }

  // Generar como buffer
  const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer

  const suffix = type === 'proposal' ? 'propuesta' : 'tecnica'
  const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${suffix}.pptx`
  const uint8 = new Uint8Array(pptxBuffer)

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': uint8.length.toString(),
    },
  })
}
