import { Role } from '@prisma/client'

type Permission =
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

const PERMISSIONS: Record<Role, Permission[]> = {
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

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
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
  return PERMISSIONS[role] ?? []
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'مدير عام',
  MANAGER: 'مدير',
  EMPLOYEE: 'موظف',
  READONLY: 'قراءة فقط',
}
