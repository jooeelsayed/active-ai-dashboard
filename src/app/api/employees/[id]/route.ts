import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'employees:read')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const employee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, phone: true, createdAt: true,
      _count: { select: { assignedCustomers: true, subscriptions: true, payments: true } },
    },
  })

  if (!employee) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  return NextResponse.json(employee)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'employees:update')) {
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
  })

  try {
    const data = updateSchema.parse(body)

    // Manager can't update admins
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    if (session.user.role === 'MANAGER' && target.role === 'ADMIN') {
      return NextResponse.json({ error: 'لا يمكنك تعديل حساب المدير العام' }, { status: 403 })
    }

    const employee = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: data.isActive === false ? 'EMPLOYEE_DISABLED' : 'EMPLOYEE_UPDATED',
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
