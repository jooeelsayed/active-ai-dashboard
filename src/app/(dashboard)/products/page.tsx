'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Package, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { formatCurrency, PRODUCT_CATEGORY_LABELS, ACCOUNT_TYPE_LABELS, cn } from '@/lib/utils'

interface Product {
  id: string; name: string; provider: string; category: string; planName: string;
  durationDays: number; sellingPrice: number; costPrice: number; isActive: boolean;
  accountType: string; description: string | null; _count: { subscriptions: number }
}

interface ProductFormState {
  id?: string; name: string; provider: string; category: string; planName: string;
  durationDays: string; sellingPrice: string; costPrice: string; isActive: boolean;
  accountType: string; description: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProductFormState>({
    name: '', provider: '', category: 'OTHER', planName: '', durationDays: '30',
    sellingPrice: '', costPrice: '', isActive: true, accountType: 'INDIVIDUAL', description: '',
  })

  const fetchProducts = async () => {
    setLoading(true)
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
    fetch('/api/auth/session').then(r => r.json()).then(s => setUserRole(s?.user?.role ?? ''))
  }, [])

  const openNew = () => {
    setForm({ name: '', provider: '', category: 'OTHER', planName: '', durationDays: '30', sellingPrice: '', costPrice: '', isActive: true, accountType: 'INDIVIDUAL', description: '' })
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setForm({ id: p.id, name: p.name, provider: p.provider, category: p.category, planName: p.planName, durationDays: String(p.durationDays), sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice), isActive: p.isActive, accountType: p.accountType, description: p.description ?? '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const url = form.id ? `/api/products/${form.id}` : '/api/products'
      const method = form.id ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) { toast.success(form.id ? 'تم التحديث' : 'تم الإضافة'); setModalOpen(false); fetchProducts() }
      else toast.error(data.error ?? 'فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`)) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); fetchProducts() }
    else toast.error('فشل الحذف')
  }

  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER'
  const profit = (Number(form.sellingPrice) - Number(form.costPrice))

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-cyan" />
            المنتجات والخدمات
          </h1>
          <p className="text-slate-400 text-sm mt-1">{products.length} منتج مسجل</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة منتج
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 glass-card animate-pulse bg-navy-700/40" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-xl font-bold">لا توجد منتجات</p>
          <button onClick={openNew} className="btn-brand inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة أول منتج
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={cn('glass-card glass-card-hover p-5 space-y-3', !product.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-100">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.provider}</p>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-lime hover:bg-brand-lime/10 transition-all">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {product.isActive ? <ToggleRight className="w-4 h-4 text-brand-lime" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="badge text-xs border-brand-cyan/20 text-brand-cyan bg-brand-cyan/10">{PRODUCT_CATEGORY_LABELS[product.category]}</span>
                <span className="badge text-xs border-white/10 text-slate-400">{product.planName}</span>
                <span className="badge text-xs border-white/10 text-slate-400">{product.durationDays} يوم</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-brand-cyan">{formatCurrency(product.sellingPrice)}</p>
                  <p className="text-xs text-slate-600">البيع</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400">{formatCurrency(product.costPrice)}</p>
                  <p className="text-xs text-slate-600">التكلفة</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-lime">{formatCurrency(Number(product.sellingPrice) - Number(product.costPrice))}</p>
                  <p className="text-xs text-slate-600">الربح</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/6">
                <span className="text-xs text-slate-500">{ACCOUNT_TYPE_LABELS[product.accountType]}</span>
                <span className="text-xs text-brand-cyan font-semibold">{product._count.subscriptions} اشتراك</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-xl p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-slate-100 text-lg">{form.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">اسم المنتج <span className="text-red-400">*</span></label>
                  <input required className="input-brand text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">المزود <span className="text-red-400">*</span></label>
                  <input required className="input-brand text-sm" placeholder="مثال: OpenAI" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">الفئة</label>
                  <select className="input-brand text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {Object.entries(PRODUCT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="block text-xs text-slate-400 mb-1">اسم الخطة <span className="text-red-400">*</span></label>
                  <input required className="input-brand text-sm" placeholder="مثال: Pro / Plus" value={form.planName} onChange={e => setForm(p => ({ ...p, planName: e.target.value }))} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">مدة الاشتراك (يوم)</label>
                  <input type="number" min="1" className="input-brand text-sm" value={form.durationDays} onChange={e => setForm(p => ({ ...p, durationDays: e.target.value }))} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">نوع الحساب</label>
                  <select className="input-brand text-sm" value={form.accountType} onChange={e => setForm(p => ({ ...p, accountType: e.target.value }))}>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="block text-xs text-slate-400 mb-1">سعر البيع (ج.م)</label>
                  <input type="number" min="0" step="0.01" className="input-brand text-sm" value={form.sellingPrice} onChange={e => setForm(p => ({ ...p, sellingPrice: e.target.value }))} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">سعر التكلفة (ج.م)</label>
                  <input type="number" min="0" step="0.01" className="input-brand text-sm" value={form.costPrice} onChange={e => setForm(p => ({ ...p, costPrice: e.target.value }))} /></div>
              </div>
              {(form.sellingPrice || form.costPrice) && (
                <div className={cn('text-center text-sm font-bold py-2 rounded-lg', profit >= 0 ? 'bg-brand-lime/10 text-brand-lime' : 'bg-red-500/10 text-red-400')}>
                  الربح المتوقع: {profit.toFixed(2)} ج.م
                </div>
              )}
              <div><label className="block text-xs text-slate-400 mb-1">وصف (اختياري)</label>
                <textarea rows={2} className="input-brand text-sm resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-300 font-medium">حالة المنتج:</label>
                <button type="button" onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    form.isActive ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime' : 'bg-slate-700/40 border-white/10 text-slate-400')}>
                  {form.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {form.isActive ? 'نشط' : 'غير نشط'}
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2 rounded-xl text-sm disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} حفظ
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-navy-700 border border-white/6 text-sm transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
