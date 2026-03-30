import { ProjectList } from '@/features/projects/components'

export default async function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <ProjectList />
    </div>
  )
}
