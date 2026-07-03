import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, DEFAULT_ROLE_PERMISSIONS, ROLE_MAX_PERMISSIONS, Permission } from '@/lib/rbac'

// ─── Helper: load Settings and parse rolePermissions JSON ────────────────
async function loadOverrides(): Promise<{ settingsId: string | null; overrides: Record<string, Permission[]> }> {
  const settings = await prisma.settings.findFirst()
  let overrides: Record<string, Permission[]> = {}
  if (settings?.rolePermissions) {
    try { overrides = JSON.parse(settings.rolePermissions) } catch { /* ignore */ }
  }
  return { settingsId: settings?.id ?? null, overrides }
}

async function saveOverrides(settingsId: string | null, overrides: Record<string, Permission[]>) {
  const json = JSON.stringify(overrides)
  if (settingsId) {
    await prisma.settings.update({ where: { id: settingsId }, data: { rolePermissions: json } })
  } else {
    await prisma.settings.create({ data: { rolePermissions: json } })
  }
}

// ─── GET: effective permissions for the current user ───────────────────────
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const role = session.user.role
    const { overrides } = await loadOverrides()

    // ADMIN always gets everything
    if (role === 'ADMIN') {
      return NextResponse.json({ role, permissions: ROLE_MAX_PERMISSIONS.ADMIN, overrides })
    }

    const maxPerms = ROLE_MAX_PERMISSIONS[role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []

    // Per-user override (key: "user:userId") takes priority
    const userKey = `user:${session.user.id}`
    const userOverride = overrides[userKey] as Permission[] | undefined

    let effectivePermissions: Permission[]
    if (userOverride) {
      effectivePermissions = userOverride.filter(p => maxPerms.includes(p))
    } else if (overrides[role]) {
      effectivePermissions = (overrides[role] as Permission[]).filter(p => maxPerms.includes(p))
    } else {
      effectivePermissions = DEFAULT_ROLE_PERMISSIONS[role] ?? []
    }

    return NextResponse.json({ role, permissions: effectivePermissions, overrides })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// ─── PATCH: update role-level OR per-user permissions ─────────────────────
// Body: { role: 'EMPLOYEE', permissions: [...] }          → role-level
// Body: { userId: 'abc123', permissions: [...] }           → per-user
// Body: { userId: 'abc123', permissions: null }            → reset per-user to role defaults
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'settings:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { settingsId, overrides } = await loadOverrides()

    // ── Per-user update ──────────────────────────────────
    if (body.userId) {
      const { userId, permissions, userRole } = body as {
        userId: string; permissions: Permission[] | null; userRole?: string
      }

      const userKey = `user:${userId}`
      if (permissions === null || permissions === undefined) {
        // Reset: remove per-user override
        delete overrides[userKey]
      } else {
        // Enforce ceiling against the user's actual role
        const maxPerms = ROLE_MAX_PERMISSIONS[(userRole ?? 'EMPLOYEE') as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
        overrides[userKey] = permissions.filter(p => maxPerms.includes(p))
      }

      await saveOverrides(settingsId, overrides)
      return NextResponse.json({ success: true, overrides })
    }

    // ── Role-level update ────────────────────────────────
    const { role, permissions } = body as { role: string; permissions: Permission[] }
    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }
    const maxPerms = ROLE_MAX_PERMISSIONS[role as keyof typeof ROLE_MAX_PERMISSIONS] ?? []
    overrides[role] = permissions.filter(p => maxPerms.includes(p))
    await saveOverrides(settingsId, overrides)
    return NextResponse.json({ success: true, overrides })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
