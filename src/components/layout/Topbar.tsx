'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, Menu, ChevronDown, LogOut, Settings, KeyRound } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Role } from '@prisma/client'
import NotificationBell from './NotificationBell'
import ChangePasswordModal from '@/components/ChangePasswordModal'

interface TopbarProps {
  user: {
    name: string
    email: string
    role: Role
  }
  onMenuToggle: () => void
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير عام',
  MANAGER: 'مدير',
  EMPLOYEE: 'موظف',
  READONLY: 'قراءة فقط',
}

export default function Topbar({ user, onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/customers?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const quickAddItems = [
    { label: 'إضافة عميل', href: '/customers/new', color: 'text-brand-cyan' },
    { label: 'إضافة اشتراك', href: '/subscriptions/new', color: 'text-brand-lime' },
    { label: 'إضافة دفعة', href: '/payments/new', color: 'text-blue-400' },
    ...(user.role === 'ADMIN' || user.role === 'MANAGER'
      ? [{ label: 'إضافة موظف', href: '/employees/new', color: 'text-purple-400' }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-16 bg-navy-800/80 backdrop-blur-xl border-b border-white/6">
      {/* Mobile Menu Toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن عميل أو اشتراك..."
            className="w-full bg-navy-700/60 border border-white/6 rounded-xl pr-9 pl-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-cyan/40 focus:bg-navy-700 transition-all"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 mr-auto">
        {/* Quick Add Button */}
        <div className="relative">
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex items-center gap-1.5 btn-brand px-3 py-2 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">إضافة سريعة</span>
          </button>

          <AnimatePresence>
            {quickAddOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setQuickAddOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-44 bg-navy-800 border border-white/8 rounded-xl shadow-card overflow-hidden z-50"
                >
                  {quickAddItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setQuickAddOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors',
                        item.color
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan to-brand-lime flex items-center justify-center">
              <span className="text-navy-900 text-sm font-black">{user.name.charAt(0)}</span>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-slate-100 leading-none">{user.name}</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">{ROLE_LABELS[user.role]}</p>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', userMenuOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-52 bg-navy-800 border border-white/8 rounded-xl shadow-card overflow-hidden z-50"
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-white/6">
                    <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  {user.role === 'ADMIN' && (
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      الإعدادات
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false)
                      setChangePasswordOpen(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                    تغيير كلمة المرور
                  </button>

                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </header>
  )
}
