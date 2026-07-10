import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

interface LogParams {
  userId?: string | null
  userName?: string | null
  action: string
  entityType: string
  entityId?: string | null
  entityName?: string | null
  details?: string | null
}

export async function logActivity(params: LogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        details: params.details ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

export const ACTION_LABELS: Record<string, string> = {
  CUSTOMER_CREATED: 'تم إضافة عميل',
  CUSTOMER_UPDATED: 'تم تحديث بيانات عميل',
  CUSTOMER_DELETED: 'تم حذف عميل',
  CUSTOMERS_META_IMPORTED: 'تم استيراد عملاء من Meta',
  SUBSCRIPTION_CREATED: 'تم إضافة اشتراك',
  SUBSCRIPTION_UPDATED: 'تم تحديث اشتراك',
  SUBSCRIPTION_DELETED: 'تم حذف اشتراك',
  SUBSCRIPTION_RENEWED: 'تم تجديد اشتراك',
  SENSITIVE_REVEALED: 'تم الكشف عن بيانات حساسة',
  PAYMENT_CREATED: 'تم إضافة دفعة',
  PAYMENT_UPDATED: 'تم تحديث دفعة',
  PAYMENT_DELETED: 'تم حذف دفعة',
  EMPLOYEE_CREATED: 'تم إضافة موظف',
  EMPLOYEE_UPDATED: 'تم تحديث موظف',
  EMPLOYEE_DISABLED: 'تم تعطيل حساب موظف',
  EMPLOYEE_PASSWORD_RESET: 'تم إعادة تعيين كلمة مرور',
  PASSWORD_CHANGED: 'تم تغيير كلمة المرور',
  PRODUCT_CREATED: 'تم إضافة منتج',
  PRODUCT_UPDATED: 'تم تحديث منتج',
  PRODUCT_DELETED: 'تم حذف منتج',
  NOTE_ADDED: 'تم إضافة ملاحظة',
  SETTINGS_UPDATED: 'تم تحديث الإعدادات',
  LOGIN: 'تسجيل دخول',
  LOGOUT: 'تسجيل خروج',
}

export async function getSessionUser(request: Request) {
  // Import dynamically to avoid circular deps
  const { auth } = await import('@/lib/auth')
  const session = await auth()
  return session?.user ?? null
}
