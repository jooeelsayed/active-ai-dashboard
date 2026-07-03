'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, AlertTriangle, Clock, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { differenceInDays } from 'date-fns'

interface NotifSub {
  id: string
  endDate: string
  customer: { id: string; name: string }
  product: { name: string }
}

interface NotificationsData {
  total: number
  expiredNow: NotifSub[]
  expireToday: NotifSub[]
  expireIn7: NotifSub[]
}

function daysLeft(date: string) {
  return differenceInDays(new Date(date), new Date())
}

function NotifRow({ sub, urgent }: { sub: NotifSub; urgent: 'expired' | 'today' | 'soon' }) {
  const days = daysLeft(sub.endDate)
  return (
    <Link
      href={`/subscriptions/${sub.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-white/4 transition-colors group"
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
        urgent === 'expired' ? 'bg-red-500/15' :
        urgent === 'today' ? 'bg-orange-500/15' :
        'bg-yellow-500/15'
      )}>
        {urgent === 'expired' ? (
          <AlertTriangle className="w-4 h-4 text-red-400" />
        ) : urgent === 'today' ? (
          <Clock className="w-4 h-4 text-orange-400" />
        ) : (
          <Clock className="w-4 h-4 text-yellow-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
          {sub.customer.name}
        </p>
        <p className="text-xs text-slate-500 truncate">{sub.product.name}</p>
        <p className={cn(
          'text-xs font-medium mt-0.5',
          urgent === 'expired' ? 'text-red-400' :
          urgent === 'today' ? 'text-orange-400' :
          'text-yellow-400'
        )}>
          {urgent === 'expired'
            ? `انتهى منذ ${Math.abs(days)} يوم`
            : urgent === 'today'
            ? 'ينتهي اليوم!'
            : `ينتهي خلال ${days} يوم — ${formatDate(sub.endDate)}`}
        </p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
    </Link>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationsData | null>(null)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  // Fetch on mount + every 5 minutes
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const count = data?.total ?? 0
  const hasUrgent = (data?.expiredNow.length ?? 0) + (data?.expireToday.length ?? 0) > 0

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'relative p-2 rounded-xl transition-all',
          open
            ? 'text-white bg-white/10'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        )}
        aria-label="الإشعارات"
      >
        <Bell className={cn('w-5 h-5 transition-transform', open && 'scale-110')} />
        {count > 0 && (
          <span className={cn(
            'absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-navy-800',
            hasUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-navy-900'
          )}>
            {count > 99 ? '99+' : count}
          </span>
        )}
        {count === 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-slate-600 rounded-full" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-80 bg-navy-800 border border-white/8 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden z-50"
            style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-cyan" />
                <h3 className="text-sm font-bold text-white">الإشعارات</h3>
                {count > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-md text-xs font-bold',
                    hasUrgent ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {count}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  title="تحديث"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {loading && !data ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-slate-600 animate-spin mx-auto" />
                </div>
              ) : count === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">كل الاشتراكات بخير!</p>
                  <p className="text-xs text-slate-600 mt-1">لا توجد اشتراكات منتهية أو قريبة من الانتهاء</p>
                </div>
              ) : (
                <>
                  {/* Expired */}
                  {(data?.expiredNow?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-red-500/8 border-b border-red-500/15">
                        <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          منتهية ({data!.expiredNow.length})
                        </p>
                      </div>
                      {data!.expiredNow.map(sub => (
                        <NotifRow key={sub.id} sub={sub} urgent="expired" />
                      ))}
                    </div>
                  )}

                  {/* Today */}
                  {(data?.expireToday?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-orange-500/8 border-b border-orange-500/15">
                        <p className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          تنتهي اليوم ({data!.expireToday.length})
                        </p>
                      </div>
                      {data!.expireToday.map(sub => (
                        <NotifRow key={sub.id} sub={sub} urgent="today" />
                      ))}
                    </div>
                  )}

                  {/* Within 7 days */}
                  {(data?.expireIn7?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-yellow-500/8 border-b border-yellow-500/15">
                        <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          تنتهي خلال 7 أيام ({data!.expireIn7.length})
                        </p>
                      </div>
                      {data!.expireIn7.map(sub => (
                        <NotifRow key={sub.id} sub={sub} urgent="soon" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {count > 0 && (
              <div className="border-t border-white/8 px-4 py-3 flex-shrink-0">
                <Link
                  href="/renewals"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 text-xs text-brand-cyan hover:text-white font-semibold transition-colors"
                >
                  عرض كل التجديدات
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
