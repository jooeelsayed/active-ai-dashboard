import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'

const customerSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب (٢ أحرف على الأقل)'),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email('بريد إلكتروني غير صحيح').optional().nullable().or(z.literal('')),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  source: z.enum(['FACEBOOK', 'WHATSAPP', 'REFERRAL', 'WEBSITE', 'TIKTOK', 'OTHER']).default('OTHER'),
  status: z.enum(['NEW', 'ACTIVE', 'WAITING', 'PROBLEM', 'BLOCKED', 'OLD']).default('NEW'),
  internalNote: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  assignedToId: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const source = searchParams.get('source') ?? ''
  const assignedTo = searchParams.get('assignedTo') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status) where.status = status
  if (source) where.source = source

  // Employees only see their assigned customers
  if (session.user.role === 'EMPLOYEE') {
    where.assignedToId = session.user.id
  } else if (assignedTo) {
    where.assignedToId = assignedTo
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { subscriptions: true, payments: true } },
      },
    }),
    prisma.customer.count({ where }),
  ])

  return NextResponse.json({ customers, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'customers:create')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = customerSchema.parse(body)

    const customer = await prisma.customer.create({
      data: {
        ...data,
        email: data.email || null,
        createdById: session.user.id,
        assignedToId: data.assignedToId || session.user.id,
      },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      entityName: customer.name,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
