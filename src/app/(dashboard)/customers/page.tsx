'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users, Plus, Search, Filter, Trash2, Edit, Eye, Phone, Mail,
  ChevronLeft, ChevronRight, RefreshCw, Download, UserCheck
} from 'lucide-react'
import {
  formatDate, formatRelativeTime, CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_COLORS, CUSTOMER_SOURCE_LABELS, cn
} from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  source: string
  status: string
  createdAt: string
  assignedTo: { name: string } | null
  _count: { subscriptions: number; payments: number }
}

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [userRole, setUserRole] = useState<string>('')

  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const source = searchParams.get('source') ?? ''

  const [searchInput, setSearchInput] = useState(search)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (source) params.set('source', source)
      params.set('page', String(page))

      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch {
      toast.error('فشل تحميل العملاء')
    } finally {
      setLoading(false)
    }
  }, [search, status, source, page])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Get user role for permission checks
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      setUserRole(s?.user?.role ?? '')
    }).catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    params.set('search', searchInput)
    params.set('page', '1')
    router.push(`/customers?${params}`)
  }

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    router.push(`/customers?${params}`)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف العميل "${name}"؟ سيتم حذف جميع اشتراكاته ومدفوعاته.`)) return
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف العميل بنجاح')
        fetchCustomers()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'فشل الحذف')
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleExport = () => {
    window.open('/api/export?type=customers', '_blank')
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-cyan" />
            العملاء
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إجمالي {total.toLocaleString('ar-EG')} عميل
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
          )}
          <Link
            href="/customers/new"
            className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة عميل
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو البريد..."
              className="input-brand pr-9 py-2 text-sm"
            />
          </div>
          <button type="submit" className="btn-brand px-4 py-2 rounded-xl text-sm">
            بحث
          </button>
          {(search || status || source) && (
            <button
              type="button"
              onClick={() => router.push('/customers')}
              className="px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="input-brand py-1.5 text-xs w-auto min-w-[120px]"
          >
            <option value="">كل الحالات</option>
            {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => handleFilter('source', e.target.value)}
            className="input-brand py-1.5 text-xs w-auto min-w-[120px]"
          >
            <option value="">كل المصادر</option>
            {Object.entries(CUSTOMER_SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-navy-700/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg font-semibold">لا يوجد عملاء</p>
            <p className="text-slate-600 text-sm mt-1">ابدأ بإضافة عميل جديد</p>
            <Link href="/customers/new" className="btn-brand inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4" />
              إضافة أول عميل
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">العميل</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">الاتصال</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">الاشتراكات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">تاريخ الإضافة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {customers.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="table-row-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-cyan/30 to-brand-lime/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-brand-cyan">{customer.name.charAt(0)}</span>
                        </div>
                        <div>
                          <Link href={`/customers/${customer.id}`} className="font-semibold text-slate-100 hover:text-brand-cyan transition-colors">
                            {customer.name}
                          </Link>
                          {customer.company && (
                            <p className="text-xs text-slate-500">{customer.company}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <p className="text-sm text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.email && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', CUSTOMER_STATUS_COLORS[customer.status])}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-slate-300 font-semibold">{customer._count.subscriptions}</span>
                      <span className="text-xs text-slate-500 mr-1">اشتراك</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-400">{formatDate(customer.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/customers/${customer.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-lime hover:bg-brand-lime/10 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleFilter('page', String(Math.max(1, page - 1)))}
            disabled={page === 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed bg-navy-700/60 border border-white/6 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300 px-3">
            صفحة {page} من {pages}
          </span>
          <button
            onClick={() => handleFilter('page', String(Math.min(pages, page + 1)))}
            disabled={page === pages}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed bg-navy-700/60 border border-white/6 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
