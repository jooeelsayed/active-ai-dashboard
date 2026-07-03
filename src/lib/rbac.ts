import { Role } from '@prisma/client'

export type Permission =
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'products:read'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'subscriptions:read'
  | 'subscriptions:create'
  | 'subscriptions:update'
  | 'subscriptions:delete'
  | 'subscriptions:reveal_sensitive'
  | 'payments:read'
  | 'payments:create'
  | 'payments:update'
  | 'payments:delete'
  | 'employees:read'
  | 'employees:create'
  | 'employees:update'
  | 'employees:delete'
  | 'reports:read'
  | 'reports:export'
  | 'activity:read'
  | 'settings:read'
  | 'settings:update'

// ─── Static maximums per role (ceiling — cannot be exceeded by overrides) ───
export const ROLE_MAX_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update', 'subscriptions:delete', 'subscriptions:reveal_sensitive',
    'payments:read', 'payments:create', 'payments:update', 'payments:delete',
    'employees:read', 'employees:create', 'employees:update', 'employees:delete',
    'reports:read', 'reports:export',
    'activity:read',
    'settings:read', 'settings:update',
  ],
  MANAGER: [
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update', 'subscriptions:delete', 'subscriptions:reveal_sensitive',
    'payments:read', 'payments:create', 'payments:update', 'payments:delete',
    'employees:read', 'employees:create', 'employees:update',
    'reports:read', 'reports:export',
    'activity:read',
    'settings:read',
  ],
  EMPLOYEE: [
    'customers:read', 'customers:create', 'customers:update',
    'products:read',
    'subscriptions:read', 'subscriptions:create', 'subscriptions:update',
    'payments:read', 'payments:create',
    'reports:read',
  ],
  READONLY: [
    'customers:read',
    'products:read',
    'subscriptions:read',
    'payments:read',
    'reports:read',
  ],
}

// ─── Default starting permissions (shown as ON in the UI) ──────────────────
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  MANAGER: ROLE_MAX_PERMISSIONS.MANAGER,
  EMPLOYEE: ROLE_MAX_PERMISSIONS.EMPLOYEE,
  READONLY: ROLE_MAX_PERMISSIONS.READONLY,
}

// ─── Human-readable labels for each permission ────────────────────────────
export const PERMISSION_LABELS: Record<Permission, { label: string; section: string }> = {
  'customers:read':   { label: 'عرض العملاء', section: 'العملاء' },
  'customers:create': { label: 'إضافة عملاء', section: 'العملاء' },
  'customers:update': { label: 'تعديل العملاء', section: 'العملاء' },
  'customers:delete': { label: 'حذف العملاء', section: 'العملاء' },
  'products:read':    { label: 'عرض المنتجات', section: 'المنتجات' },
  'products:create':  { label: 'إضافة منتجات', section: 'المنتجات' },
  'products:update':  { label: 'تعديل المنتجات', section: 'المنتجات' },
  'products:delete':  { label: 'حذف المنتجات', section: 'المنتجات' },
  'subscriptions:read':             { label: 'عرض الاشتراكات', section: 'الاشتراكات' },
  'subscriptions:create':           { label: 'إضافة اشتراكات', section: 'الاشتراكات' },
  'subscriptions:update':           { label: 'تعديل الاشتراكات', section: 'الاشتراكات' },
  'subscriptions:delete':           { label: 'حذف الاشتراكات', section: 'الاشتراكات' },
  'subscriptions:reveal_sensitive': { label: 'عرض البيانات الحساسة', section: 'الاشتراكات' },
  'payments:read':    { label: 'عرض المدفوعات', section: 'المدفوعات' },
  'payments:create':  { label: 'إضافة مدفوعات', section: 'المدفوعات' },
  'payments:update':  { label: 'تعديل المدفوعات', section: 'المدفوعات' },
  'payments:delete':  { label: 'حذف المدفوعات', section: 'المدفوعات' },
  'employees:read':   { label: 'عرض الموظفين', section: 'الموظفون' },
  'employees:create': { label: 'إضافة موظفين', section: 'الموظفون' },
  'employees:update': { label: 'تعديل الموظفين', section: 'الموظفون' },
  'employees:delete': { label: 'حذف الموظفين', section: 'الموظفون' },
  'reports:read':     { label: 'عرض التقارير', section: 'التقارير والنشاط' },
  'reports:export':   { label: 'تصدير البيانات', section: 'التقارير والنشاط' },
  'activity:read':    { label: 'عرض سجل النشاط', section: 'التقارير والنشاط' },
  'settings:read':    { label: 'عرض الإعدادات', section: 'الإعدادات' },
  'settings:update':  { label: 'تعديل الإعدادات', section: 'الإعدادات' },
}

// ─── Core permission check (uses static defaults — fast, sync) ─────────────
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_MAX_PERMISSIONS[role]?.includes(permission) ?? false
}

// ─── Permission check with dynamic overrides from DB ──────────────────────
export function hasPermissionWithOverride(
  role: Role,
  permission: Permission,
  overrides: Partial<Record<string, Permission[]>>
): boolean {
  // ADMIN always has full access — overrides don't apply
  if (role === 'ADMIN') return true
  // If no override defined for this role, fall back to static defaults
  const roleOverride = overrides[role]
  if (!roleOverride) return hasPermission(role, permission)
  // Override must also be within max ceiling for the role
  const maxPerms = ROLE_MAX_PERMISSIONS[role] ?? []
  return roleOverride.includes(permission) && maxPerms.includes(permission)
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission} requires higher role than ${role}`)
  }
}

export function canManageEmployee(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'ADMIN') return true
  if (actorRole === 'MANAGER') return targetRole !== 'ADMIN' && targetRole !== 'MANAGER'
  return false
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_MAX_PERMISSIONS[role] ?? []
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'مدير عام',
  MANAGER: 'مدير',
  EMPLOYEE: 'موظف',
  READONLY: 'قراءة فقط',
}
