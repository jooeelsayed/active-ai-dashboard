import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { ar } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==================== Date Utilities ====================

export function formatDate(date: Date | string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  try {
    return format(new Date(date), fmt, { locale: ar })
  } catch {
    return '—'
  }
}

export function formatDateFull(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(new Date(date), 'EEEE، d MMMM yyyy', { locale: ar })
  } catch {
    return '—'
  }
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isToday(d)) return 'اليوم'
    if (isTomorrow(d)) return 'غداً'
    return formatDistanceToNow(d, { locale: ar, addSuffix: true })
  } catch {
    return '—'
  }
}

export function daysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0
  try {
    return differenceInDays(new Date(date), new Date())
  } catch {
    return 0
  }
}

export function getSubscriptionStatusFromDates(endDate: Date | string): string {
  const days = daysUntil(endDate)
  if (days < 0) return 'EXPIRED'
  if (days <= 7) return 'EXPIRING_SOON'
  return 'ACTIVE'
}

// ==================== Currency ====================

export function formatCurrency(amount: number | string | null | undefined, currency = 'EGP'): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat('ar-EG').format(num)
}

// ==================== Arabic Labels ====================

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد',
  ACTIVE: 'نشط',
  WAITING: 'في الانتظار',
  PROBLEM: 'مشكلة',
  BLOCKED: 'محظور',
  OLD: 'قديم',
}

export const CUSTOMER_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  WAITING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PROBLEM: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  BLOCKED: 'bg-red-500/20 text-red-400 border-red-500/30',
  OLD: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export const CUSTOMER_SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: 'فيسبوك',
  WHATSAPP: 'واتساب',
  REFERRAL: 'إحالة',
  WEBSITE: 'الموقع الإلكتروني',
  TIKTOK: 'تيك توك',
  OTHER: 'أخرى',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  EXPIRING_SOON: 'ينتهي قريباً',
  EXPIRED: 'منتهي',
  CANCELLED: 'ملغي',
  PENDING_SETUP: 'في انتظار الإعداد',
}

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  EXPIRING_SOON: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  EXPIRED: 'bg-red-500/20 text-red-400 border-red-500/30',
  CANCELLED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  PENDING_SETUP: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: 'مدفوع',
  PARTIALLY_PAID: 'مدفوع جزئياً',
  UNPAID: 'غير مدفوع',
  REFUNDED: 'مسترد',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
  PARTIALLY_PAID: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  UNPAID: 'bg-red-500/20 text-red-400 border-red-500/30',
  REFUNDED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  VODAFONE_CASH: 'فودافون كاش',
  INSTAPAY: 'إنستاباي',
  BANK_TRANSFER: 'تحويل بنكي',
  CASH: 'نقداً',
  PAYPAL: 'باي بال',
  OTHER: 'أخرى',
}

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  CHATBOT: 'شات بوت / ذكاء اصطناعي نصي',
  DESIGN: 'تصميم',
  VIDEO: 'فيديو',
  AUDIO: 'صوت',
  PRODUCTIVITY: 'إنتاجية',
  CODING: 'برمجة',
  OTHER: 'أخرى',
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'اشتراك فردي',
  SHARED: 'حساب مشترك',
  LICENSE_KEY: 'كود ترخيص',
  INVITATION: 'دعوة',
  OTHER: 'أخرى',
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير عام',
  MANAGER: 'مدير',
  EMPLOYEE: 'موظف',
  READONLY: 'قراءة فقط',
}

// ==================== WhatsApp ====================

export function generateWhatsAppMessage(
  template: string,
  data: { customerName: string; productName: string; endDate: string }
): string {
  return template
    .replace('{customerName}', data.customerName)
    .replace('{productName}', data.productName)
    .replace('{endDate}', data.endDate)
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  const phoneWithCountry = cleanPhone.startsWith('0')
    ? '20' + cleanPhone.slice(1)
    : cleanPhone
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
}

// ==================== Misc ====================

export function getInitials(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(' ')
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

export function calculateProfit(sellingPrice: number, costPrice: number): number {
  return sellingPrice - costPrice
}

export function calculateProfitMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)
}

export function truncate(str: string, length = 50): string {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function buildSearchParams(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v))
    }
  }
  return sp.toString()
}
