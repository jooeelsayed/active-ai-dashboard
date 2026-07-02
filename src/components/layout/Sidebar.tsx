'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  RefreshCw,
  UserCog,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  ShoppingCart,
  ChevronLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@prisma/client'

interface SidebarProps {
  user: {
    name: string
    email: string
    role: Role
  }
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/customers', label: 'العملاء', icon: Users, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/subscriptions', label: 'الاشتراكات', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/payments', label: 'المدفوعات', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/renewals', label: 'التجديدات', icon: RefreshCw, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/products', label: 'المنتجات', icon: Package, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/employees', label: 'الموظفون', icon: UserCog, roles: ['ADMIN', 'MANAGER'] },
  { href: '/reports', label: 'التقارير', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY'] },
  { href: '/activity', label: 'سجل النشاط', icon: Activity, roles: ['ADMIN', 'MANAGER'] },
  { href: '/settings', label: 'الإعدادات', icon: Settings, roles: ['ADMIN'] },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير عام',
  MANAGER: 'مدير',
  EMPLOYEE: 'موظف',
  READONLY: 'قراءة فقط',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'text-brand-cyan',
  MANAGER: 'text-brand-lime',
  EMPLOYEE: 'text-blue-400',
  READONLY: 'text-slate-400',
}

export default function Sidebar({ user, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role))

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full z-50 flex flex-col',
          'bg-navy-800/95 backdrop-blur-xl border-l border-white/6',
          'w-64 transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:z-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/6">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
            <Image src="/logo.png" alt="Active Ai" width={40} height={40} className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-sm gradient-text truncate">Active Ai</h2>
            <p className="text-xs text-slate-500 truncate">نظام إدارة الاشتراكات</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-cyan to-brand-lime flex items-center justify-center flex-shrink-0">
              <span className="text-navy-900 text-sm font-black">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user.name}</p>
              <p className={cn('text-xs font-medium', ROLE_COLORS[user.role])}>
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-brand-lime flex-shrink-0 animate-pulse" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredNav.map((item, i) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    'sidebar-item',
                    isActive && 'sidebar-item-active font-semibold'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-brand-cyan' : 'text-slate-500'
                    )}
                  />
                  <span className={cn(isActive ? 'text-brand-cyan' : 'text-slate-300')}>
                    {item.label}
                  </span>
                  {isActive && (
                    <ChevronLeft className="w-3 h-3 text-brand-cyan mr-auto" />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
          <p className="text-xs text-slate-600 text-center mt-2">
            © {new Date().getFullYear()} Active Ai
          </p>
        </div>
      </aside>
    </>
  )
}
