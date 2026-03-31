import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const INTERNAL_ROUTES = [
  '/api/infographics/generate',
  '/api/brand/generate-image',
  '/api/presentation/generate-slide',
  '/api/projects/archive',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Proteger rutas internas — solo accesibles desde el propio servidor
  if (INTERNAL_ROUTES.some(route => pathname.startsWith(route))) {
    const secret = request.headers.get('x-internal-secret')
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
