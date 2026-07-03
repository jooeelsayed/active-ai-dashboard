'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Settings, Save, Loader2, Shield, ChevronDown, ChevronUp,
  Lock, Unlock, Users, Package, ShoppingCart, CreditCard,
  UserCog, BarChart2, Activity, SlidersHorizontal, CheckCircle2
} from 'lucide-react'
import {
  PERMISSION_LABELS, DEFAULT_ROLE_PERMISSIONS, ROLE_MAX_PERMISSIONS, ROLE_LABELS,
  type Permission
} from '@/lib/rbac'
import { cn } from '@/lib/utils'

interface SettingsData {
  id: string; companyName: string; currency: string; reminderDays: number; whatsappTemplate: string
}

// ─── Permission section icons ──────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ReactNode> = {
  'العملاء':              <Users className="w-4 h-4" />,
  'المنتجات':             <Package className="w-4 h-4" />,
  'الاشتراكات':           <ShoppingCart className="w-4 h-4" />,
  'المدفوعات':            <CreditCard className="w-4 h-4" />,
  'الموظفون':             <UserCog className="w-4 h-4" />,
  'التقارير والنشاط':    <BarChart2 className="w-4 h-4" />,
  'الإعدادات':            <SlidersHorizontal className="w-4 h-4" />,
}

const SECTION_COLORS: Record<string, string> = {
  'العملاء':              'text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5',
  'المنتجات':             'text-brand-lime border-brand-lime/20 bg-brand-lime/5',
  'الاشتراكات':           'text-blue-400 border-blue-400/20 bg-blue-400/5',
  'المدفوعات':            'text-green-400 border-green-400/20 bg-green-400/5',
  'الموظفون':             'text-purple-400 border-purple-400/20 bg-purple-400/5',
  'التقارير والنشاط':    'text-amber-400 border-amber-400/20 bg-amber-400/5',
  'الإعدادات':            'text-slate-400 border-slate-400/20 bg-slate-400/5',
}

// ─── Editable roles (ADMIN is always full) ────────────────────────────────
const EDITABLE_ROLES = ['MANAGER', 'EMPLOYEE', 'READONLY'] as const
type EditableRole = typeof EDITABLE_ROLES[number]

// Group permissions by section
function groupBySection(perms: Permission[]) {
  const groups: Record<string, Permission[]> = {}
  for (const perm of perms) {
    const section = PERMISSION_LABELS[perm]?.section ?? 'أخرى'
    if (!groups[section]) groups[section] = []
    groups[section].push(perm)
  }
  return groups
}

// ─── Toggle Switch Component ───────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0',
        checked ? 'bg-brand-cyan' : 'bg-slate-700',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-1'
      )} />
    </button>
  )
}

