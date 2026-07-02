import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'

const paymentSchema = z.object({
  customerId: z.string().min(1, 'العميل مطلوب'),
  subscriptionId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01, 'المبلغ مطلوب'),
  paymentMethod: z.enum(['VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER', 'CASH', 'PAYPAL', 'OTHER']).default('CASH'),
  paymentDate: z.string().min(1, 'تاريخ الدفع مطلوب'),
  referenceNumber: z.string().optional().nullable(),
  status: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED']).default('PAID'),
  notes: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId') ?? ''
  const subscriptionId = searchParams.get('subscriptionId') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (customerId) where.customerId = customerId
  if (subscriptionId) where.subscriptionId = subscriptionId

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        subscription: { include: { product: { select: { name: true } } } },
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.payment.count({ where }),
  ])

  return NextResponse.json({ payments, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'payments:create')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = paymentSchema.parse(body)

    const payment = await prisma.payment.create({
      data: {
        ...data,
        paymentDate: new Date(data.paymentDate),
        subscriptionId: data.subscriptionId || null,
        recordedById: session.user.id,
      },
      include: {
        customer: { select: { name: true } },
      },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PAYMENT_CREATED',
      entityType: 'Payment',
      entityId: payment.id,
      entityName: `${payment.customer.name} — ${Number(payment.amount).toLocaleString()} ج.م`,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
