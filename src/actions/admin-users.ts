'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Acceso denegado')
  return user
}

export async function listUsers(): Promise<{ data: Array<{ id: string; email: string; role: string; created_at: string }> } | { error: string }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.listUsers()
    if (error) return { error: error.message }

    // Obtener roles de profiles
    const supabase = await createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role')

    const roleMap = new Map((profiles ?? []).map((p) => [p.id, p.role ?? 'user']))

    return {
      data: data.users.map((u) => ({
        id: u.id,
        email: u.email ?? '',
        role: roleMap.get(u.id) ?? 'user',
        created_at: u.created_at,
      })),
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function createUser(formData: FormData): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const parsed = CreateUserSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { data: created, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    })

    if (error) return { error: error.message }

    // Activar flag para forzar cambio de contraseña en primer login
    if (created.user) {
      const supabase = await createClient()
      await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', created.user.id)
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteUser(userId: string): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
