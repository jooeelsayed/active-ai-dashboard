'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, Search, RefreshCw } from 'lucide-react'
import { formatRelativeTime, formatDate } from '@/lib/utils'

interface LogEntry {
  id: string; action: string; entityType: string; entityName: string | null;
  userName: string | null; createdAt: string; details: string | null
}

const ENTITY_ICONS: Record<string, string> = {
  Customer: '👤', Subscription: '🛒', Payment: '💳', Product: '📦',
  User: '👔', Settings: '⚙️'
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/activity?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch {} finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLogs() }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand-cyan" />
          سجل النشاط
        </h1>
        <p className="text-slate-400 text-sm mt-1">{total.toLocaleString('ar-EG')} حدث مسجل</p>
      </div>

      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الأحداث..." className="input-brand pr-9 py-2 text-sm" />
          </div>
          <button type="submit" className="btn-brand px-4 py-2 rounded-xl text-sm">بحث</button>
          <button type="button" onClick={() => { setSearch(''); setPage(1) }}
            className="px-3 py-2 rounded-xl text-slate-400 hover:text-white bg-navy-700/60 border border-white/6 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 glass-card animate-pulse bg-navy-700/40 rounded-xl" />)
        ) : logs.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">لا توجد أحداث</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className="glass-card p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-navy-700/60 flex items-center justify-center flex-shrink-0 text-lg">
                {ENTITY_ICONS[log.entityType] ?? '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-200">
                      <span className="font-bold text-brand-cyan">{log.userName ?? 'النظام'}</span>
                      {' — '}{log.action}
                      {log.entityName && <span className="text-slate-400"> ({log.entityName})</span>}
                    </p>
                    {log.details && <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>}
                  </div>
                  <div className="flex-shrink-0 text-left">
                    <p className="text-xs text-slate-500">{formatRelativeTime(log.createdAt)}</p>
                    <p className="text-xs text-slate-600">{formatDate(log.createdAt)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 bg-navy-700/60 border border-white/6 text-sm transition-all">
            السابق
          </button>
          <span className="text-sm text-slate-300">صفحة {page} من {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 bg-navy-700/60 border border-white/6 text-sm transition-all">
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
