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

    // ADMIN: always full permissions
    if (role === 'ADMIN') {
      // Still load overrides to return for the settings UI
      const settings = await prisma.settings.findFirst()
      let overrides: Record<string, Permission[]> = {}
      if (settings?.rolePermissions) {
        try { overrides = JSON.parse(settings.rolePermissions) } catch { /* ignore */ }
      }
      return NextResponse.json({
        role,
        permissions: ROLE_MAX_PERMISSIONS.ADMIN,
        overrides,
      })
    }

    // Load both role-level overrides and per-user overrides
    const [settings, user] = await Promise.all([
      prisma.settings.findFirst(),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { permissionsOverride: true } }),
    ])

    let roleOverrides: Record<string, Permission[]> = {}
    if (settings?.rolePermissions) {
      try { roleOverrides = JSON.parse(settings.rolePermissions) } catch { /* ignore */ }
    }

    let userOverride: Permission[] | null = null
    if (user?.permissionsOverride) {
      try { userOverride = JSON.parse(user.permissionsOverride) } catch { /* ignore */ }
    }

    // Per-user override takes priority over role override
    const maxPerms = ROLE_MAX_PERMISSIONS[role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
    let effectivePermissions: Permission[]

    if (userOverride !== null) {
      // User-level: filter against max ceiling
      effectivePermissions = userOverride.filter(p => maxPerms.includes(p))
    } else if (roleOverrides[role]) {
      // Role-level override
      effectivePermissions = (roleOverrides[role] as Permission[]).filter(p => maxPerms.includes(p))
    } else {
      // Default for role
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

    // Enforce ceiling
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
