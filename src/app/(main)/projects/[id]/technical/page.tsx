import { redirect } from 'next/navigation'

interface TechnicalPageProps {
  params: Promise<{ id: string }>
}

// Ruta legacy — redirige al nuevo brief unificado
export default async function TechnicalBriefPage({ params }: TechnicalPageProps) {
  const { id } = await params
  redirect(`/projects/${id}/brief`)
}
