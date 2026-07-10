import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageEmployee, ROLE_MAX_PERMISSIONS, type Permission } from '@/lib/rbac'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'employees:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const employee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, phone: true,
      createdAt: true,
      _count: { select: { assignedCustomers: true, subscriptions: true, payments: true } },
    },
  })

  if (!employee) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  return NextResponse.json(employee)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'employees:update'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const updateSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY']).optional(),
    isActive: z.boolean().optional(),
    phone: z.string().optional().nullable(),
    password: z.string().min(8).optional(),
  })

  try {
    const data = updateSchema.parse(body)

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

    if (!canManageEmployee(session.user.role, target.role)) {
      return NextResponse.json({ error: 'لا يمكنك تعديل هذا الحساب' }, { status: 403 })
    }
    if (data.role && !canManageEmployee(session.user.role, data.role)) {
      return NextResponse.json({ error: 'لا يمكنك منح هذا الدور' }, { status: 403 })
    }
    if (id === session.user.id && (data.role !== undefined || data.isActive !== undefined)) {
      return NextResponse.json({ error: 'لا يمكنك تغيير دور حسابك أو تعطيله' }, { status: 400 })
    }

    // Build update payload
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.password) {
      // Only ADMIN can reset passwords
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'تغيير كلمة المرور للمدير العام فقط' }, { status: 403 })
      }
      updateData.passwordHash = await bcrypt.hash(data.password, 12)
    }

    const employee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: data.isActive === false ? 'EMPLOYEE_DISABLED' : data.isActive === true ? 'EMPLOYEE_ENABLED' : 'EMPLOYEE_UPDATED',
      entityType: 'User',
      entityId: id,
      entityName: employee.name,
    })

    return NextResponse.json(employee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// ─── DELETE: Admin deletes an employee account ─────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'الحذف للمدير العام فقط' }, { status: 403 })
  }

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  await prisma.$transaction([
    prisma.customer.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.customer.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    prisma.subscription.updateMany({ where: { employeeId: id }, data: { employeeId: null } }),
    prisma.payment.updateMany({ where: { recordedById: id }, data: { recordedById: null } }),
    prisma.note.updateMany({ where: { authorId: id }, data: { authorId: null } }),
    prisma.task.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.task.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    prisma.activityLog.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.user.delete({ where: { id } }),
  ])

  await logActivity({
    userId: session.user.id,
    userName: session.user.name,
    action: 'EMPLOYEE_DELETED',
    entityType: 'User',
    entityId: id,
    entityName: target.name,
  })

  return NextResponse.json({ success: true })
}
