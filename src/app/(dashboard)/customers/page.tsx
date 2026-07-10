'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users, Plus, Search, Filter, Trash2, Edit, Eye, Phone, Mail,
  ChevronLeft, ChevronRight, RefreshCw, Download, Upload,
  FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2,
  CheckSquare, Square, Minus, ChevronDown, Facebook
} from 'lucide-react'
import {
  formatDate, CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_COLORS, CUSTOMER_SOURCE_LABELS, cn
} from '@/lib/utils'
import { usePermissions } from '@/lib/usePermissions'
import { sheetRowsToRecords } from '@/lib/spreadsheet'
import MetaImportModal from '@/components/MetaImportModal'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  source: string
  status: string
  createdAt: string
  assignedTo: { name: string } | null
  _count: { subscriptions: number; payments: number }
}

// ─── Excel Import Modal ────────────────────────────────────────────────
interface ImportRow {
  [key: string]: unknown
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null)
  const [fileObj, setFileObj] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const readFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف يجب ألا يتجاوز 5 ميجابايت')
      return
    }

    const extension = file.name.toLowerCase().split('.').pop()
    if (extension !== 'xlsx' && extension !== 'csv') {
      toast.error('الأنواع المدعومة هي .xlsx و .csv فقط')
      return
    }

    setFileName(file.name)
    setFileObj(file)
    setResult(null)

    try {
      let rows: Record<string, unknown>[]
      if (extension === 'csv') {
        const Papa = await import('papaparse')
        const parsed = Papa.default.parse<Record<string, unknown>>(await file.text(), {
          header: true,
          skipEmptyLines: 'greedy',
        })
        if (parsed.errors.length) throw new Error('INVALID_FILE')
        rows = parsed.data
      } else {
        const { readSheet } = await import('read-excel-file/browser')
        rows = sheetRowsToRecords(await readSheet(file))
      }
      setPreview(rows.slice(0, 10) as ImportRow[])
    } catch {
      setFileObj(null)
      setPreview([])
      toast.error('تعذر قراءة الملف')
    }
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  const handleImport = async () => {
    if (!fileObj) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', fileObj)
      const res = await fetch('/api/customers/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        toast.success(`تم استيراد ${data.added} عميل بنجاح`)
        onDone()
      } else {
        toast.error(data.error ?? 'فشل الاستيراد')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setImporting(false)
    }
  }

  const previewCols = preview.length > 0 ? Object.keys(preview[0]).slice(0, 6) : []

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="glass-card w-full max-w-3xl pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">استيراد عملاء من Excel</h2>
                <p className="text-xs text-slate-500 mt-0.5">يدعم ملفات .xlsx و .csv حتى 5 ميجابايت</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            {!result ? (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                    dragOver
                      ? 'border-brand-cyan bg-brand-cyan/10'
                      : 'border-white/12 hover:border-brand-cyan/50 hover:bg-white/3'
                  )}
                >
                  <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFilePick} />
                  <Upload className={cn('w-10 h-10 mx-auto mb-3 transition-colors', dragOver ? 'text-brand-cyan' : 'text-slate-500')} />
                  {fileName ? (
                    <div>
                      <p className="text-sm font-semibold text-brand-cyan">{fileName}</p>
                      <p className="text-xs text-slate-500 mt-1">اضغط لتغيير الملف</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-300">اسحب الملف هنا أو اضغط للاختيار</p>
                      <p className="text-xs text-slate-500 mt-1">.xlsx / .csv</p>
                    </div>
                  )}
                </div>

                {/* Column mapping hint */}
                <div className="glass-card p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                  <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    الأعمدة المدعومة في الملف
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['الاسم', 'الإيميل', 'رقم الهاتف', 'واتساب', 'الخطة المشترك فيها', 'ملاحظات', 'السعر', 'تاريخ الاشتراك', 'تاريخ الانتهاء', 'تم الدفع', 'الوالد سيبس'].map(col => (
                      <span key={col} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 text-xs font-mono">{col}</span>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                {preview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-2">
                      معاينة أول {Math.min(preview.length, 10)} صفوف
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-white/8">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/8 bg-navy-700/50">
                            {previewCols.map(col => (
                              <th key={col} className="px-3 py-2 text-right text-slate-400 font-semibold whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                          {preview.map((row, i) => (
                            <tr key={i} className="hover:bg-white/2 transition-colors">
                              {previewCols.map(col => (
                                <td key={col} className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-[150px] truncate">
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Result screen */
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">اكتمل الاستيراد</p>
                  <p className="text-slate-400 text-sm mt-1">تم معالجة الملف بنجاح</p>
                </div>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black text-green-400">{result.added}</p>
                    <p className="text-xs text-slate-500 mt-1">تم إضافتهم</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-amber-400">{result.skipped}</p>
                    <p className="text-xs text-slate-500 mt-1">تم تخطيهم</p>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="glass-card p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-right">
                    <p className="text-xs text-red-400 font-semibold mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      أخطاء في {result.errors.length} صف
                    </p>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-300/70">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-5 border-t border-white/8 flex-shrink-0">
            {result ? (
              <button onClick={onClose} className="btn-brand flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
                تم
              </button>
            ) : (
              <>
                <button
                  onClick={handleImport}
                  disabled={!fileObj || importing}
                  className="btn-brand flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl disabled:opacity-60"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing ? 'جارٍ الاستيراد...' : `استيراد ${preview.length > 0 ? `(${preview.length}+ صف)` : ''}`}
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
  )
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { can } = usePermissions()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [showImport, setShowImport] = useState(false)
  const [showMetaImport, setShowMetaImport] = useState(false)
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const source = searchParams.get('source') ?? ''

  const [searchInput, setSearchInput] = useState(search)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (source) params.set('source', source)
      params.set('page', String(page))

      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch {
      toast.error('فشل تحميل العملاء')
    } finally {
      setLoading(false)
    }
  }, [search, status, source, page])

  useEffect(() => { fetchCustomers(); setSelected(new Set()) }, [fetchCustomers])



  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    params.set('search', searchInput)
    params.set('page', '1')
    router.push(`/customers?${params}`)
  }

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1')
    router.push(`/customers?${params}`)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف العميل "${name}"؟ سيتم حذف جميع اشتراكاته ومدفوعاته.`)) return
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف العميل بنجاح')
        fetchCustomers()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'فشل الحذف')
      }
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleExport = () => {
    window.open('/api/export?type=customers', '_blank')
  }

  // Bulk helpers
  const allIds = customers.map(c => c.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds))
  const toggleOne = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleBulkDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف ${selected.size} عميل؟ سيتم حذف جميع اشتراكاتهم ومدفوعاتهم.`)) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/customers/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(`تم حذف ${data.deleted} عميل`); fetchCustomers() }
      else toast.error(data.error ?? 'فشل الحذف')
    } catch { toast.error('حدث خطأ') } finally { setBulkLoading(false) }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    setShowBulkMenu(false)
    setBulkLoading(true)
    try {
      const res = await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(`تم تحديث حالة ${data.affected} عميل`); fetchCustomers() }
      else toast.error(data.error ?? 'فشل التحديث')
    } catch { toast.error('حدث خطأ') } finally { setBulkLoading(false) }
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-cyan" />
            العملاء
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إجمالي {total.toLocaleString('ar-EG')} عميل
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('reports:export') && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowMetaImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-blue-300 hover:text-blue-100 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 hover:border-blue-500/50 transition-all"
          >
            <Facebook className="w-4 h-4" />
            <span className="hidden sm:inline">استيراد من Meta</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-green-300 hover:text-green-100 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 hover:border-green-500/50 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">استيراد Excel</span>
          </button>
          <Link
            href="/customers/new"
            className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة عميل
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="glass-card p-3 flex items-center gap-3 border border-brand-cyan/20 bg-brand-cyan/5"
          >
            <span className="text-sm font-bold text-brand-cyan">تم تحديد {selected.size} عميل</span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Change Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(v => !v)}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 hover:bg-white/12 border border-white/12 text-slate-300 transition-all disabled:opacity-60"
                >
                  تغيير الحالة <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showBulkMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowBulkMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full mt-1 right-0 bg-navy-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]"
                      >
                        {Object.entries(CUSTOMER_STATUS_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => handleBulkStatusUpdate(key)}
                            className="w-full text-right px-3 py-2 text-sm text-slate-300 hover:bg-white/6 hover:text-white transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Bulk Delete */}
              {can('customers:delete') && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-all disabled:opacity-60"
                >
                  {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  حذف المحدد
                </button>
              )}
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو البريد..."
              className="input-brand pr-9 py-2 text-sm"
            />
          </div>
          <button type="submit" className="btn-brand px-4 py-2 rounded-xl text-sm">
            بحث
          </button>
          {(search || status || source) && (
            <button
              type="button"
              onClick={() => router.push('/customers')}
              className="px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white bg-navy-700/60 hover:bg-navy-700 border border-white/6 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="input-brand py-1.5 text-xs w-auto min-w-[120px]"
          >
            <option value="">كل الحالات</option>
            {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => handleFilter('source', e.target.value)}
            className="input-brand py-1.5 text-xs w-auto min-w-[120px]"
          >
            <option value="">كل المصادر</option>
            {Object.entries(CUSTOMER_SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-navy-700/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg font-semibold">لا يوجد عملاء</p>
            <p className="text-slate-600 text-sm mt-1">ابدأ بإضافة عميل جديد أو استيراد العملاء</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Link href="/customers/new" className="btn-brand inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
                <Plus className="w-4 h-4" />
                إضافة عميل
              </Link>
              <button
                onClick={() => setShowMetaImport(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-blue-300 bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 transition-all"
              >
                <Facebook className="w-4 h-4" />
                استيراد من Meta
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-green-300 bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                استيراد Excel
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-3 py-3 w-10">
                    <button type="button" onClick={toggleAll} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-brand-cyan" /> :
                        someSelected ? <Minus className="w-4 h-4 text-brand-cyan" /> :
                        <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">العميل</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">الاتصال</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">الاشتراكات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">تاريخ الإضافة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {customers.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn('table-row-hover', selected.has(customer.id) && 'bg-brand-cyan/5')}
                  >
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => toggleOne(customer.id)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        {selected.has(customer.id) ? <CheckSquare className="w-4 h-4 text-brand-cyan" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-cyan/30 to-brand-lime/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-brand-cyan">{customer.name.charAt(0)}</span>
                        </div>
                        <div>
                          <Link href={`/customers/${customer.id}`} className="font-semibold text-slate-100 hover:text-brand-cyan transition-colors">
                            {customer.name}
                          </Link>
                          {customer.company && (
                            <p className="text-xs text-slate-500">{customer.company}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <p className="text-sm text-slate-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.email && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', CUSTOMER_STATUS_COLORS[customer.status])}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-slate-300 font-semibold">{customer._count.subscriptions}</span>
                      <span className="text-xs text-slate-500 mr-1">اشتراك</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-400">{formatDate(customer.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/customers/${customer.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-lime hover:bg-brand-lime/10 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {can('customers:delete') && (
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleFilter('page', String(Math.max(1, page - 1)))}
            disabled={page === 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed bg-navy-700/60 border border-white/6 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300 px-3">
            صفحة {page} من {pages}
          </span>
          <button
            onClick={() => handleFilter('page', String(Math.min(pages, page + 1)))}
            disabled={page === pages}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed bg-navy-700/60 border border-white/6 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import Modal */}
      <AnimatePresence>
        {showImport && (
          <ImportModal
            onClose={() => setShowImport(false)}
            onDone={() => {
              fetchCustomers()
            }}
          />
        )}
      </AnimatePresence>

      <MetaImportModal
        isOpen={showMetaImport}
        onClose={() => setShowMetaImport(false)}
        onDone={() => {
          fetchCustomers()
        }}
      />
    </div>
  )
}
