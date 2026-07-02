'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { CreditCard, Plus, Search, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { formatDate, formatCurrency, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS, cn } from '@/lib/utils'

export default function PaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [userRole, setUserRole] = useState('')

  const page = parseInt(searchParams.get('page') ?? '1')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?page=${page}`)
      const data = await res.json()
      setPayments(data.payments ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch { toast.error('خطأ في التحميل') } finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchPayments() }, [fetchPayments])
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => setUserRole(s?.user?.role ?? '')).catch(() => {})
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return
    const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); fetchPayments() }
    else toast.error('فشل الحذف')
  }

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/payments?${params}`)
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-cyan" />
            المدفوعات
          </h1>
          <p className="text-slate-400 text-sm mt-1">إجمالي {total.toLocaleString('ar-EG')} دفعة</p>
        </div>
        <div className="flex items-center gap-2">
          {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
            <button onClick={() => window.open('/api/export?type=payments', '_blank')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">تصدير</span>
            </button>
          )}
          <Link href="/payments/new" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة دفعة
          </Link>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-navy-700/40 rounded-xl animate-pulse" />)}</div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center">
            <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg font-semibold">لا توجد مدفوعات</p>
            <Link href="/payments/new" className="btn-brand inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4" />إضافة دفعة
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">العميل</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">المبلغ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الحالة</th>
                  {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">حذف</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {payments.map((pay, i) => (
                  <motion.tr key={String(pay.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="table-row-hover">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${(pay.customer as { id: string })?.id}`} className="font-semibold text-slate-100 hover:text-brand-cyan transition-colors text-sm">
                        {String((pay.customer as { name: string })?.name)}
                      </Link>
                      {(pay.subscription as { product: { name: string } } | null)?.product?.name && (
                        <p className="text-xs text-slate-500">{String((pay.subscription as { product: { name: string } })?.product?.name)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-brand-lime">{formatCurrency(Number(pay.amount))}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-300">{PAYMENT_METHOD_LABELS[String(pay.paymentMethod)]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">{formatDate(String(pay.paymentDate))}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', PAYMENT_STATUS_COLORS[String(pay.status)])}>
                        {PAYMENT_STATUS_LABELS[String(pay.status)]}
                      </span>
                    </td>
                    {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(String(pay.id))} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handlePage(Math.max(1, page - 1))} disabled={page === 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 bg-navy-700/60 border border-white/6 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300 px-3">صفحة {page} من {pages}</span>
          <button onClick={() => handlePage(Math.min(pages, page + 1))} disabled={page === pages}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 bg-navy-700/60 border border-white/6 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
