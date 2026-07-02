'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CreditCard, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Customer { id: string; name: string }
interface Subscription { id: string; product: { name: string }; salePrice: number }

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preCustomerId = searchParams.get('customerId') ?? ''

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])

  const [form, setForm] = useState({
    customerId: preCustomerId, subscriptionId: '',
    amount: '', paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '', status: 'PAID', notes: '',
  })

  useEffect(() => {
    fetch('/api/customers?limit=200').then(r => r.json()).then(d => setCustomers(d.customers ?? []))
  }, [])

  useEffect(() => {
    if (form.customerId) {
      fetch(`/api/subscriptions?customerId=${form.customerId}&limit=50`).then(r => r.json()).then(d => {
        setSubscriptions(d.subscriptions ?? [])
      })
    } else {
      setSubscriptions([])
    }
  }, [form.customerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subscriptionId: form.subscriptionId || null }),
      })
      const data = await res.json()
      if (res.ok) { toast.success('تم تسجيل الدفعة بنجاح'); router.push('/payments') }
      else toast.error(data.error ?? 'فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setLoading(false) }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="max-w-lg mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Link href="/payments" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-cyan" />
            إضافة دفعة جديدة
          </h1>
        </div>
      </div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="glass-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">العميل <span className="text-red-400">*</span></label>
          <select required className="input-brand" {...field('customerId')}>
            <option value="">اختر العميل</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {subscriptions.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">ربط باشتراك (اختياري)</label>
            <select className="input-brand" {...field('subscriptionId')}>
              <option value="">بدون اشتراك محدد</option>
              {subscriptions.map(s => <option key={s.id} value={s.id}>{s.product?.name} — {s.salePrice} ج.م</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">المبلغ (ج.م) <span className="text-red-400">*</span></label>
            <input type="number" required min="0.01" step="0.01" className="input-brand" placeholder="0.00" {...field('amount')} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">تاريخ الدفع</label>
            <input type="date" className="input-brand" {...field('paymentDate')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">طريقة الدفع</label>
            <select className="input-brand" {...field('paymentMethod')}>
              <option value="CASH">نقداً</option>
              <option value="VODAFONE_CASH">فودافون كاش</option>
              <option value="INSTAPAY">إنستاباي</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="PAYPAL">باي بال</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">الحالة</label>
            <select className="input-brand" {...field('status')}>
              <option value="PAID">مدفوع</option>
              <option value="PARTIALLY_PAID">مدفوع جزئياً</option>
              <option value="UNPAID">غير مدفوع</option>
              <option value="REFUNDED">مسترد</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">رقم المرجع / الإيصال</label>
          <input type="text" className="input-brand" placeholder="اختياري" {...field('referenceNumber')} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">ملاحظات</label>
          <textarea rows={2} className="input-brand resize-none text-sm" placeholder="اختياري" {...field('notes')} />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-white/6">
          <button type="submit" disabled={loading} className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {loading ? 'جارٍ الحفظ...' : 'تسجيل الدفعة'}
          </button>
          <Link href="/payments" className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all text-sm">إلغاء</Link>
        </div>
      </motion.form>
    </div>
  )
}
