import { auth } from '@/lib/auth'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user

  return (
    <div className="space-y-6 page-enter">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black gradient-text-white">
          مرحباً، {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          هذه نظرة عامة على أداء شركة Active Ai اليوم
        </p>
      </div>

      {/* Dashboard Client (fetches data) */}
      <DashboardClient />
    </div>
  )
}
