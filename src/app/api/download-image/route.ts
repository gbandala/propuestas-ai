import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const filename = searchParams.get('filename') ?? 'imagen.png'

  if (!url) {
    return NextResponse.json({ error: 'url requerida' }, { status: 400 })
  }

  // Allowlist: solo URLs de Supabase Storage (previene SSRF)
  const ALLOWED_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\//
  if (!ALLOWED_URL.test(url)) {
    return NextResponse.json({ error: 'URL no permitida' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json({ error: 'No se pudo descargar la imagen' }, { status: 502 })
  }

  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  })
}
