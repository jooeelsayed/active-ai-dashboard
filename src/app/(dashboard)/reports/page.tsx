'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Download, Calendar, TrendingUp, Users, Package } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import {
  formatCurrency, CUSTOMER_SOURCE_LABELS, PAYMENT_METHOD_LABELS,
  SUBSCRIPTION_STATUS_LABELS, PRODUCT_CATEGORY_LABELS
} from '@/lib/utils'

const PIE_COLORS = ['#22d3ee', '#a3e635', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ReportsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [employeeId, setEmployeeId] = useState('')

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (employeeId) params.set('employeeId', employeeId)
      const res = await fetch(`/api/reports?${params}`)
      setData(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchReport() }, [from, to, employeeId])
  useEffect(() => { fetch('/api/employees').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : [])) }, [])

  const handleExport = (type: string) => window.open(`/api/export?type=${type}`, '_blank')

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loader-brand w-10 h-10" /></div>

  const reportData = data as {
    revenueTotal: number
    subscriptionsByEmployee: Array<{ employeeName: string; revenue: number; profit: number; count: number }>
    subscriptionsByProduct: Array<{ productName: string; revenue: number; count: number }>
    customersBySource: Array<{ source: string; count: number }>
    paymentsByMethod: Array<{ method: string; amount: number; count: number }>
    subscriptionsByStatus: Array<{ status: string; count: number }>
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-cyan" />
            التقارير والإحصائيات
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('customers')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-navy-700/60 border border-white/6 transition-all">
            <Download className="w-3.5 h-3.5" />عملاء
          </button>
          <button onClick={() => handleExport('subscriptions')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-navy-700/60 border border-white/6 transition-all">
            <Download className="w-3.5 h-3.5" />اشتراكات
          </button>
          <button onClick={() => handleExport('payments')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-navy-700/60 border border-white/6 transition-all">
            <Download className="w-3.5 h-3.5" />مدفوعات
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input type="date" className="input-brand py-1.5 text-xs w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-slate-500 text-sm">إلى</span>
          <input type="date" className="input-brand py-1.5 text-xs w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <select className="input-brand py-1.5 text-xs w-auto min-w-[140px]" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">كل الموظفين</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="glass-card p-6 stat-card-cyan">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-5 h-5 text-brand-cyan" />
          <span className="text-sm text-slate-400">إجمالي الإيراد في الفترة المحددة</span>
        </div>
        <p className="text-4xl font-black text-brand-cyan">{formatCurrency(reportData?.revenueTotal ?? 0)}</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance */}
        {(reportData?.subscriptionsByEmployee?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-cyan" />
              أداء الموظفين
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reportData.subscriptionsByEmployee}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="employeeName" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f8fafc' }}
                  formatter={(v: any) => [`${Number(v || 0).toLocaleString('ar-EG')} ج.م`]} />
                <Legend formatter={v => v === 'revenue' ? 'الإيراد' : 'الربح'} wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
                <Bar dataKey="revenue" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#a3e635" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* By Product */}
        {(reportData?.subscriptionsByProduct?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-lime" />
              إيراد حسب المنتج
            </h3>
            <div className="space-y-3">
              {reportData.subscriptionsByProduct.slice(0, 6).map((p, i) => (
                <div key={p.productName} className="flex items-center gap-3">
                  <span className="w-5 h-5 text-xs font-bold text-slate-500 text-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-200 truncate">{p.productName}</span>
                      <span className="text-xs font-bold text-brand-cyan">{formatCurrency(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-lime"
                        style={{ width: `${(p.revenue / (reportData.subscriptionsByProduct[0]?.revenue || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{p.count} اشتراك</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Customer Sources */}
        {(reportData?.customersBySource?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
            <h3 className="text-base font-bold text-slate-100 mb-4">مصادر العملاء</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reportData.customersBySource.map(c => ({ name: CUSTOMER_SOURCE_LABELS[c.source] ?? c.source, value: c.count }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {reportData.customersBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f8fafc' }} />
                <Legend formatter={v => v} wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Payment Methods */}
        {(reportData?.paymentsByMethod?.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <h3 className="text-base font-bold text-slate-100 mb-4">المدفوعات حسب الطريقة</h3>
            <div className="space-y-2">
              {reportData.paymentsByMethod.map((p, i) => (
                <div key={p.method} className="flex items-center justify-between py-2 border-b border-white/4 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm text-slate-200">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                    <span className="text-xs text-slate-500">({p.count} معاملة)</span>
                  </div>
                  <span className="text-sm font-bold text-brand-lime">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
