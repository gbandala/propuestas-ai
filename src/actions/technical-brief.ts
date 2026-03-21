'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateBriefMarkdown } from '@/features/technical-brief/services/brief-generator'
import type { TechnicalBrief } from '@/types/database'
import type { StepData } from '@/features/technical-brief/types'

const SaveStepSchema = z.object({
  projectId: z.string().uuid(),
  step: z.number().int().min(1).max(8),
  data: z.record(z.string(), z.unknown()),
})

export async function getTechnicalBrief(
  projectId: string
): Promise<{ data: TechnicalBrief } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('technical_briefs')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error && error.code !== 'PGRST116') return { error: error.message }

  // Si no existe, crear uno nuevo
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('technical_briefs')
      .insert({ project_id: projectId, step_data: {}, current_step: 1 })
      .select()
      .single()

    if (createError) return { error: createError.message }
    return { data: created }
  }

  return { data }
}

export async function saveBriefStep(
  projectId: string,
  step: number,
  stepData: Record<string, unknown>
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const parsed = SaveStepSchema.safeParse({ projectId, step, data: stepData })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Cargar step_data existente
  const { data: existing } = await supabase
    .from('technical_briefs')
    .select('step_data')
    .eq('project_id', projectId)
    .single()

  const currentStepData = (existing?.step_data as StepData) ?? {}
  const stepKey = `step${step}` as keyof StepData
  const updatedStepData = { ...currentStepData, [stepKey]: stepData }

  const { error } = await supabase
    .from('technical_briefs')
    .upsert(
      {
        project_id: projectId,
        step_data: updatedStepData,
        current_step: Math.max(step, existing ? 1 : step),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    )

  if (error) return { error: error.message }
  return { success: true }
}

export async function generateBrief(
  projectId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Cargar datos del proyecto y brief
  const [projectResult, briefResult] = await Promise.all([
    supabase.from('projects').select('name, client_name').eq('id', projectId).single(),
    supabase.from('technical_briefs').select('*').eq('project_id', projectId).single(),
  ])

  if (projectResult.error) return { error: projectResult.error.message }
  if (briefResult.error) return { error: briefResult.error.message }

  const stepData = briefResult.data.step_data as StepData
  const generatedBrief = generateBriefMarkdown(stepData, projectResult.data.name)

  const updatedStepData = { ...stepData, generatedBrief }
  const now = new Date().toISOString()

  // Guardar brief + marcar como generado
  const { error: updateError } = await supabase
    .from('technical_briefs')
    .update({
      step_data: updatedStepData,
      generated_at: now,
      updated_at: now,
    })
    .eq('project_id', projectId)

  if (updateError) return { error: updateError.message }

  // Actualizar technical_completed_at en projects
  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      technical_completed_at: now,
      status: 'in_progress',
      updated_at: now,
    })
    .eq('id', projectId)

  if (projectUpdateError) return { error: projectUpdateError.message }

  // Upsert brand_specs si hay datos del paso 8
  const step8 = stepData.step8
  if (step8) {
    await supabase
      .from('brand_specs')
      .upsert(
        {
          project_id: projectId,
          logo_url: step8.logoUrl,
          primary_color: step8.primaryColor,
          secondary_color: step8.secondaryColor,
          accent_color: step8.accentColor,
          updated_at: now,
        },
        { onConflict: 'project_id' }
      )
  }

  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}`)
}
