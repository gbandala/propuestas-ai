/**
 * DEV ONLY — endpoint para crear usuario de prueba
 * POST /api/dev/seed → crea DEV_SEED_EMAIL / DEV_SEED_PASSWORD (desde .env.local)
 * Solo funciona si NODE_ENV !== 'production'
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEST_EMAIL = process.env.DEV_SEED_EMAIL ?? 'test@propuestasai.dev'
const TEST_PASSWORD = process.env.DEV_SEED_PASSWORD

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  if (!TEST_PASSWORD) {
    return NextResponse.json(
      { error: 'DEV_SEED_PASSWORD not set in .env.local' },
      { status: 500 }
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not set in .env.local' },
      { status: 500 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Buscar si ya existe
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find((u) => u.email === TEST_EMAIL)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Crear usuario sin confirmación de email
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  }

  // Upsert profile con role architect
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: TEST_EMAIL,
      full_name: 'Test Architect',
      role: 'architect',
    })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ ok: true, email: TEST_EMAIL, userId })
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  return NextResponse.json({ email: TEST_EMAIL })
}
