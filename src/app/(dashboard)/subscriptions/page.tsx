'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react'
import {
  formatDate, formatCurrency, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, cn
} from '@/lib/utils'

export default function SubscriptionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [userRole, setUserRole] = useState('')

  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const paymentStatus = searchParams.get('paymentStatus') ?? ''
  const [searchInput, setSearchInput] = useState(search)

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (paymentStatus) params.set('paymentStatus', paymentStatus)
      params.set('page', String(page))
      const res = await fetch(`/api/subscriptions?${params}`)
      const data = await res.json()
      setSubscriptions(data.subscriptions ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch { toast.error('خطأ في التحميل') } finally { setLoading(false) }
  }, [search, status, paymentStatus, page])

  useEffect(() => { fetchSubs() }, [fetchSubs])
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => setUserRole(s?.user?.role ?? '')).catch(() => {})
  }, [])

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    params.set('page', '1')
    router.push(`/subscriptions?${params}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return
    const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); fetchSubs() }
    else toast.error('فشل الحذف')
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-cyan" />
            الاشتراكات
          </h1>
          <p className="text-slate-400 text-sm mt-1">إجمالي {total.toLocaleString('ar-EG')} اشتراك</p>
        </div>
        <div className="flex items-center gap-2">
          {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <button onClick={() => window.open('/api/export?type=subscriptions', '_blank')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">تصدير</span>
            </button>
          )}
          <Link href="/subscriptions/new" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة اشتراك
          </Link>
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleFilter('search', searchInput) }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="بحث بالعميل أو المنتج..." className="input-brand pr-9 py-2 text-sm" />
          </div>
          <button type="submit" className="btn-brand px-4 py-2 rounded-xl text-sm">بحث</button>
        </form>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={e => handleFilter('status', e.target.value)} className="input-brand py-1.5 text-xs w-auto min-w-[130px]">
            <option value="">كل الحالات</option>
            {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={paymentStatus} onChange={e => handleFilter('paymentStatus', e.target.value)} className="input-brand py-1.5 text-xs w-auto min-w-[130px]">
            <option value="">كل حالات الدفع</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-navy-700/40 rounded-xl animate-pulse" />)}</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg font-semibold">لا توجد اشتراكات</p>
            <Link href="/subscriptions/new" className="btn-brand inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4" />إضافة أول اشتراك
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">العميل / المنتج</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">المدة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">السعر</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الدفع</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {subscriptions.map((sub, i) => (
                  <motion.tr key={String(sub.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="table-row-hover">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${(sub.customer as { id: string })?.id}`} className="font-semibold text-slate-100 hover:text-brand-cyan transition-colors text-sm">
                        {String((sub.customer as { name: string })?.name)}
                      </Link>
                      <p className="text-xs text-slate-500">{String((sub.product as { name: string })?.name)} — {String((sub.product as { provider: string })?.provider)}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-slate-400">{formatDate(String(sub.startDate))}</p>
                      <p className="text-xs text-slate-500">→ {formatDate(String(sub.endDate))}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-brand-cyan">{formatCurrency(Number(sub.salePrice))}</p>
                      <p className="text-xs text-slate-500">ربح: {formatCurrency(Number(sub.salePrice) - Number(sub.costPrice))}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', SUBSCRIPTION_STATUS_COLORS[String(sub.status)])}>
                        {SUBSCRIPTION_STATUS_LABELS[String(sub.status)]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', PAYMENT_STATUS_COLORS[String(sub.paymentStatus)])}>
                        {PAYMENT_STATUS_LABELS[String(sub.paymentStatus)]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/subscriptions/${sub.id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                          <button onClick={() => handleDelete(String(sub.id))} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handleFilter('page', String(Math.max(1, page - 1)))} disabled={page === 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 bg-navy-700/60 border border-white/6 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300 px-3">صفحة {page} من {pages}</span>
          <button onClick={() => handleFilter('page', String(Math.min(pages, page + 1)))} disabled={page === pages}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 bg-navy-700/60 border border-white/6 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
