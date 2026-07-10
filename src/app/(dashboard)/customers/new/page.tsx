'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { UserPlus, Loader2, ArrowRight, Facebook } from 'lucide-react'
import Link from 'next/link'
import MetaImportModal from '@/components/MetaImportModal'

interface Employee { id: string; name: string }

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showMetaImport, setShowMetaImport] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '', company: '', address: '',
    source: 'OTHER', status: 'NEW', internalNote: '', tags: '', assignedToId: '',
  })

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data)
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          assignedToId: form.assignedToId || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إضافة العميل بنجاح')
        router.push(`/customers/${data.id}`)
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-brand-cyan" />
            إضافة عميل جديد
          </h1>
          <p className="text-slate-400 text-sm">أدخل بيانات العميل الجديد</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowMetaImport(true)}
        className="glass-card w-full p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all flex items-center justify-between gap-4 text-right"
      >
        <span>
          <span className="block text-sm font-bold text-white">استيراد عملاء من Meta Business</span>
          <span className="block text-xs text-slate-500 mt-1">اسحب Leads من نماذج Meta Lead Ads مباشرة كعملاء جدد</span>
        </span>
        <span className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
          <Facebook className="w-5 h-5 text-blue-400" />
        </span>
      </button>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="glass-card p-6 space-y-5"
      >
        {/* Basic Info */}
        <div>
          <h2 className="text-sm font-bold text-brand-cyan mb-4 uppercase tracking-wider">البيانات الأساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">الاسم الكامل <span className="text-red-400">*</span></label>
              <input type="text" required className="input-brand" placeholder="مثال: أحمد محمود" {...field('name')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">رقم الهاتف</label>
              <input type="tel" className="input-brand" placeholder="01xxxxxxxxx" {...field('phone')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">رقم واتساب</label>
              <input type="tel" className="input-brand" placeholder="01xxxxxxxxx" {...field('whatsapp')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">البريد الإلكتروني</label>
              <input type="email" className="input-brand" placeholder="email@example.com" {...field('email')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">اسم الشركة</label>
              <input type="text" className="input-brand" placeholder="اختياري" {...field('company')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">العنوان</label>
              <input type="text" className="input-brand" placeholder="اختياري" {...field('address')} />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="border-t border-white/6 pt-5">
          <h2 className="text-sm font-bold text-brand-cyan mb-4 uppercase tracking-wider">التصنيف والمتابعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">مصدر العميل</label>
              <select className="input-brand" {...field('source')}>
                <option value="OTHER">أخرى</option>
                <option value="FACEBOOK">Meta Business / فيسبوك</option>
                <option value="WHATSAPP">واتساب</option>
                <option value="REFERRAL">إحالة</option>
                <option value="WEBSITE">الموقع الإلكتروني</option>
                <option value="TIKTOK">تيك توك</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">حالة العميل</label>
              <select className="input-brand" {...field('status')}>
                <option value="NEW">جديد</option>
                <option value="ACTIVE">نشط</option>
                <option value="WAITING">في الانتظار</option>
                <option value="PROBLEM">مشكلة</option>
                <option value="BLOCKED">محظور</option>
                <option value="OLD">قديم</option>
              </select>
            </div>
            {employees.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">تعيين لموظف</label>
                <select className="input-brand" {...field('assignedToId')}>
                  <option value="">تعيين تلقائي</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">تاجز (مفصولة بفاصلة)</label>
              <input type="text" className="input-brand" placeholder="مثال: VIP, مؤسسة" {...field('tags')} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">ملاحظة داخلية</label>
            <textarea
              rows={3}
              className="input-brand resize-none"
              placeholder="ملاحظات خاصة عن العميل..."
              {...field('internalNote')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/6">
          <button
            type="submit"
            disabled={loading}
            className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'جارٍ الحفظ...' : 'حفظ العميل'}
          </button>
          <Link href="/customers" className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all text-sm">
            إلغاء
          </Link>
        </div>
      </motion.form>

      <MetaImportModal
        isOpen={showMetaImport}
        onClose={() => setShowMetaImport(false)}
        onDone={() => router.push('/customers')}
      />
    </div>
  )
}
