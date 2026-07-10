'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Facebook,
  FileText,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Square,
  Unlink,
  UploadCloud,
  X,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  onDone: () => void
}

interface MetaStatus {
  connected: boolean
  page?: { id: string; name: string }
  connectedAt?: string
  connectionError?: string
  managedByEnvironment?: boolean
  graphVersion?: string
}

interface MetaForm {
  id: string
  name: string
  status?: string
}

interface MetaLead {
  id: string
  createdTime: string | null
  adName: string | null
  name: string
  email: string | null
  phone: string | null
  imported?: boolean
}

interface ImportResult {
  added: number
  skipped: number
  alreadyImported: number
  duplicateContacts: number
  missing: number
}

async function responseError(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: string }
    return data.error || fallback
  } catch {
    return fallback
  }
}

export default function MetaImportModal({ isOpen, onClose, onDone }: Props) {
  const [status, setStatus] = useState<MetaStatus | null>(null)
  const [forms, setForms] = useState<MetaForm[]>([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [leads, setLeads] = useState<MetaLead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [pageId, setPageId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingForms, setLoadingForms] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const importableLeadIds = useMemo(
    () => leads.filter((lead) => !lead.imported).map((lead) => lead.id),
    [leads]
  )
  const allImportableSelected = importableLeadIds.length > 0 &&
    importableLeadIds.every((id) => selectedLeadIds.has(id))

  const loadForms = async () => {
    setLoadingForms(true)
    try {
      const response = await fetch('/api/meta/forms')
      if (!response.ok) throw new Error(await responseError(response, 'تعذر تحميل نماذج Meta'))
      const data = await response.json() as { forms?: MetaForm[] }
      setForms(data.forms ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل نماذج Meta')
      setForms([])
    } finally {
      setLoadingForms(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    async function loadStatus() {
      setLoadingStatus(true)
      setResult(null)
      setSelectedFormId('')
      setLeads([])
      setSelectedLeadIds(new Set())
      try {
        const response = await fetch('/api/meta/status')
        if (!response.ok) throw new Error(await responseError(response, 'تعذر قراءة حالة Meta'))
        const data = await response.json() as MetaStatus
        if (cancelled) return
        setStatus(data)
        if (data.connected) void loadForms()
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'تعذر قراءة حالة Meta')
          setStatus({ connected: false })
        }
      } finally {
        if (!cancelled) setLoadingStatus(false)
      }
    }

    void loadStatus()
    return () => { cancelled = true }
  }, [isOpen])

  const connect = async (event: React.FormEvent) => {
    event.preventDefault()
    setConnecting(true)
    try {
      const response = await fetch('/api/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, accessToken }),
      })
      if (!response.ok) throw new Error(await responseError(response, 'تعذر الاتصال بـ Meta'))
      const data = await response.json() as MetaStatus
      setStatus({ connected: true, page: data.page })
      setAccessToken('')
      toast.success('تم ربط Meta Business')
      await loadForms()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر الاتصال بـ Meta')
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch('/api/meta/connect', { method: 'DELETE' })
      if (!response.ok) throw new Error(await responseError(response, 'تعذر فصل الاتصال'))
      setStatus({ connected: false })
      setForms([])
      setLeads([])
      setSelectedLeadIds(new Set())
      setSelectedFormId('')
      toast.success('تم فصل Meta Business')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فصل الاتصال')
    } finally {
      setDisconnecting(false)
    }
  }

  const loadLeads = async (formId: string) => {
    if (!formId) return
    setLoadingLeads(true)
    setLeads([])
    setSelectedLeadIds(new Set())
    try {
      const response = await fetch(`/api/meta/leads?formId=${encodeURIComponent(formId)}`)
      if (!response.ok) throw new Error(await responseError(response, 'تعذر تحميل Leads'))
      const data = await response.json() as { leads?: MetaLead[] }
      const nextLeads = data.leads ?? []
      setLeads(nextLeads)
      setSelectedLeadIds(new Set(nextLeads.filter((lead) => !lead.imported).map((lead) => lead.id)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل Leads')
    } finally {
      setLoadingLeads(false)
    }
  }

  const toggleLead = (lead: MetaLead) => {
    if (lead.imported) return
    setSelectedLeadIds((current) => {
      const next = new Set(current)
      if (next.has(lead.id)) next.delete(lead.id)
      else next.add(lead.id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedLeadIds(allImportableSelected ? new Set() : new Set(importableLeadIds))
  }

  const importSelected = async () => {
    if (!selectedFormId || selectedLeadIds.size === 0) return
    setImporting(true)
    try {
      const response = await fetch('/api/meta/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: selectedFormId, leadIds: Array.from(selectedLeadIds) }),
      })
      if (!response.ok) throw new Error(await responseError(response, 'فشل استيراد عملاء Meta'))
      const data = await response.json() as ImportResult
      setResult(data)
      toast.success(`تم استيراد ${data.added} عميل من Meta`)
      onDone()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل استيراد عملاء Meta')
    } finally {
      setImporting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-card w-full max-w-5xl pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">استيراد عملاء من Meta Business</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lead Ads {status?.graphVersion ? `- Graph ${status.graphVersion}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {loadingStatus ? (
                  <div className="py-16 flex items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : result ? (
                  <div className="text-center py-6 space-y-5">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">اكتمل الاستيراد</p>
                      <p className="text-slate-400 text-sm mt-1">تمت معالجة Lead Ads المحددة</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                      <ResultStat label="تم إضافتهم" value={result.added} className="text-green-400" />
                      <ResultStat label="تم تخطيهم" value={result.skipped} className="text-amber-400" />
                      <ResultStat label="موجودين قبل كده" value={result.alreadyImported} className="text-blue-400" />
                      <ResultStat label="بيانات مكررة" value={result.duplicateContacts} className="text-slate-300" />
                    </div>
                  </div>
                ) : status?.connected ? (
                  <>
                    <div className="glass-card p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">الصفحة المتصلة</p>
                          <p className="text-sm font-bold text-white">{status.page?.name ?? 'Meta Business Page'}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            ID: {status.page?.id ?? 'غير متاح'}
                            {status.connectedAt ? ` - ${formatDate(status.connectedAt)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={loadForms}
                            disabled={loadingForms}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white bg-white/4 hover:bg-white/8 border border-white/6 transition-all disabled:opacity-60"
                          >
                            {loadingForms ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            تحديث
                          </button>
                          {!status.managedByEnvironment && (
                            <button
                              onClick={disconnect}
                              disabled={disconnecting}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-300 hover:text-red-100 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 transition-all disabled:opacity-60"
                            >
                              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                              فصل
                            </button>
                          )}
                        </div>
                      </div>
                      {status.connectionError && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs text-amber-200">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{status.connectionError}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                      <div className="glass-card p-4 rounded-xl border border-white/8 bg-white/[0.02] h-fit">
                        <label className="block text-xs font-semibold text-slate-300 mb-2">نموذج Lead Ads</label>
                        <div className="relative">
                          <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <select
                            value={selectedFormId}
                            onChange={(event) => {
                              const nextFormId = event.target.value
                              setSelectedFormId(nextFormId)
                              void loadLeads(nextFormId)
                            }}
                            className="input-brand pr-9"
                            disabled={loadingForms || forms.length === 0}
                          >
                            <option value="">اختار النموذج</option>
                            {forms.map((form) => (
                              <option key={form.id} value={form.id}>
                                {form.name}{form.status ? ` (${form.status})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          {loadingForms ? 'جارٍ تحميل النماذج...' : `${forms.length} نموذج متاح`}
                        </p>
                      </div>

                      <div className="glass-card rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/8">
                          <div>
                            <p className="text-sm font-bold text-white">Leads المتاحة</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {leads.length ? `${selectedLeadIds.size} محدد من ${importableLeadIds.length} قابل للاستيراد` : 'لا توجد بيانات معروضة'}
                            </p>
                          </div>
                          <button
                            onClick={toggleAll}
                            disabled={!importableLeadIds.length}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/6 hover:bg-white/10 border border-white/8 text-slate-300 transition-all disabled:opacity-50"
                          >
                            {allImportableSelected ? <CheckSquare className="w-4 h-4 text-brand-cyan" /> : <Square className="w-4 h-4" />}
                            تحديد الكل
                          </button>
                        </div>

                        {loadingLeads ? (
                          <div className="py-16 flex items-center justify-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : leads.length === 0 ? (
                          <div className="py-16 text-center">
                            <Facebook className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-400">اختار نموذج لعرض Leads</p>
                          </div>
                        ) : (
                          <div className="max-h-[420px] overflow-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-white/8">
                                <tr>
                                  <th className="px-3 py-3 w-10" />
                                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400">العميل</th>
                                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">الاتصال</th>
                                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 hidden lg:table-cell">المصدر</th>
                                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400">الحالة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/4">
                                {leads.map((lead) => (
                                  <tr
                                    key={lead.id}
                                    className={cn(
                                      'hover:bg-white/[0.03] transition-colors',
                                      lead.imported && 'opacity-55',
                                      selectedLeadIds.has(lead.id) && 'bg-brand-cyan/5'
                                    )}
                                  >
                                    <td className="px-3 py-3">
                                      <button
                                        type="button"
                                        onClick={() => toggleLead(lead)}
                                        disabled={lead.imported}
                                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:cursor-not-allowed"
                                      >
                                        {selectedLeadIds.has(lead.id)
                                          ? <CheckSquare className="w-4 h-4 text-brand-cyan" />
                                          : <Square className="w-4 h-4" />}
                                      </button>
                                    </td>
                                    <td className="px-3 py-3">
                                      <p className="font-semibold text-slate-100">{lead.name}</p>
                                      <p className="text-xs text-slate-500 mt-0.5">Lead ID: {lead.id}</p>
                                    </td>
                                    <td className="px-3 py-3 hidden md:table-cell">
                                      <div className="space-y-1">
                                        {lead.phone && (
                                          <p className="flex items-center gap-1.5 text-xs text-slate-300">
                                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                                            {lead.phone}
                                          </p>
                                        )}
                                        {lead.email && (
                                          <p className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                                            {lead.email}
                                          </p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 hidden lg:table-cell">
                                      <div className="space-y-1">
                                        {lead.createdTime && (
                                          <p className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                                            {formatDate(lead.createdTime)}
                                          </p>
                                        )}
                                        {lead.adName && <p className="text-xs text-slate-500 max-w-[220px] truncate">{lead.adName}</p>}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      {lead.imported ? (
                                        <span className="badge text-xs bg-amber-500/15 text-amber-300 border-amber-500/25">موجود</span>
                                      ) : (
                                        <span className="badge text-xs bg-green-500/15 text-green-300 border-green-500/25">جديد</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <form onSubmit={connect} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Page ID</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={pageId}
                          onChange={(event) => setPageId(event.target.value)}
                          className="input-brand"
                          placeholder="1234567890"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Page Access Token</label>
                        <input
                          type="password"
                          value={accessToken}
                          onChange={(event) => setAccessToken(event.target.value)}
                          className="input-brand"
                          placeholder="EAAB..."
                          required
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 text-xs text-blue-200">
                      يحتاج التوكن صلاحيات Lead Ads للصفحة. التوكن لا يظهر في الواجهة بعد الربط ويتم حفظه مشفراً في Cookie آمنة.
                    </div>
                    <button
                      type="submit"
                      disabled={connecting}
                      className="btn-brand flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-60"
                    >
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
                      {connecting ? 'جارٍ الربط...' : 'ربط Meta Business'}
                    </button>
                  </form>
                )}
              </div>

              <div className="flex items-center gap-3 p-5 border-t border-white/8 flex-shrink-0">
                {result ? (
                  <button onClick={onClose} className="btn-brand flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    تم
                  </button>
                ) : (
                  <>
                    <button
                      onClick={importSelected}
                      disabled={!status?.connected || !selectedFormId || selectedLeadIds.size === 0 || importing}
                      className="btn-brand flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl disabled:opacity-60"
                    >
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      {importing ? 'جارٍ الاستيراد...' : `استيراد ${selectedLeadIds.size || ''}`}
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/6 transition-all text-sm"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ResultStat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="glass-card p-3 rounded-xl border border-white/8 bg-white/[0.02]">
      <p className={cn('text-3xl font-black', className)}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}
