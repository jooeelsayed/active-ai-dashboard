import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import Sidebar from '@/components/layout/Sidebar'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const user = {
    name: session.user.name ?? 'مستخدم',
    email: session.user.email ?? '',
    role: session.user.role,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-navy-900">
      {/* Toaster */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e2535',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontFamily: 'var(--font-tajawal)',
            direction: 'rtl',
          },
          success: {
            iconTheme: { primary: '#a3e635', secondary: '#0d1117' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0d1117' },
          },
        }}
      />

      {/* Dashboard Shell (handles sidebar open/close state) */}
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    </div>
  )
}
