import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, DEFAULT_ROLE_PERMISSIONS, ROLE_MAX_PERMISSIONS, Permission } from '@/lib/rbac'

// ─── GET: Returns effective permissions for the current user's role ─────────
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const settings = await prisma.settings.findFirst()
    let overrides: Record<string, Permission[]> = {}

    if (settings?.rolePermissions) {
      try {
        overrides = JSON.parse(settings.rolePermissions)
      } catch {
        overrides = {}
      }
    }

    const role = session.user.role

    // ADMIN always gets full permissions
    if (role === 'ADMIN') {
      return NextResponse.json({
        role,
        permissions: ROLE_MAX_PERMISSIONS.ADMIN,
        overrides,
      })
    }

    // Use stored override if available, else fall back to defaults
    const effectivePermissions = overrides[role] ?? DEFAULT_ROLE_PERMISSIONS[role] ?? []

    return NextResponse.json({
      role,
      permissions: effectivePermissions,
      overrides,
    })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// ─── PATCH: Admin updates role permissions ──────────────────────────────────
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'settings:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    // body = { role: 'EMPLOYEE', permissions: ['customers:read', ...] }
    const { role, permissions } = body as { role: string; permissions: Permission[] }

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }

    // Enforce ceiling — strip any permissions beyond the role's max
    const maxPerms = ROLE_MAX_PERMISSIONS[role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
    const safePermissions = permissions.filter(p => maxPerms.includes(p))

    // Load current settings and merge
    let settings = await prisma.settings.findFirst()
    let currentOverrides: Record<string, Permission[]> = {}

    if (settings?.rolePermissions) {
      try { currentOverrides = JSON.parse(settings.rolePermissions) } catch { /* ignore */ }
    }

    currentOverrides[role] = safePermissions
    const newJson = JSON.stringify(currentOverrides)

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { rolePermissions: newJson },
      })
    } else {
      settings = await prisma.settings.create({
        data: { rolePermissions: newJson },
      })
    }

    return NextResponse.json({ success: true, overrides: currentOverrides })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
