'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  UserCog, Plus, Edit2, Power, Key, Trash2, Loader2,
  Shield, User, Mail, Phone, X, Eye, EyeOff, ChevronDown, ChevronUp,
  Lock, Unlock, CheckCircle2, AlertTriangle, Save, RotateCcw
} from 'lucide-react'
import { formatDate, ROLE_LABELS, cn } from '@/lib/utils'
import {
  PERMISSION_LABELS, DEFAULT_ROLE_PERMISSIONS, ROLE_MAX_PERMISSIONS, type Permission
} from '@/lib/rbac'

interface Employee {
  id: string; name: string; email: string; role: string; isActive: boolean;
  phone: string | null; createdAt: string;
  _count: { assignedCustomers: number; subscriptions: number; payments: number }
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    'text-brand-cyan border-brand-cyan/30 bg-brand-cyan/10',
  MANAGER:  'text-brand-lime border-brand-lime/30 bg-brand-lime/10',
  EMPLOYEE: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  READONLY: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
}

// ─── Toggle Component ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 flex-shrink-0',
        checked ? 'bg-brand-cyan' : 'bg-slate-700', disabled && 'opacity-40 cursor-not-allowed')}>
      <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-1')} />
    </button>
  )
}

// ─── Permission Section ─────────────────────────────────────────────────────
function PermSection({ section, allPerms, enabled, maxAllowed, onChange }: {
  section: string; allPerms: Permission[]; enabled: Permission[]; maxAllowed: Permission[]; onChange: (p: Permission, v: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const sPerms = allPerms.filter(p => PERMISSION_LABELS[p]?.section === section)
  const enabledCount = sPerms.filter(p => enabled.includes(p)).length

  const SECTION_COLORS: Record<string, string> = {
    'العملاء': 'text-brand-cyan', 'المنتجات': 'text-brand-lime', 'الاشتراكات': 'text-blue-400',
    'المدفوعات': 'text-green-400', 'الموظفون': 'text-purple-400', 'التقارير والنشاط': 'text-amber-400', 'الإعدادات': 'text-slate-400',
  }
  const color = SECTION_COLORS[section] ?? 'text-slate-400'

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white/4 hover:bg-white/6 transition-colors">
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold text-sm', color)}>{section}</span>
          <span className="text-xs text-slate-500 bg-black/20 px-2 py-0.5 rounded-full">{enabledCount}/{sPerms.length}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="divide-y divide-white/5">
              {sPerms.map(perm => {
                const isMax = maxAllowed.includes(perm)
                return (
                  <div key={perm} className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2 flex-1">
                      {isMax ? <Unlock className="w-3 h-3 text-slate-500 flex-shrink-0" /> : <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                      <span className={cn('text-sm', isMax ? 'text-slate-200' : 'text-slate-600 line-through')}>
                        {PERMISSION_LABELS[perm]?.label}
                      </span>
                      {!isMax && <span className="text-xs text-slate-700 bg-slate-800/60 px-1.5 py-0.5 rounded">غير متاح للدور</span>}
                    </div>
                    <Toggle checked={enabled.includes(perm)} onChange={v => onChange(perm, v)} disabled={!isMax} />
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Employee Drawer ────────────────────────────────────────────────────────
function EmployeeDrawer({ emp, myRole, onClose, onSaved }: {
  emp: Employee; myRole: string; onClose: () => void; onSaved: () => void
}) {
  const [tab, setTab] = useState<'info' | 'permissions'>('info')
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Info form
  const [form, setForm] = useState({
    name: emp.name, email: emp.email, phone: emp.phone ?? '',
    role: emp.role, isActive: emp.isActive, password: '',
  })

  // Permissions
  const maxPerms = ROLE_MAX_PERMISSIONS[form.role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
  const allPerms = Object.keys(PERMISSION_LABELS) as Permission[]
  const allSections = [...new Set(allPerms.map(p => PERMISSION_LABELS[p].section))]

  const [useCustomPerms, setUseCustomPerms] = useState(false)
  const [customPerms, setCustomPerms] = useState<Permission[]>([...(DEFAULT_ROLE_PERMISSIONS[emp.role] ?? [])])
  const [loadingPerms, setLoadingPerms] = useState(true)

  // Load this employee's current effective permissions + check if they have a custom override
  useEffect(() => {
    setLoadingPerms(true)
    fetch('/api/permissions')
      .then(r => r.json())
      .then(data => {
        const userKey = `user:${emp.id}`
        const hasOverride = !!data.overrides?.[userKey]
        if (hasOverride) {
          setUseCustomPerms(true)
          setCustomPerms((data.overrides[userKey] as Permission[]) ?? [])
        } else {
          setUseCustomPerms(false)
          setCustomPerms([...(DEFAULT_ROLE_PERMISSIONS[emp.role] ?? [])])
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPerms(false))
  }, [emp.id, emp.role])

  // Reset custom perms when toggling off
  useEffect(() => {
    if (!useCustomPerms) {
      setCustomPerms([...(DEFAULT_ROLE_PERMISSIONS[form.role] ?? [])])
    }
  }, [useCustomPerms, form.role])

  const handleSaveInfo = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name, email: form.email, phone: form.phone || null,
        role: form.role, isActive: form.isActive,
      }
      if (form.password) payload.password = form.password

      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) { toast.success('تم حفظ البيانات'); onSaved() }
      else toast.error(data.error ?? 'فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleSavePermissions = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          useCustomPerms
            ? { userId: emp.id, userRole: emp.role, permissions: customPerms }
            : { userId: emp.id, permissions: null } // reset to role defaults
        ),
      })
      const data = await res.json()
      if (res.ok) { toast.success('تم حفظ الصلاحيات'); onSaved() }
      else toast.error(data.error ?? 'فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleTogglePerm = (perm: Permission, value: boolean) => {
    setCustomPerms(prev => value ? [...prev, perm] : prev.filter(p => p !== perm))
  }

  const isAdmin = myRole === 'ADMIN'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="relative z-50 w-full sm:max-w-2xl max-h-[92vh] flex flex-col glass-card rounded-2xl overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan/30 to-brand-lime/30 flex items-center justify-center">
              <span className="text-base font-bold text-brand-cyan">{emp.name.charAt(0)}</span>
            </div>
            <div>
              <p className="font-bold text-slate-100">{emp.name}</p>
              <p className="text-xs text-slate-500">{emp.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0">
          {[
            { key: 'info', label: 'بيانات الحساب', icon: <User className="w-3.5 h-3.5" /> },
            { key: 'permissions', label: 'الصلاحيات', icon: <Shield className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                tab === t.key ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
          <AnimatePresence mode="wait">
            {/* ── Info Tab ─────────────────────────────── */}
            {tab === 'info' && (
              <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                      <User className="w-3 h-3" />الاسم الكامل
                    </label>
                    <input className="input-brand text-sm" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                      <Mail className="w-3 h-3" />البريد الإلكتروني
                    </label>
                    <input type="email" className="input-brand text-sm" value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  {/* Phone */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                      <Phone className="w-3 h-3" />الهاتف
                    </label>
                    <input type="tel" className="input-brand text-sm" value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  {/* Role */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                      <Shield className="w-3 h-3" />الصلاحية
                    </label>
                    <select className="input-brand text-sm" value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      disabled={!isAdmin}>
                      {isAdmin && <option value="ADMIN">مدير عام</option>}
                      {isAdmin && <option value="MANAGER">مدير</option>}
                      <option value="EMPLOYEE">موظف</option>
                      <option value="READONLY">قراءة فقط</option>
                    </select>
                  </div>
                </div>

                {/* Password (ADMIN only) */}
                {isAdmin && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                      <Key className="w-3 h-3" />تغيير كلمة المرور (اتركها فارغة إذا لم تريد تغييرها)
                    </label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} minLength={8}
                        className="input-brand text-sm pl-10" value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="كلمة مرور جديدة..." />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Toggle */}
                <div className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">حالة الحساب</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {form.isActive ? 'الحساب نشط — يمكن للموظف تسجيل الدخول' : 'الحساب معطّل — لا يستطيع تسجيل الدخول'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-semibold', form.isActive ? 'text-brand-lime' : 'text-red-400')}>
                      {form.isActive ? 'نشط' : 'معطّل'}
                    </span>
                    <Toggle checked={form.isActive} onChange={v => setForm(p => ({ ...p, isActive: v }))} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'عملاء', value: emp._count.assignedCustomers, color: 'text-brand-cyan' },
                    { label: 'اشتراكات', value: emp._count.subscriptions, color: 'text-blue-400' },
                    { label: 'مدفوعات', value: emp._count.payments, color: 'text-green-400' },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-3 text-center">
                      <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <button onClick={handleSaveInfo} disabled={saving}
                  className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm w-full justify-center disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ البيانات
                </button>
              </motion.div>
            )}

            {/* ── Permissions Tab ───────────────────────── */}
            {tab === 'permissions' && (
              <motion.div key="perms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Custom override toggle */}
                <div className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">صلاحيات مخصصة لهذا الموظف</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {useCustomPerms ? 'يستخدم صلاحيات مخصصة (تتجاوز صلاحيات الدور)' : 'يرث صلاحيات الدور الافتراضية'}
                    </p>
                  </div>
                  <Toggle checked={useCustomPerms} onChange={setUseCustomPerms} />
                </div>

                {useCustomPerms ? (
                  loadingPerms ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
                    </div>
                  ) : (
                    <>
                      {/* Quick actions */}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setCustomPerms([...maxPerms])}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-lime/10 text-brand-lime border border-brand-lime/20 hover:bg-brand-lime/20 transition-all">
                          <CheckCircle2 className="w-3.5 h-3.5" />تحديد الكل
                        </button>
                        <button type="button" onClick={() => setCustomPerms([])}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                          <X className="w-3.5 h-3.5" />إلغاء الكل
                        </button>
                        <button type="button" onClick={() => setCustomPerms([...(DEFAULT_ROLE_PERMISSIONS[form.role] ?? [])])}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/6 text-slate-400 border border-white/10 hover:bg-white/10 transition-all">
                          <RotateCcw className="w-3.5 h-3.5" />إعادة ضبط الدور
                        </button>
                      </div>

                      {/* Permission sections */}
                      <div className="space-y-2">
                        {allSections.map(section => (
                          <PermSection
                            key={section} section={section} allPerms={allPerms}
                            enabled={customPerms} maxAllowed={maxPerms} onChange={handleTogglePerm}
                          />
                        ))}
                      </div>

                    </>
                  )
                ) : (
                  <div className="glass-card p-6 text-center space-y-2">
                    <Shield className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-sm">هذا الموظف يرث صلاحيات دور <strong className="text-slate-300">{ROLE_LABELS[form.role as keyof typeof ROLE_LABELS] ?? form.role}</strong></p>
                    <p className="text-xs text-slate-600">فعّل الخيار أعلاه لتخصيص صلاحيات هذا الموظف بشكل منفرد</p>
                  </div>
                )}

                <button onClick={handleSavePermissions} disabled={saving}
                  className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm w-full justify-center disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ الصلاحيات
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Employees Page ────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [modalMode, setModalMode] = useState<'add' | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', phone: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEmployees()
    fetch('/api/auth/session').then(r => r.json()).then(s => setUserRole(s?.user?.role ?? ''))
  }, [fetchEmployees])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إضافة الموظف')
        setModalMode(null)
        setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', phone: '' })
        fetchEmployees()
      } else toast.error(data.error ?? 'فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`هل أنت متأكد من حذف حساب "${emp.name}" نهائياً؟`)) return
    setDeletingId(emp.id)
    try {
      const res = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('تم حذف الحساب'); fetchEmployees() }
      else { const d = await res.json(); toast.error(d.error ?? 'فشل الحذف') }
    } catch { toast.error('حدث خطأ') } finally { setDeletingId(null) }
  }

  const canManage = userRole === 'ADMIN' || userRole === 'MANAGER'
  const isAdmin = userRole === 'ADMIN'

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-brand-cyan" />الموظفون
          </h1>
          <p className="text-slate-400 text-sm mt-1">{employees.length} موظف</p>
        </div>
        {canManage && (
          <button onClick={() => setModalMode('add')} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة موظف
          </button>
        )}
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 glass-card animate-pulse bg-navy-700/40" />)}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6">
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الموظف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الصلاحية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">الإحصائيات</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 hidden md:table-cell">تاريخ الإضافة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">الحالة</th>
                {canManage && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {employees.map((emp, i) => (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-cyan/30 to-brand-lime/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-brand-cyan">{emp.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-100 text-sm">{emp.name}</p>
                          {emp.role !== 'ADMIN' && (
                            <span title="صلاحيات مخصصة" className="w-4 h-4 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center">
                              <Shield className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge text-xs', ROLE_COLORS[emp.role])}>
                      {ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS] ?? emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-slate-400">{emp._count.assignedCustomers} عميل، {emp._count.subscriptions} اشتراك</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-400">{formatDate(emp.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge text-xs', emp.isActive
                      ? 'text-brand-lime border-brand-lime/30 bg-brand-lime/10'
                      : 'text-slate-500 border-slate-500/30 bg-slate-500/10')}>
                      {emp.isActive ? 'نشط' : 'معطّل'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button onClick={() => setSelectedEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                          title="تعديل الحساب والصلاحيات">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Delete */}
                        {isAdmin && (
                          <button onClick={() => handleDelete(emp)} disabled={deletingId === emp.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                            title="حذف الحساب">
                            {deletingId === emp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Drawer */}
      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeDrawer
            emp={selectedEmployee}
            myRole={userRole}
            onClose={() => setSelectedEmployee(null)}
            onSaved={() => { fetchEmployees(); setSelectedEmployee(null) }}
          />
        )}
      </AnimatePresence>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {modalMode === 'add' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-100 text-lg">إضافة موظف جديد</h3>
                <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الاسم الكامل</label>
                  <input required className="input-brand text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">البريد الإلكتروني</label>
                  <input required type="email" className="input-brand text-sm" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">كلمة المرور (٨ أحرف على الأقل)</label>
                  <input required type="password" minLength={8} className="input-brand text-sm" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الصلاحية</label>
                  <select className="input-brand text-sm" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    {isAdmin && <option value="ADMIN">مدير عام</option>}
                    {isAdmin && <option value="MANAGER">مدير</option>}
                    <option value="EMPLOYEE">موظف</option>
                    <option value="READONLY">قراءة فقط</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">رقم الهاتف</label>
                  <input type="tel" className="input-brand text-sm" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2 rounded-xl text-sm flex-1 justify-center disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}حفظ
                  </button>
                  <button type="button" onClick={() => setModalMode(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-navy-700 border border-white/6 text-sm transition-all">
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
