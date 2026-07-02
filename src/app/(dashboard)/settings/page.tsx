'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Settings, Save, Loader2 } from 'lucide-react'

interface SettingsData {
  id: string; companyName: string; currency: string; reminderDays: number; whatsappTemplate: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast.success('تم حفظ الإعدادات')
      else toast.error('فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader-brand w-10 h-10" /></div>
  if (!settings) return <div className="glass-card p-10 text-center text-slate-400">فشل تحميل الإعدادات</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-cyan" />
          إعدادات النظام
        </h1>
        <p className="text-slate-400 text-sm mt-1">تخصيص إعدادات شركة Active Ai</p>
      </div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSave} className="space-y-5">
        {/* General Settings */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">الإعدادات العامة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">اسم الشركة</label>
              <input type="text" className="input-brand" value={settings.companyName}
                onChange={e => setSettings(p => p ? { ...p, companyName: e.target.value } : null)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">العملة</label>
              <select className="input-brand" value={settings.currency}
                onChange={e => setSettings(p => p ? { ...p, currency: e.target.value } : null)}>
                <option value="EGP">جنيه مصري (ج.م)</option>
                <option value="USD">دولار أمريكي ($)</option>
                <option value="SAR">ريال سعودي (ر.س)</option>
                <option value="AED">درهم إماراتي (د.إ)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">مدة تذكير التجديد (بالأيام)</label>
              <input type="number" min="1" max="30" className="input-brand" value={settings.reminderDays}
                onChange={e => setSettings(p => p ? { ...p, reminderDays: parseInt(e.target.value) } : null)} />
              <p className="text-xs text-slate-500 mt-1">سيتم التذكير قبل {settings.reminderDays} يوم من انتهاء الاشتراك</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Template */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">نموذج رسالة واتساب</h2>
          <p className="text-xs text-slate-500">المتغيرات المتاحة: <code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">{'{customerName}'}</code>، <code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">{'{productName}'}</code>، <code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">{'{endDate}'}</code></p>
          <textarea rows={6} className="input-brand resize-none font-mono text-sm" value={settings.whatsappTemplate}
            onChange={e => setSettings(p => p ? { ...p, whatsappTemplate: e.target.value } : null)} />

          {/* Preview */}
          <div className="bg-navy-700/40 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2 font-semibold">معاينة الرسالة:</p>
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {settings.whatsappTemplate
                .replace('{customerName}', 'أحمد محمود')
                .replace('{productName}', 'ChatGPT Plus')
                .replace('{endDate}', '15/08/2025')
              }
            </p>
          </div>
        </div>

        {/* Save */}
        <div>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </motion.form>
    </div>
  )
}
