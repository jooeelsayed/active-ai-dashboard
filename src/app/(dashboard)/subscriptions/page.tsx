'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ShoppingCart, Plus, Search, Eye, Edit2, Trash2,
  ChevronLeft, ChevronRight, Download, RefreshCw,
  CheckCircle2, Clock, XCircle, AlertTriangle, Settings2,
  CheckSquare, Square, Minus, ChevronDown
} from 'lucide-react'
import {
  formatDate, formatCurrency,
  SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  PRODUCT_CATEGORY_LABELS, cn
} from '@/lib/utils'

const CATEGORY_TABS = [
  { key: '', label: 'الكل', emoji: '🌐' },
  { key: 'CHATBOT', label: 'شات بوت', emoji: '🤖' },
  { key: 'DESIGN', label: 'تصميم', emoji: '🎨' },
  { key: 'VIDEO', label: 'فيديو', emoji: '🎬' },
  { key: 'AUDIO', label: 'صوت', emoji: '🎵' },
  { key: 'PRODUCTIVITY', label: 'إنتاجية', emoji: '⚡' },
  { key: 'CODING', label: 'برمجة', emoji: '💻' },
  { key: 'OTHER', label: 'أخرى', emoji: '📦' },
]

const STATUS_CHIPS = [
  { key: '', label: 'كل الحالات', icon: null, color: 'text-slate-400 bg-white/5 border-white/10 hover:border-white/20' },
  { key: 'ACTIVE', label: 'نشط', icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/25 hover:border-green-500/50' },
  { key: 'EXPIRING_SOON', label: 'ينتهي قريباً', icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25 hover:border-yellow-500/50' },
  { key: 'EXPIRED', label: 'منتهي', icon: XCircle, color: 'text-red-400 bg-red-500/10 border-red-500/25 hover:border-red-500/50' },
  { key: 'PENDING_SETUP', label: 'في انتظار الإعداد', icon: Clock, color: 'text-blue-400 bg-blue-500/10 border-blue-500/25 hover:border-blue-500/50' },
  { key: 'CANCELLED', label: 'ملغي', icon: Settings2, color: 'text-gray-400 bg-gray-500/10 border-gray-500/25 hover:border-gray-500/50' },
]

export default function SubscriptionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [userRole, setUserRole] = useState('')

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const paymentStatus = searchParams.get('paymentStatus') ?? ''
  const category = searchParams.get('category') ?? ''
  const [searchInput, setSearchInput] = useState(search)

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (paymentStatus) params.set('paymentStatus', paymentStatus)
      if (category) params.set('category', category)
      params.set('page', String(page))
      const res = await fetch(`/api/subscriptions?${params}`)
      const data = await res.json()
      setSubscriptions(data.subscriptions ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch { toast.error('خطأ في التحميل') } finally { setLoading(false) }
  }, [search, status, paymentStatus, category, page])

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

  // Bulk selection helpers
  const allIds = subscriptions.map(s => String(s.id))
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return
    setShowBulkMenu(false)

    if (action === 'delete') {
      if (!confirm(`هل أنت متأكد من حذف ${selected.size} اشتراك؟`)) return
    }

    setBulkLoading(true)
    try {
      const payload: Record<string, unknown> = { ids: Array.from(selected), action }
      if (action.startsWith('status_')) payload.action = 'update_status', payload.status = action.replace('status_', '')
      if (action.startsWith('payment_')) payload.action = 'update_payment', payload.paymentStatus = action.replace('payment_', '')

      const res = await fetch('/api/subscriptions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`تم تطبيق الإجراء على ${data.affected} اشتراك`)
        fetchSubs()
      } else toast.error(data.error ?? 'فشل الإجراء')
    } catch { toast.error('حدث خطأ') } finally { setBulkLoading(false) }
  }

  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER'
  const hasActiveFilters = status || paymentStatus || category || search

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-cyan" />
            الاشتراكات
          </h1>
          <p className="text-slate-400 text-sm mt-1">إجمالي {total.toLocaleString('ar-EG')} اشتراك</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => window.open('/api/export?type=subscriptions', '_blank')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">تصدير</span>
            </button>
          )}
          <Link href={`/subscriptions/new${category ? `?category=${category}` : ''}`}
            className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة اشتراك
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card p-3 flex items-center gap-3 border border-brand-cyan/20 bg-brand-cyan/5"
          >
            <span className="text-sm font-bold text-brand-cyan">تم تحديد {selected.size}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status updates */}
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 hover:bg-white/12 border border-white/12 text-slate-300 transition-all"
                >
                  تغيير الحالة <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showBulkMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowBulkMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full mt-1 right-0 bg-navy-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px]"
                      >
                        <p className="px-3 py-1.5 text-xs text-slate-500 border-b border-white/6">حالة الاشتراك</p>
                        {[['status_ACTIVE', 'نشط'], ['status_EXPIRED', 'منتهي'], ['status_CANCELLED', 'ملغي'], ['status_PENDING_SETUP', 'في انتظار الإعداد']].map(([k, v]) => (
                          <button key={k} onClick={() => handleBulkAction(k)}
                            className="w-full text-right px-3 py-2 text-sm text-slate-300 hover:bg-white/6 hover:text-white transition-colors">{v}</button>
                        ))}
                        <p className="px-3 py-1.5 text-xs text-slate-500 border-t border-b border-white/6">حالة الدفع</p>
                        {[['payment_PAID', 'مدفوع'], ['payment_UNPAID', 'غير مدفوع'], ['payment_PARTIALLY_PAID', 'مدفوع جزئياً']].map(([k, v]) => (
                          <button key={k} onClick={() => handleBulkAction(k)}
                            className="w-full text-right px-3 py-2 text-sm text-slate-300 hover:bg-white/6 hover:text-white transition-colors">{v}</button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {canEdit && (
                <button onClick={() => handleBulkAction('delete')} disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-all disabled:opacity-60">
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف المحدد
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map(tab => (
          <button key={tab.key} onClick={() => handleFilter('category', tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all flex-shrink-0',
              category === tab.key
                ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50'
                : 'text-slate-400 bg-white/4 border-white/8 hover:bg-white/8 hover:text-slate-200'
            )}>
            <span>{tab.emoji}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleFilter('search', searchInput) }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="بحث بالعميل أو المنتج..." className="input-brand pr-9 py-2 text-sm" />
          </div>
          <button type="submit" className="btn-brand px-4 py-2 rounded-xl text-sm">بحث</button>
          {hasActiveFilters && (
            <button type="button" onClick={() => router.push('/subscriptions')}
              className="px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all" title="مسح الفلاتر">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </form>
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map(chip => {
            const Icon = chip.icon
            return (
              <button key={chip.key} onClick={() => handleFilter('status', chip.key)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all', chip.color,
                  status === chip.key && 'ring-1 ring-current')}>
                {Icon && <Icon className="w-3 h-3" />}
                {chip.label}
                {status === chip.key && chip.key && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2 pt-1 border-t border-white/6">
          <select value={paymentStatus} onChange={e => handleFilter('paymentStatus', e.target.value)} className="input-brand py-1.5 text-xs w-auto min-w-[140px]">
            <option value="">كل حالات الدفع</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-navy-700/40 rounded-xl animate-pulse" />)}</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg font-semibold">لا توجد اشتراكات</p>
            {hasActiveFilters && <button onClick={() => router.push('/subscriptions')} className="mt-3 text-sm text-brand-cyan hover:underline">مسح الفلاتر</button>}
            <Link href="/subscriptions/new" className="btn-brand inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4" />إضافة أول اشتراك
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  {/* Select All */}
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleAll} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-brand-cyan" /> :
                        someSelected ? <Minus className="w-4 h-4 text-brand-cyan" /> :
                        <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">العميل / المنتج</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">التصنيف</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">المدة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">السعر</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الدفع</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {subscriptions.map((sub, i) => {
                  const subId = String(sub.id)
                  const isSelected = selected.has(subId)
                  return (
                    <motion.tr key={subId}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className={cn('table-row-hover', isSelected && 'bg-brand-cyan/5')}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleOne(subId)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-brand-cyan" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/customers/${(sub.customer as { id: string })?.id}`} className="font-semibold text-slate-100 hover:text-brand-cyan transition-colors text-sm">
                          {String((sub.customer as { name: string })?.name)}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {String((sub.product as { name: string })?.name)} — {String((sub.product as { provider: string })?.provider)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-brand-cyan/8 text-brand-cyan border border-brand-cyan/15">
                          {PRODUCT_CATEGORY_LABELS[String((sub.product as { category: string })?.category)] ?? '—'}
                        </span>
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
                        <button onClick={() => handleFilter('status', status === String(sub.status) ? '' : String(sub.status))}
                          className={cn('badge text-xs cursor-pointer hover:opacity-80 transition-opacity', SUBSCRIPTION_STATUS_COLORS[String(sub.status)])}
                          title="اضغط للفلترة">
                          {SUBSCRIPTION_STATUS_LABELS[String(sub.status)]}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleFilter('paymentStatus', paymentStatus === String(sub.paymentStatus) ? '' : String(sub.paymentStatus))}
                          className={cn('badge text-xs cursor-pointer hover:opacity-80 transition-opacity', PAYMENT_STATUS_COLORS[String(sub.paymentStatus)])}
                          title="اضغط للفلترة">
                          {PAYMENT_STATUS_LABELS[String(sub.paymentStatus)]}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/subscriptions/${sub.id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all" title="عرض">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/subscriptions/${sub.id}/edit`} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-lime hover:bg-brand-lime/10 transition-all" title="تعديل كامل">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          {canEdit && (
                            <button onClick={() => handleDelete(String(sub.id))} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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
