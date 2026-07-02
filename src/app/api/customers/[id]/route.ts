import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  source: z.enum(['FACEBOOK', 'WHATSAPP', 'REFERRAL', 'WEBSITE', 'TIKTOK', 'OTHER']).optional(),
  status: z.enum(['NEW', 'ACTIVE', 'WAITING', 'PROBLEM', 'BLOCKED', 'OLD']).optional(),
  internalNote: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      subscriptions: {
        include: {
          product: true,
          employee: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      payments: {
        include: { recordedBy: { select: { id: true, name: true } } },
        orderBy: { paymentDate: 'desc' },
      },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
    },
  })

  if (!customer) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 })

  // Employee can only see their assigned customers
  if (session.user.role === 'EMPLOYEE' && customer.assignedToId !== session.user.id) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  return NextResponse.json(customer)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'customers:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const customer = await prisma.customer.update({
      where: { id },
      data: { ...data, email: data.email || null },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: customer.id,
      entityName: customer.name,
    })

    return NextResponse.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'customers:delete')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  await prisma.customer.delete({ where: { id } })

  await logActivity({
    userId: session.user.id,
    userName: session.user.name,
    action: 'CUSTOMER_DELETED',
    entityType: 'Customer',
    entityId: id,
    entityName: customer.name,
  })

  return NextResponse.json({ success: true })
}