// ─── Permission Section Card ───────────────────────────────────────────────
function PermissionSection({
  section, permissions, enabled, maxAllowed, onChange
}: {
  section: string
  permissions: Permission[]
  enabled: Permission[]
  maxAllowed: Permission[]
  onChange: (perm: Permission, value: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const sectionPerms = permissions.filter(p => PERMISSION_LABELS[p]?.section === section)
  const enabledCount = sectionPerms.filter(p => enabled.includes(p)).length
  const color = SECTION_COLORS[section] ?? 'text-slate-400 border-slate-400/20 bg-slate-400/5'

  return (
    <div className={cn('rounded-xl border overflow-hidden', color)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          {SECTION_ICONS[section]}
          <span className="font-semibold text-sm">{section}</span>
          <span className="text-xs opacity-60 bg-black/20 px-2 py-0.5 rounded-full">
            {enabledCount}/{sectionPerms.length}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-white/5 bg-navy-900/40">
              {sectionPerms.map(perm => {
                const isMax = maxAllowed.includes(perm)
                const isEnabled = enabled.includes(perm)
                return (
                  <div key={perm} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      {isMax ? (
                        <Unlock className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      )}
                      <span className={cn('text-sm', isMax ? 'text-slate-200' : 'text-slate-500 line-through')}>
                        {PERMISSION_LABELS[perm]?.label}
                      </span>
                      {!isMax && (
                        <span className="text-xs text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded">
                          غير متاح لهذا الدور
                        </span>
                      )}
                    </div>
                    <Toggle
                      checked={isEnabled}
                      onChange={v => onChange(perm, v)}
                      disabled={!isMax}
                    />
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

// ─── Main Settings Page ────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general')

  // General Settings
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Permissions
  const [activeRole, setActiveRole] = useState<EditableRole>('EMPLOYEE')
  const [rolePerms, setRolePerms] = useState<Record<EditableRole, Permission[]>>({
    MANAGER: [...(DEFAULT_ROLE_PERMISSIONS.MANAGER ?? [])],
    EMPLOYEE: [...(DEFAULT_ROLE_PERMISSIONS.EMPLOYEE ?? [])],
    READONLY: [...(DEFAULT_ROLE_PERMISSIONS.READONLY ?? [])],
  })
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [savingPerms, setSavingPerms] = useState(false)
  const [userRole, setUserRole] = useState('')

  // Load settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setSettings(d); setLoadingSettings(false) })
      .catch(() => setLoadingSettings(false))
  }, [])

  // Load current permissions overrides
  useEffect(() => {
    fetch('/api/permissions')
      .then(r => r.json())
      .then(data => {
        if (data.overrides) {
          setRolePerms(prev => ({
            ...prev,
            ...(data.overrides.MANAGER ? { MANAGER: data.overrides.MANAGER } : {}),
            ...(data.overrides.EMPLOYEE ? { EMPLOYEE: data.overrides.EMPLOYEE } : {}),
            ...(data.overrides.READONLY ? { READONLY: data.overrides.READONLY } : {}),
          }))
        }
        setUserRole(data.role ?? '')
        setLoadingPerms(false)
      })
      .catch(() => setLoadingPerms(false))
  }, [])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) toast.success('تم حفظ الإعدادات')
      else toast.error('فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSavingSettings(false) }
  }

  const handleTogglePerm = (perm: Permission, value: boolean) => {
    setRolePerms(prev => {
      const current = prev[activeRole]
      const updated = value
        ? [...current, perm]
        : current.filter(p => p !== perm)
      return { ...prev, [activeRole]: updated }
    })
  }

  const handleSavePermissions = async () => {
    setSavingPerms(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: activeRole, permissions: rolePerms[activeRole] }),
      })
      if (res.ok) {
        toast.success(`تم حفظ صلاحيات ${ROLE_LABELS[activeRole as keyof typeof ROLE_LABELS]}`)
        // Invalidate client cache
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('permissions-updated'))
        }
      }
      else toast.error('فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSavingPerms(false) }
  }

  const handleResetRole = () => {
    setRolePerms(prev => ({
      ...prev,
      [activeRole]: [...(DEFAULT_ROLE_PERMISSIONS[activeRole] ?? [])],
    }))
    toast('تم إعادة الضبط — اضغط حفظ لتأكيد التغييرات', { icon: '↩️' })
  }

  const allSections = [...new Set(Object.values(PERMISSION_LABELS).map(p => p.section))]
  const maxForRole = ROLE_MAX_PERMISSIONS[activeRole] ?? []

  const isAdmin = userRole === 'ADMIN'

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-cyan" />
          إعدادات النظام
        </h1>
        <p className="text-slate-400 text-sm mt-1">تخصيص إعدادات وصلاحيات النظام</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1">
        {[
          { key: 'general', label: 'الإعدادات العامة', icon: <Settings className="w-4 h-4" /> },
          { key: 'permissions', label: 'إدارة الصلاحيات', icon: <Shield className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              activeTab === tab.key
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── General Settings Tab ─────────────────────────────────────── */}
        {activeTab === 'general' && (
          <motion.form
            key="general"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={handleSaveSettings}
            className="space-y-5"
          >
            {loadingSettings ? (
              <div className="glass-card p-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
              </div>
            ) : !settings ? (
              <div className="glass-card p-10 text-center text-slate-400">فشل تحميل الإعدادات</div>
            ) : (
              <>
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

                <div className="glass-card p-6 space-y-4">
                  <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">نموذج رسالة واتساب</h2>
                  <p className="text-xs text-slate-500">
                    المتغيرات المتاحة:
                    {' '}<code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">{'{customerName}'}</code>،
                    {' '}<code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">{'{productName}'}</code>،
                    {' '}<code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">{'{endDate}'}</code>
                  </p>
                  <textarea rows={6} className="input-brand resize-none font-mono text-sm" value={settings.whatsappTemplate}
                    onChange={e => setSettings(p => p ? { ...p, whatsappTemplate: e.target.value } : null)} />
                  <div className="bg-navy-700/40 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">معاينة الرسالة:</p>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {settings.whatsappTemplate
                        .replace('{customerName}', 'أحمد محمود')
                        .replace('{productName}', 'ChatGPT Plus')
                        .replace('{endDate}', '15/08/2025')}
                    </p>
                  </div>
                </div>

                <div>
                  <button type="submit" disabled={savingSettings} className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-60">
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingSettings ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </>
            )}
          </motion.form>
        )}

        {/* ─── Permissions Tab ──────────────────────────────────────────── */}
        {activeTab === 'permissions' && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-5"
          >
            {!isAdmin ? (
              <div className="glass-card p-12 text-center space-y-3">
                <Lock className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400 font-semibold">إدارة الصلاحيات متاحة للمدير العام فقط</p>
              </div>
            ) : loadingPerms ? (
              <div className="glass-card p-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
              </div>
            ) : (
              <>
                {/* Info Banner */}
                <div className="glass-card p-4 border border-brand-cyan/15 bg-brand-cyan/5 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-brand-cyan">كيف تعمل الصلاحيات؟</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      المدير العام لا يتأثر بأي تغيير. الصلاحيات الرمادية غير متاحة لهذا الدور بطبيعته. باقي الصلاحيات يمكن تفعيلها أو تعطيلها.
                    </p>
                  </div>
                </div>

                {/* Role Selector */}
                <div className="flex gap-2">
                  {EDITABLE_ROLES.map(role => {
                    const permsCount = rolePerms[role].length
                    const maxCount = (ROLE_MAX_PERMISSIONS[role] ?? []).length
                    return (
                      <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={cn(
                          'flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-sm font-semibold transition-all',
                          activeRole === role
                            ? 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan'
                            : 'bg-white/4 border-white/8 text-slate-400 hover:bg-white/8 hover:text-slate-200'
                        )}
                      >
                        <span>{ROLE_LABELS[role]}</span>
                        <span className="text-xs opacity-70 font-normal">
                          {permsCount}/{maxCount} صلاحية
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Permissions Grid */}
                <div className="space-y-3">
                  {allSections.map(section => (
                    <PermissionSection
                      key={section}
                      section={section}
                      permissions={Object.keys(PERMISSION_LABELS) as Permission[]}
                      enabled={rolePerms[activeRole]}
                      maxAllowed={maxForRole}
                      onChange={handleTogglePerm}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={savingPerms}
                    className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {savingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingPerms ? 'جارٍ الحفظ...' : `حفظ صلاحيات ${ROLE_LABELS[activeRole]}`}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetRole}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    إعادة الضبط الافتراضي
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
