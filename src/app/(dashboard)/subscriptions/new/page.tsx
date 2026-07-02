'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ShoppingCart, Loader2, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Customer { id: string; name: string }
interface Product { id: string; name: string; provider: string; sellingPrice: number; costPrice: number; durationDays: number }

export default function NewSubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preCustomerId = searchParams.get('customerId') ?? ''

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showSensitive, setShowSensitive] = useState(false)

  const [form, setForm] = useState({
    customerId: preCustomerId, productId: '', employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '', renewalReminderDate: '',
    salePrice: '', costPrice: '',
    paymentStatus: 'UNPAID', status: 'ACTIVE',
    paymentMethod: 'CASH', notes: '',
    loginEmail: '', loginPassword: '', licenseKey: '', accessLink: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/customers?limit=200').then(r => r.json()),
      fetch('/api/products?isActive=true').then(r => r.json()),
    ]).then(([cData, pData]) => {
      setCustomers(cData.customers ?? [])
      setProducts(Array.isArray(pData) ? pData : [])
    }).catch(() => {})
  }, [])

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      const end = new Date()
      end.setDate(end.getDate() + product.durationDays)
      const reminder = new Date()
      reminder.setDate(reminder.getDate() + product.durationDays - 7)
      setForm(prev => ({
        ...prev,
        productId,
        salePrice: String(product.sellingPrice),
        costPrice: String(product.costPrice),
        endDate: end.toISOString().split('T')[0],
        renewalReminderDate: reminder.toISOString().split('T')[0],
      }))
    } else {
      setForm(prev => ({ ...prev, productId }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إضافة الاشتراك بنجاح')
        router.push(`/subscriptions/${data.id}`)
      } else {
        toast.error(data.error ?? 'فشل الحفظ')
      }
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  const selectedProduct = products.find(p => p.id === form.productId)
  const profit = selectedProduct ? Number(form.salePrice) - Number(form.costPrice) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Link href="/subscriptions" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-cyan" />
            إضافة اشتراك جديد
          </h1>
        </div>
      </div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-5">
        {/* Customer & Product */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">العميل والمنتج</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">العميل <span className="text-red-400">*</span></label>
              <select required className="input-brand" {...field('customerId')}>
                <option value="">اختر العميل</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">المنتج / الخدمة <span className="text-red-400">*</span></label>
              <select required className="input-brand" value={form.productId} onChange={e => handleProductChange(e.target.value)}>
                <option value="">اختر المنتج</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.provider}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">التواريخ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">تاريخ البداية <span className="text-red-400">*</span></label>
              <input type="date" required className="input-brand" {...field('startDate')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">تاريخ الانتهاء <span className="text-red-400">*</span></label>
              <input type="date" required className="input-brand" {...field('endDate')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">تاريخ التذكير بالتجديد</label>
              <input type="date" className="input-brand" {...field('renewalReminderDate')} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">التسعير</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">سعر البيع (ج.م)</label>
              <input type="number" min="0" step="0.01" className="input-brand" {...field('salePrice')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">سعر التكلفة (ج.م)</label>
              <input type="number" min="0" step="0.01" className="input-brand" {...field('costPrice')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">الربح المتوقع</label>
              <div className={`input-brand flex items-center font-bold ${profit >= 0 ? 'text-brand-lime' : 'text-red-400'}`}>
                {profit.toFixed(2)} ج.م
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">حالة الدفع</label>
              <select className="input-brand" {...field('paymentStatus')}>
                <option value="UNPAID">غير مدفوع</option>
                <option value="PARTIALLY_PAID">مدفوع جزئياً</option>
                <option value="PAID">مدفوع</option>
                <option value="REFUNDED">مسترد</option>
              </select>
            </div>
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
          </div>
        </div>

        {/* Sensitive Fields */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4" />
              بيانات تسليم الحساب (مشفرة)
            </h2>
            <button type="button" onClick={() => setShowSensitive(!showSensitive)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              {showSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showSensitive ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
          {showSensitive && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">البريد الإلكتروني للحساب</label>
                <input type="email" className="input-brand" placeholder="login@example.com" {...field('loginEmail')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">كلمة مرور الحساب</label>
                <input type="password" className="input-brand" placeholder="••••••••" {...field('loginPassword')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">كود الترخيص</label>
                <input type="text" className="input-brand" placeholder="XXXX-XXXX-XXXX" {...field('licenseKey')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">رابط الوصول</label>
                <input type="url" className="input-brand" placeholder="https://..." {...field('accessLink')} />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="glass-card p-6">
          <label className="block text-sm font-semibold text-slate-300 mb-2">ملاحظات الاشتراك</label>
          <textarea rows={3} className="input-brand resize-none" placeholder="أي ملاحظات إضافية..." {...field('notes')} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            {loading ? 'جارٍ الحفظ...' : 'حفظ الاشتراك'}
          </button>
          <Link href="/subscriptions" className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all text-sm">
            إلغاء
          </Link>
        </div>
      </motion.form>
    </div>
  )
}
