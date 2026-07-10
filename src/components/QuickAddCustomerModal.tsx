'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { X, UserPlus, Loader2 } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (customer: { id: string; name: string }) => void
}

export default function QuickAddCustomerModal({ isOpen, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    source: 'OTHER',
    status: 'ACTIVE',
  })

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: [] }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`تم إضافة العميل "${data.name}" بنجاح`)
        onCreated({ id: data.id, name: data.name })
        setForm({ name: '', phone: '', whatsapp: '', email: '', source: 'OTHER', status: 'ACTIVE' })
        onClose()
      } else {
        toast.error(data.error ?? 'فشل إضافة العميل')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-card w-full max-w-md pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-brand-cyan" />
                  </div>
                  <h2 className="text-base font-bold text-white">إضافة عميل جديد سريع</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      الاسم الكامل <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      className="input-brand"
                      placeholder="مثال: أحمد محمود"
                      {...field('name')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف</label>
                      <input type="tel" className="input-brand" placeholder="01xxxxxxxxx" {...field('phone')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">واتساب</label>
                      <input type="tel" className="input-brand" placeholder="01xxxxxxxxx" {...field('whatsapp')} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                    <input type="email" className="input-brand" placeholder="email@example.com" {...field('email')} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">مصدر العميل</label>
                      <select className="input-brand" {...field('source')}>
                        <option value="OTHER">أخرى</option>
                        <option value="FACEBOOK">Meta Business / فيسبوك</option>
                        <option value="WHATSAPP">واتساب</option>
                        <option value="REFERRAL">إحالة</option>
                        <option value="WEBSITE">الموقع</option>
                        <option value="TIKTOK">تيك توك</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">الحالة</label>
                      <select className="input-brand" {...field('status')}>
                        <option value="ACTIVE">نشط</option>
                        <option value="NEW">جديد</option>
                        <option value="WAITING">انتظار</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {loading ? 'جارٍ الحفظ...' : 'إضافة وتحديد العميل'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/6 transition-all text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
