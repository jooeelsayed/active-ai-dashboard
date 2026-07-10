'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  User, Phone, Mail, Building2, MapPin, ShoppingCart, CreditCard,
  MessageCircle, CheckSquare, Activity, Edit, Plus, ArrowRight,
  RefreshCw, Loader2, ExternalLink, Trash2
} from 'lucide-react'
import {
  formatDate, formatCurrency, CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_COLORS,
  CUSTOMER_SOURCE_LABELS, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS, cn
} from '@/lib/utils'

type TabType = 'info' | 'subscriptions' | 'payments' | 'notes' | 'tasks'

export default function CustomerProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const fetchCustomer = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${id}`)
      if (res.ok) {
        setCustomer(await res.json())
      } else {
        toast.error('العميل غير موجود')
        router.push('/customers')
      }
    } catch {
      toast.error('خطأ في التحميل')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (id) fetchCustomer()
  }, [id, fetchCustomer])

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent, customerId: id }),
      })
      if (res.ok) {
        toast.success('تم إضافة الملاحظة')
        setNoteContent('')
        fetchCustomer()
      }
    } catch {
      toast.error('فشل إضافة الملاحظة')
    } finally {
      setAddingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loader-brand w-10 h-10" />
      </div>
    )
  }

  if (!customer) return null

  const subscriptions = (customer.subscriptions as unknown[]) ?? []
  const payments = (customer.payments as unknown[]) ?? []
  const notes = (customer.notes as unknown[]) ?? []
  const tasks = (customer.tasks as unknown[]) ?? []

  const tabs = [
    { id: 'info', label: 'البيانات', count: null },
    { id: 'subscriptions', label: 'الاشتراكات', count: subscriptions.length },
    { id: 'payments', label: 'المدفوعات', count: payments.length },
    { id: 'notes', label: 'الملاحظات', count: notes.length },
    { id: 'tasks', label: 'المهام', count: tasks.length },
  ]

  const totalPaid = payments
    .filter((p: unknown) => (p as { status: string }).status === 'PAID')
    .reduce((sum: number, p: unknown) => sum + Number((p as { amount: number }).amount), 0)

  const totalDue = subscriptions
    .filter((s: unknown) => (s as { paymentStatus: string }).paymentStatus !== 'PAID')
    .reduce((sum: number, s: unknown) => sum + Number((s as { salePrice: number }).salePrice), 0)

  return (
    <div className="space-y-6 page-enter">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-slate-100">{String(customer.name)}</h1>
          <span className={cn('badge', CUSTOMER_STATUS_COLORS[String(customer.status)])}>
            {CUSTOMER_STATUS_LABELS[String(customer.status)]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/subscriptions/new?customerId=${id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-navy-700/60 hover:bg-navy-700 border border-white/6 text-slate-300 hover:text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة اشتراك
          </Link>
          <Link
            href={`/customers/${id}/edit`}
            className="flex items-center gap-1.5 btn-brand px-3 py-2 rounded-xl text-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            تعديل
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-brand-cyan">{subscriptions.length}</p>
          <p className="text-xs text-slate-400 mt-1">اشتراك</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-brand-lime">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-slate-400 mt-1">إجمالي المدفوع</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-red-400">{formatCurrency(totalDue)}</p>
          <p className="text-xs text-slate-400 mt-1">مستحق</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800/60 rounded-xl p-1 border border-white/6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-navy-700 text-brand-cyan shadow'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="mr-1.5 text-xs bg-brand-cyan/20 text-brand-cyan px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === 'info' && (
          <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: User, label: 'الاسم الكامل', value: customer.name },
              { icon: Phone, label: 'رقم الهاتف', value: customer.phone },
              { icon: Phone, label: 'واتساب', value: customer.whatsapp },
              { icon: Mail, label: 'البريد الإلكتروني', value: customer.email },
              { icon: Building2, label: 'الشركة', value: customer.company },
              { icon: MapPin, label: 'العنوان', value: customer.address },
              { icon: ExternalLink, label: 'مصدر العميل', value: CUSTOMER_SOURCE_LABELS[String(customer.source)] },
              { icon: User, label: 'الموظف المسؤول', value: (customer.assignedTo as { name: string } | null)?.name },
              { icon: Activity, label: 'تاريخ الإضافة', value: formatDate(String(customer.createdAt)) },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-sm text-slate-200 font-medium">{String(item.value || '—')}</p>
                </div>
              </div>
            ))}
            {Boolean(customer.internalNote) && (
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 mb-1">ملاحظة داخلية</p>
                <p className="text-sm text-slate-200 bg-navy-700/40 rounded-lg p-3">{String(customer.internalNote)}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-3">
            {subscriptions.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">لا توجد اشتراكات بعد</p>
                <Link href={`/subscriptions/new?customerId=${id}`} className="btn-brand inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm">
                  <Plus className="w-4 h-4" /> إضافة اشتراك
                </Link>
              </div>
            ) : (
              subscriptions.map((sub: unknown, i: number) => {
                const s = sub as Record<string, unknown>
                return (
                  <motion.div key={String(s.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="glass-card p-4 glass-card-hover">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-100">{(s.product as { name: string })?.name}</p>
                        <p className="text-xs text-slate-500">{(s.product as { provider: string })?.provider}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={cn('badge text-xs', SUBSCRIPTION_STATUS_COLORS[String(s.status)])}>
                            {SUBSCRIPTION_STATUS_LABELS[String(s.status)]}
                          </span>
                          <span className={cn('badge text-xs', PAYMENT_STATUS_COLORS[String(s.paymentStatus)])}>
                            {PAYMENT_STATUS_LABELS[String(s.paymentStatus)]}
                          </span>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-brand-cyan">{formatCurrency(Number(s.salePrice))}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(String(s.startDate))} — {formatDate(String(s.endDate))}
                        </p>
                        <Link href={`/subscriptions/${s.id}`} className="text-xs text-brand-lime hover:underline mt-1 block">
                          عرض التفاصيل
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="glass-card overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">لا توجد مدفوعات بعد</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">المبلغ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الطريقة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {payments.map((pay: unknown) => {
                    const p = pay as Record<string, unknown>
                    return (
                      <tr key={String(p.id)} className="table-row-hover">
                        <td className="px-4 py-3 font-bold text-brand-lime">{formatCurrency(Number(p.amount))}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{PAYMENT_METHOD_LABELS[String(p.paymentMethod)]}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{formatDate(String(p.paymentDate))}</td>
                        <td className="px-4 py-3">
                          <span className={cn('badge text-xs', PAYMENT_STATUS_COLORS[String(p.status)])}>
                            {PAYMENT_STATUS_LABELS[String(p.status)]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Add Note */}
            <div className="glass-card p-4">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب ملاحظة..."
                rows={3}
                className="input-brand resize-none mb-3 text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteContent.trim()}
                className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm disabled:opacity-60"
              >
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة ملاحظة
              </button>
            </div>

            {/* Notes Timeline */}
            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400">لا توجد ملاحظات بعد</p>
                </div>
              ) : (
                notes.map((note: unknown, i: number) => {
                  const n = note as Record<string, unknown>
                  return (
                    <motion.div key={String(n.id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-cyan to-brand-lime flex items-center justify-center">
                          <span className="text-xs font-black text-navy-900">
                            {String((n.author as { name: string })?.name ?? 'N').charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-200">{String((n.author as { name: string })?.name ?? '—')}</span>
                        <span className="text-xs text-slate-500 mr-auto">{formatDate(String(n.createdAt))}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{String(n.content)}</p>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="glass-card p-10 text-center">
            <CheckSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">المهام ({tasks.length})</p>
            <p className="text-slate-600 text-sm mt-1">قريباً — إدارة المهام والتذكيرات</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
