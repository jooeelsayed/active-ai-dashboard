import 'server-only'

import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_MAX_PERMISSIONS,
  type Permission,
} from '@/lib/rbac'

export interface PermissionUser {
  id: string
  role: Role
}

type PermissionOverrides = Record<string, Permission[]>

function parseOverrides(value: string | null | undefined): PermissionOverrides {
  if (!value) return {}

  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const overrides: PermissionOverrides = {}
    for (const [key, permissions] of Object.entries(parsed)) {
      if (!Array.isArray(permissions)) continue
      overrides[key] = permissions.filter(
        (permission): permission is Permission => typeof permission === 'string'
      )
    }
    return overrides
  } catch {
    return {}
  }
}

export async function getPermissionOverrides(): Promise<PermissionOverrides> {
  const settings = await prisma.settings.findFirst({
    select: { rolePermissions: true },
  })
  return parseOverrides(settings?.rolePermissions)
}

export async function getEffectivePermissions(user: PermissionUser): Promise<Permission[]> {
  const maximum = ROLE_MAX_PERMISSIONS[user.role] ?? []
  if (user.role === 'ADMIN') return maximum

  const overrides = await getPermissionOverrides()
  const userOverride = overrides[`user:${user.id}`]
  const roleOverride = overrides[user.role]
  const configured = userOverride ?? roleOverride ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? []

  return configured.filter((permission) => maximum.includes(permission))
}

export async function userHasPermission(
  user: PermissionUser,
  permission: Permission
): Promise<boolean> {
  if (user.role === 'ADMIN') return true
  const permissions = await getEffectivePermissions(user)
  return permissions.includes(permission)
}
