'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  Activity,
  Clock,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { formatCurrency, formatRelativeTime, SUBSCRIPTION_STATUS_LABELS } from '@/lib/utils'

interface DashboardData {
  stats: {
    totalCustomers: number
    activeSubscriptions: number
    expiredSubscriptions: number
    expiringSoon: number
    pendingPaymentsAmount: number
    monthlyRevenue: number
    monthlyProfit: number
  }
  revenueByMonth: Array<{ month: string; revenue: number }>
  subsByStatus: Array<{ status: string; count: number }>
  topProducts: Array<{ id: string; name: string; provider: string; count: number }>
  recentActivity: Array<{
    id: string
    action: string
    entityName: string | null
    userName: string | null
    createdAt: string
  }>
  employeeStats: Array<{ id: string; name: string; customers: number; subscriptions: number }>
}

const PIE_COLORS = ['#22d3ee', '#a3e635', '#f59e0b', '#ef4444', '#8b5cf6']

const MONTH_LABELS: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    const duration = 800
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(value * eased))
      if (progress === 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{displayed.toLocaleString('ar-EG')}</span>
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass-card p-5 h-28 animate-pulse bg-navy-700/40" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { stats, revenueByMonth, subsByStatus, topProducts, recentActivity, employeeStats } = data

  const chartData = revenueByMonth.map((r) => ({
    name: MONTH_LABELS[r.month.split('-')[1]] ?? r.month,
    revenue: r.revenue,
  }))

  const pieData = subsByStatus.map((s) => ({
    name: SUBSCRIPTION_STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
  }))

  const statCards = [
    {
      title: 'إجمالي العملاء',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-brand-cyan',
      bg: 'from-brand-cyan/10',
      link: '/customers',
    },
    {
      title: 'اشتراكات نشطة',
      value: stats.activeSubscriptions,
      icon: CheckCircle2,
      color: 'text-brand-lime',
      bg: 'from-brand-lime/10',
      link: '/subscriptions',
    },
    {
      title: 'تنتهي قريباً',
      value: stats.expiringSoon,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'from-yellow-400/10',
      link: '/renewals',
    },
    {
      title: 'اشتراكات منتهية',
      value: stats.expiredSubscriptions,
      icon: Clock,
      color: 'text-red-400',
      bg: 'from-red-400/10',
      link: '/subscriptions?status=EXPIRED',
    },
    {
      title: 'إيراد هذا الشهر',
      value: stats.monthlyRevenue,
      icon: DollarSign,
      color: 'text-blue-400',
      bg: 'from-blue-400/10',
      link: '/reports',
      isCurrency: true,
    },
    {
      title: 'ربح هذا الشهر',
      value: stats.monthlyProfit,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'from-purple-400/10',
      link: '/reports',
      isCurrency: true,
    },
    {
      title: 'مدفوعات معلقة',
      value: stats.pendingPaymentsAmount,
      icon: CreditCard,
      color: 'text-orange-400',
      bg: 'from-orange-400/10',
      link: '/payments',
      isCurrency: true,
    },
    {
      title: 'إجمالي المنتجات',
      value: topProducts.length,
      icon: Package,
      color: 'text-pink-400',
      bg: 'from-pink-400/10',
      link: '/products',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={card.link}>
                <div className={`glass-card glass-card-hover p-4 md:p-5 h-full bg-gradient-to-br ${card.bg} to-transparent`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg bg-navy-700/60 ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className={`text-2xl font-black ${card.color} mb-1`}>
                    <AnimatedNumber
                      value={card.value}
                      prefix={card.isCurrency ? '₪ ' : ''}
                    />
                    {card.isCurrency && <span className="text-xs font-normal text-slate-500 mr-1">ج.م</span>}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{card.title}</p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card p-5"
        >
          <h3 className="text-base font-bold text-slate-100 mb-4">الإيرادات (آخر 6 أشهر)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f8fafc' }}
                formatter={(v: any) => [`${Number(v || 0).toLocaleString('ar-EG')} ج.م`, 'الإيراد']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-bold text-slate-100 mb-4">توزيع الاشتراكات</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-slate-300">{d.name}</span>
                </div>
                <span className="text-slate-400 font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-bold text-slate-100 mb-4">أكثر المنتجات مبيعاً</h3>
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-200 truncate">{product.name}</span>
                    <span className="text-xs text-brand-cyan font-bold">{product.count}</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-lime"
                      style={{ width: `${Math.min((product.count / (topProducts[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{product.provider}</span>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">لا توجد منتجات بعد</p>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-100">آخر النشاطات</h3>
            <Link href="/activity" className="text-xs text-brand-cyan hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-brand-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">
                    <span className="font-semibold text-brand-cyan">{act.userName ?? 'النظام'}</span>
                    {' — '}{act.action}
                    {act.entityName && <span className="text-slate-400"> ({act.entityName})</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatRelativeTime(act.createdAt)}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">لا توجد نشاطات بعد</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Employee Performance */}
      {employeeStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <h3 className="text-base font-bold text-slate-100 mb-4">أداء الموظفين</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={employeeStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f8fafc' }}
              />
              <Legend
                formatter={(value) => value === 'customers' ? 'العملاء' : 'الاشتراكات'}
                wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
              />
              <Bar dataKey="customers" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              <Bar dataKey="subscriptions" fill="#a3e635" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  )
}
