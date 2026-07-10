'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswords(false)
  }

  const close = () => {
    if (loading) return
    reset()
    onClose()
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('تأكيد كلمة المرور غير مطابق')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        toast.error(data.error ?? 'فشل تغيير كلمة المرور')
        return
      }

      toast.success('تم تغيير كلمة المرور. سجّل الدخول مرة أخرى.')
      reset()
      onClose()
      await signOut({ callbackUrl: '/login' })
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const passwordType = showPasswords ? 'text' : 'password'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-card w-full max-w-md pointer-events-auto overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-cyan/15 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-brand-cyan" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">تغيير كلمة المرور</h2>
                    <p className="text-xs text-slate-500 mt-0.5">سيتم تسجيل خروجك بعد التغيير</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={loading}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={submit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور الحالية</label>
                  <input
                    type={passwordType}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="input-brand"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
                  <input
                    type={passwordType}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="input-brand"
                    minLength={12}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type={passwordType}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="input-brand"
                    minLength={12}
                    required
                  />
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPasswords ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}
                  </button>
                  <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-lime flex-shrink-0 mt-0.5" />
                    استخدم ١٢ حرفاً على الأقل مع حرف كبير، حرف صغير، ورقم.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    {loading ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-white/4 hover:bg-white/8 border border-white/6 transition-all text-sm disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
