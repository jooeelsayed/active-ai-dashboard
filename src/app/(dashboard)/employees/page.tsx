'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { UserCog, Plus, Edit, Power, Key, Loader2 } from 'lucide-react'
import { formatDate, ROLE_LABELS, cn } from '@/lib/utils'

interface Employee {
  id: string; name: string; email: string; role: string; isActive: boolean; phone: string | null;
  createdAt: string; _count: { assignedCustomers: number; subscriptions: number }
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'text-brand-cyan border-brand-cyan/30 bg-brand-cyan/10',
  MANAGER: 'text-brand-lime border-brand-lime/30 bg-brand-lime/10',
  EMPLOYEE: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  READONLY: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [modalMode, setModalMode] = useState<'add' | 'reset' | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', phone: '' })
  const [newPassword, setNewPassword] = useState('')

  const fetchEmployees = async () => {
    setLoading(true)
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
    fetch('/api/auth/session').then(r => r.json()).then(s => setUserRole(s?.user?.role ?? ''))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) { toast.success('تم إضافة الموظف'); setModalMode(null); setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', phone: '' }); fetchEmployees() }
      else toast.error(data.error ?? 'فشل الحفظ')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const handleToggleActive = async (emp: Employee) => {
    const res = await fetch(`/api/employees/${emp.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !emp.isActive }) })
    if (res.ok) { toast.success(emp.isActive ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب'); fetchEmployees() }
    else toast.error('فشل التحديث')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/employees/${selectedEmployee?.id}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPassword })
      })
      if (res.ok) { toast.success('تم إعادة تعيين كلمة المرور'); setModalMode(null); setNewPassword('') }
      else toast.error('فشل إعادة التعيين')
    } catch { toast.error('حدث خطأ') } finally { setSaving(false) }
  }

  const canManage = userRole === 'ADMIN' || userRole === 'MANAGER'

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-brand-cyan" />
            الموظفون
          </h1>
          <p className="text-slate-400 text-sm mt-1">{employees.length} موظف</p>
        </div>
        {canManage && (
          <button onClick={() => setModalMode('add')} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" />إضافة موظف
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 glass-card animate-pulse bg-navy-700/40" />)}</div>
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
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-cyan/30 to-brand-lime/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-cyan">{emp.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge text-xs', ROLE_COLORS[emp.role])}>{ROLE_LABELS[emp.role]}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-slate-400">{emp._count.assignedCustomers} عميل، {emp._count.subscriptions} اشتراك</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-400">{formatDate(emp.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge text-xs', emp.isActive ? 'text-brand-lime border-brand-lime/30 bg-brand-lime/10' : 'text-slate-500 border-slate-500/30 bg-slate-500/10')}>
                      {emp.isActive ? 'نشط' : 'معطّل'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleActive(emp)}
                          className={cn('p-1.5 rounded-lg transition-all', emp.isActive ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-brand-lime hover:bg-brand-lime/10')}>
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedEmployee(emp); setModalMode('reset') }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all">
                          <Key className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {modalMode === 'add' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-lg">إضافة موظف جديد</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><label className="block text-xs text-slate-400 mb-1">الاسم الكامل</label>
                <input required className="input-brand text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">البريد الإلكتروني</label>
                <input required type="email" className="input-brand text-sm" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">كلمة المرور (٨ أحرف على الأقل)</label>
                <input required type="password" minLength={8} className="input-brand text-sm" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">الصلاحية</label>
                <select className="input-brand text-sm" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {userRole === 'ADMIN' && <option value="ADMIN">مدير عام</option>}
                  {userRole === 'ADMIN' && <option value="MANAGER">مدير</option>}
                  <option value="EMPLOYEE">موظف</option>
                  <option value="READONLY">قراءة فقط</option>
                </select></div>
              <div><label className="block text-xs text-slate-400 mb-1">رقم الهاتف</label>
                <input type="tel" className="input-brand text-sm" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2 rounded-xl text-sm disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}حفظ
                </button>
                <button type="button" onClick={() => setModalMode(null)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-navy-700 border border-white/6 text-sm transition-all">إلغاء</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modalMode === 'reset' && selectedEmployee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-lg">إعادة تعيين كلمة مرور</h3>
            <p className="text-sm text-slate-400">الموظف: <strong className="text-slate-200">{selectedEmployee.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div><label className="block text-xs text-slate-400 mb-1">كلمة المرور الجديدة (٨ أحرف على الأقل)</label>
                <input required type="password" minLength={8} className="input-brand text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2 rounded-xl text-sm disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}تعيين
                </button>
                <button type="button" onClick={() => { setModalMode(null); setNewPassword('') }} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-navy-700 border border-white/6 text-sm transition-all">إلغاء</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
