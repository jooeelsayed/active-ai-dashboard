import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ROLE_MAX_PERMISSIONS, Permission } from '@/lib/rbac'
import { getEffectivePermissions, userHasPermission } from '@/lib/server-permissions'
import { z } from 'zod'

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

    const permissions = await getEffectivePermissions(session.user)
    return NextResponse.json({
      role,
      permissions,
      ...(role === 'ADMIN' ? { overrides } : {}),
    })
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
  if (!(await userHasPermission(session.user, 'settings:update'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body: unknown = await request.json()
    const { settingsId, overrides } = await loadOverrides()

    // ── Per-user update ──────────────────────────────────
    const perUserSchema = z.object({
      userId: z.string().min(1),
      permissions: z.array(z.string()).nullable(),
    })
    const perUser = perUserSchema.safeParse(body)
    if (perUser.success) {
      const { userId, permissions } = perUser.data
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })

      const userKey = `user:${userId}`
      if (permissions === null) {
        // Reset: remove per-user override
        delete overrides[userKey]
      } else {
        const maxPerms = ROLE_MAX_PERMISSIONS[target.role] ?? []
        overrides[userKey] = permissions.filter((permission): permission is Permission =>
          maxPerms.includes(permission as Permission)
        )
      }

      await saveOverrides(settingsId, overrides)
      return NextResponse.json({ success: true, overrides })
    }

    // ── Role-level update ────────────────────────────────
    const roleUpdate = z.object({
      role: z.enum(['MANAGER', 'EMPLOYEE', 'READONLY']),
      permissions: z.array(z.string()),
    }).safeParse(body)
    if (!roleUpdate.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
    }
    const { role, permissions } = roleUpdate.data
    const maxPerms = ROLE_MAX_PERMISSIONS[role]
    overrides[role] = permissions.filter((permission): permission is Permission =>
      maxPerms.includes(permission as Permission)
    )
    await saveOverrides(settingsId, overrides)
    return NextResponse.json({ success: true, overrides })
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
