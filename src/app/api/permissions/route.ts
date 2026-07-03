import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, DEFAULT_ROLE_PERMISSIONS, ROLE_MAX_PERMISSIONS, Permission } from '@/lib/rbac'

// ─── GET: Returns effective permissions for the current user ───────────────
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const role = session.user.role

    // Load role-level overrides from Settings
    const settings = await prisma.settings.findFirst()
    let roleOverrides: Record<string, Permission[]> = {}
    if (settings?.rolePermissions) {
      try { roleOverrides = JSON.parse(settings.rolePermissions) } catch { /* ignore */ }
    }

    // ADMIN: always full permissions
    if (role === 'ADMIN') {
      return NextResponse.json({
        role,
        permissions: ROLE_MAX_PERMISSIONS.ADMIN,
        overrides: roleOverrides,
      })
    }

    // Try per-user overrides stored in Settings (userPermissions key)
    let userPermissions: Record<string, Permission[]> = {}
    try {
      const raw = (settings as Record<string, unknown> | null)?.userPermissions
      if (typeof raw === 'string') userPermissions = JSON.parse(raw)
    } catch { /* ignore */ }

    const maxPerms = ROLE_MAX_PERMISSIONS[role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
    let effectivePermissions: Permission[]

    const userOverride = userPermissions[session.user.id]
    if (userOverride) {
      effectivePermissions = userOverride.filter(p => maxPerms.includes(p))
    } else if (roleOverrides[role]) {
      effectivePermissions = (roleOverrides[role] as Permission[]).filter(p => maxPerms.includes(p))
    } else {
      effectivePermissions = DEFAULT_ROLE_PERMISSIONS[role] ?? []
    }

    return NextResponse.json({
      role,
      permissions: effectivePermissions,
      overrides: roleOverrides,
    })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// ─── PATCH: Admin updates role-level permissions ───────────────────────────
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'settings:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { role, permissions } = body as { role: string; permissions: Permission[] }

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }

    const maxPerms = ROLE_MAX_PERMISSIONS[role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
    const safePermissions = permissions.filter(p => maxPerms.includes(p))

    let settings = await prisma.settings.findFirst()
    let currentOverrides: Record<string, Permission[]> = {}
    if (settings?.rolePermissions) {
      try { currentOverrides = JSON.parse(settings.rolePermissions) } catch { /* ignore */ }
    }

    currentOverrides[role] = safePermissions
    const newJson = JSON.stringify(currentOverrides)

    if (settings) {
      await prisma.settings.update({ where: { id: settings.id }, data: { rolePermissions: newJson } })
    } else {
      await prisma.settings.create({ data: { rolePermissions: newJson } })
    }

    return NextResponse.json({ success: true, overrides: currentOverrides })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
