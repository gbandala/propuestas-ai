'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const LoginSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
})

const SignupSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
})

const ResetPasswordSchema = z.object({
  email: z.string().email('Email inválido').max(254),
})

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
})

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
})

export async function login(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/check-email')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const parsed = ResetPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const parsed = UpdatePasswordSchema.safeParse({ password: formData.get('password') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: error.message }
  }

  // Limpiar flag de cambio forzado si estaba activo
  if (user) {
    await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function updateProfile(formData: FormData) {
  const parsed = UpdateProfileSchema.safeParse({ full_name: formData.get('full_name') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
