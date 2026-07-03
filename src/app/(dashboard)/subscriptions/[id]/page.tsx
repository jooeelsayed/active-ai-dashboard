'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, Loader2, ArrowRight, ShoppingCart, Edit, Edit2, RefreshCw } from 'lucide-react'
import {
  formatDate, formatCurrency, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS, cn
} from '@/lib/utils'

export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [sub, setSub] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sensData, setSensData] = useState<Record<string, string | null> | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)
  const [showSens, setShowSens] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ status: '', paymentStatus: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) fetch(`/api/subscriptions/${id}`).then(r => r.json()).then(data => { setSub(data); setLoading(false) })
    fetch('/api/auth/session').then(r => r.json()).then(s => setUserRole(s?.user?.role ?? ''))
  }, [id])

  const handleReveal = async () => {
    setRevealLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${id}/reveal`, { method: 'POST' })
      if (res.ok) { setSensData(await res.json()); setShowSens(true) }
      else { const d = await res.json(); toast.error(d.error ?? 'فشل الكشف') }
    } catch { toast.error('حدث خطأ') } finally { setRevealLoading(false) }
  }

  const handleEdit = () => {
    setEditForm({ status: String(sub?.status ?? ''), paymentStatus: String(sub?.paymentStatus ?? ''), notes: String(sub?.notes ?? '') })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast.success('تم التحديث')
        setSub(await res.json())
        setIsEditing(false)
      } else { const d = await res.json(); toast.error(d.error) }
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader-brand w-10 h-10" /></div>
  if (!sub) return null

  const canReveal = userRole === 'ADMIN' || userRole === 'MANAGER'

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-100">تفاصيل الاشتراك</h1>
            <p className="text-sm text-slate-400">
              <Link href={`/customers/${(sub.customer as { id: string })?.id}`} className="hover:text-brand-cyan transition-colors">
                {String((sub.customer as { name: string })?.name)}
              </Link>
              {' — '}
              {String((sub.product as { name: string })?.name)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/subscriptions/${id}/edit`} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-brand-lime bg-brand-lime/10 hover:bg-brand-lime/20 border border-brand-lime/25 hover:border-brand-lime/50 transition-all">
            <Edit2 className="w-4 h-4" /> تعديل كامل
          </Link>
          <button onClick={handleEdit} className="btn-brand flex items-center gap-2 px-3 py-2 rounded-xl text-sm">
            <Edit className="w-4 h-4" /> تعديل سريع
          </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">معلومات الاشتراك</h2>
          <div className="space-y-3">
            {[
              { label: 'المنتج', value: `${(sub.product as { name: string })?.name} — ${(sub.product as { provider: string })?.provider}` },
              { label: 'تاريخ البداية', value: formatDate(String(sub.startDate)) },
              { label: 'تاريخ الانتهاء', value: formatDate(String(sub.endDate)) },
              { label: 'الموظف', value: String((sub.employee as { name: string } | null)?.name ?? '—') },
            ].map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-sm text-slate-200 font-medium">{String(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">المالية</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">سعر البيع</span>
              <span className="text-sm font-bold text-brand-cyan">{formatCurrency(Number(sub.salePrice))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">التكلفة</span>
              <span className="text-sm text-slate-300">{formatCurrency(Number(sub.costPrice))}</span>
            </div>
            <div className="flex justify-between border-t border-white/6 pt-2">
              <span className="text-xs text-slate-500">الربح</span>
              <span className="text-sm font-bold text-brand-lime">{formatCurrency(Number(sub.salePrice) - Number(sub.costPrice))}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap pt-2">
            <span className={cn('badge text-xs', SUBSCRIPTION_STATUS_COLORS[String(sub.status)])}>
              {SUBSCRIPTION_STATUS_LABELS[String(sub.status)]}
            </span>
            <span className={cn('badge text-xs', PAYMENT_STATUS_COLORS[String(sub.paymentStatus)])}>
              {PAYMENT_STATUS_LABELS[String(sub.paymentStatus)]}
            </span>
            <span className="badge text-xs text-slate-300 border-white/10">
              {PAYMENT_METHOD_LABELS[String(sub.paymentMethod)]}
            </span>
          </div>
        </div>
      </div>

      {/* Sensitive Data */}
      {(Boolean(sub.hasSensitiveData) || canReveal) && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4" />
              بيانات الحساب (مشفرة)
            </h2>
            {canReveal && (
              <button
                onClick={showSens ? () => { setShowSens(false); setSensData(null) } : handleReveal}
                disabled={revealLoading}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  showSens ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20'
                )}
              >
                {revealLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : showSens ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showSens ? 'إخفاء البيانات' : 'الكشف عن البيانات'}
              </button>
            )}
          </div>

          <AnimatePresence>
            {showSens && sensData ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'البريد الإلكتروني', value: sensData.loginEmail },
                  { label: 'كلمة المرور', value: sensData.loginPassword },
                  { label: 'كود الترخيص', value: sensData.licenseKey },
                  { label: 'رابط الوصول', value: sensData.accessLink },
                ].map((item, i) => item.value && (
                  <div key={i} className="bg-navy-700/40 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                    <p className="text-sm font-mono text-brand-lime break-all">{item.value}</p>
                  </div>
                ))}
              </motion.div>
            ) : !canReveal ? (
              <p className="text-slate-500 text-sm text-center py-4">هذا الاشتراك يحتوي على بيانات حساسة. يمكن للمدير والمدير العام فقط الكشف عنها.</p>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">اضغط على "الكشف عن البيانات" لعرض بيانات تسليم الحساب.</p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Notes */}
      {Boolean(sub.notes) && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider mb-3">الملاحظات</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{String(sub.notes)}</p>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-lg">تعديل الاشتراك</h3>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">حالة الاشتراك</label>
              <select className="input-brand" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">حالة الدفع</label>
              <select className="input-brand" value={editForm.paymentStatus} onChange={e => setEditForm(p => ({ ...p, paymentStatus: e.target.value }))}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">الملاحظات</label>
              <textarea rows={3} className="input-brand resize-none text-sm" value={editForm.notes}
                onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}حفظ
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-navy-700 border border-white/6 text-sm transition-all">
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
