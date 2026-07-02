'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { RefreshCw, MessageSquare, Phone, Copy, ExternalLink, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatDate, formatCurrency, getWhatsAppLink, generateWhatsAppMessage, cn } from '@/lib/utils'

interface RenewalSub {
  id: string
  endDate: string
  salePrice: number
  customer: { id: string; name: string; phone: string | null; whatsapp: string | null }
  product: { name: string; provider: string }
}

interface RenewalsData {
  expiredNow: RenewalSub[]
  expireToday: RenewalSub[]
  expireIn3: RenewalSub[]
  expireIn7: RenewalSub[]
  expireThisMonth: RenewalSub[]
  whatsappTemplate: string
}

function RenewalCard({ sub, template }: { sub: RenewalSub; template: string }) {
  const [expanded, setExpanded] = useState(false)
  const phone = sub.customer.whatsapp || sub.customer.phone

  const message = generateWhatsAppMessage(template, {
    customerName: sub.customer.name,
    productName: sub.product.name,
    endDate: formatDate(sub.endDate),
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(message)
    toast.success('تم نسخ الرسالة')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/customers/${sub.customer.id}`} className="font-semibold text-slate-100 hover:text-brand-cyan transition-colors">
            {sub.customer.name}
          </Link>
          <p className="text-xs text-slate-500">{sub.product.name} — {sub.product.provider}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">ينتهي: {formatDate(sub.endDate)}</span>
            <span className="text-xs font-bold text-brand-cyan">{formatCurrency(sub.salePrice)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {phone && (
            <>
              <a href={`tel:${phone}`} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-lime hover:bg-brand-lime/10 transition-all" title="اتصال">
                <Phone className="w-4 h-4" />
              </a>
              <a href={getWhatsAppLink(phone, message)} target="_blank" rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-all" title="واتساب">
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-navy-700/40 rounded-xl p-3 space-y-2">
          <p className="text-xs text-slate-400 font-semibold">رسالة واتساب التجديد:</p>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{message}</p>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 transition-all">
              <Copy className="w-3 h-3" />نسخ الرسالة
            </button>
            {phone && (
              <a href={getWhatsAppLink(phone, message)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all">
                <MessageSquare className="w-3 h-3" />إرسال واتساب
              </a>
            )}
            <Link href={`/subscriptions/new?customerId=${sub.customer.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-lime/10 text-brand-lime hover:bg-brand-lime/20 transition-all">
              <RefreshCw className="w-3 h-3" />تجديد الاشتراك
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function Section({ title, icon, color, subs, template, defaultOpen = false }: {
  title: string; icon: React.ReactNode; color: string; subs: RenewalSub[]; template: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (subs.length === 0) return null

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(!open)}
        className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all', color)}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold">{title}</span>
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{subs.length}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="space-y-2 pr-2">
          {subs.map(sub => <RenewalCard key={sub.id} sub={sub} template={template} />)}
        </div>
      )}
    </div>
  )
}

export default function RenewalsPage() {
  const [data, setData] = useState<RenewalsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/renewals').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader-brand w-10 h-10" /></div>
  if (!data) return null

  const totalCount = data.expiredNow.length + data.expireToday.length + data.expireIn3.length + data.expireIn7.length + data.expireThisMonth.length

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-brand-cyan" />
          التجديدات والتذكيرات
        </h1>
        <p className="text-slate-400 text-sm mt-1">{totalCount} اشتراك يحتاج متابعة</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'منتهي', count: data.expiredNow.length, color: 'text-red-400' },
          { label: 'اليوم', count: data.expireToday.length, color: 'text-orange-400' },
          { label: 'خلال 3 أيام', count: data.expireIn3.length, color: 'text-yellow-400' },
          { label: 'خلال 7 أيام', count: data.expireIn7.length, color: 'text-blue-400' },
          { label: 'هذا الشهر', count: data.expireThisMonth.length, color: 'text-brand-cyan' },
        ].map(item => (
          <div key={item.label} className="glass-card p-3 text-center">
            <p className={`text-2xl font-black ${item.color}`}>{item.count}</p>
            <p className="text-xs text-slate-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {totalCount === 0 ? (
        <div className="glass-card p-16 text-center">
          <CheckCircle2 className="w-16 h-16 text-brand-lime mx-auto mb-4" />
          <p className="text-slate-200 text-xl font-bold">ممتاز! لا توجد اشتراكات تحتاج تجديد</p>
          <p className="text-slate-500 text-sm mt-2">جميع الاشتراكات في وضع جيد حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="اشتراكات منتهية" icon={<Clock className="w-4 h-4" />}
            color="bg-red-500/10 border-red-500/30 text-red-400" subs={data.expiredNow} template={data.whatsappTemplate} defaultOpen />
          <Section title="تنتهي اليوم" icon={<AlertTriangle className="w-4 h-4" />}
            color="bg-orange-500/10 border-orange-500/30 text-orange-400" subs={data.expireToday} template={data.whatsappTemplate} defaultOpen />
          <Section title="تنتهي خلال 3 أيام" icon={<AlertTriangle className="w-4 h-4" />}
            color="bg-yellow-500/10 border-yellow-500/30 text-yellow-400" subs={data.expireIn3} template={data.whatsappTemplate} defaultOpen />
          <Section title="تنتهي خلال 7 أيام" icon={<RefreshCw className="w-4 h-4" />}
            color="bg-blue-500/10 border-blue-500/30 text-blue-400" subs={data.expireIn7} template={data.whatsappTemplate} />
          <Section title="تنتهي هذا الشهر" icon={<RefreshCw className="w-4 h-4" />}
            color="bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan" subs={data.expireThisMonth} template={data.whatsappTemplate} />
        </div>
      )}
    </div>
  )
}
