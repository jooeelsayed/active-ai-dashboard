import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import { encryptFields } from '@/lib/crypto'

const subscriptionSchema = z.object({
  customerId: z.string().min(1, 'العميل مطلوب'),
  productId: z.string().min(1, 'المنتج مطلوب'),
  employeeId: z.string().optional().nullable(),
  startDate: z.string().min(1, 'تاريخ البداية مطلوب'),
  endDate: z.string().min(1, 'تاريخ الانتهاء مطلوب'),
  renewalReminderDate: z.string().optional().nullable(),
  salePrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  paymentStatus: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED']).default('UNPAID'),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED', 'PENDING_SETUP']).default('ACTIVE'),
  paymentMethod: z.enum(['VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER', 'CASH', 'PAYPAL', 'OTHER']).default('CASH'),
  notes: z.string().optional().nullable(),
  loginEmail: z.string().optional().nullable(),
  loginPassword: z.string().optional().nullable(),
  licenseKey: z.string().optional().nullable(),
  accessLink: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const paymentStatus = searchParams.get('paymentStatus') ?? ''
  const customerId = searchParams.get('customerId') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (status) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus
  if (customerId) where.customerId = customerId
  if (session.user.role === 'EMPLOYEE') where.employeeId = session.user.id

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        product: { select: { id: true, name: true, provider: true } },
        employee: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ])

  // Strip encrypted fields from list view
  const safeSubscriptions = subscriptions.map(({ encryptedLoginEmail, encryptedLoginPassword, encryptedLicenseKey, encryptedAccessLink, ...rest }) => rest)

  return NextResponse.json({ subscriptions: safeSubscriptions, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'subscriptions:create')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = subscriptionSchema.parse(body)

    const encrypted = encryptFields({
      loginEmail: data.loginEmail,
      loginPassword: data.loginPassword,
      licenseKey: data.licenseKey,
      accessLink: data.accessLink,
    })

    const subscription = await prisma.subscription.create({
      data: {
        customerId: data.customerId,
        productId: data.productId,
        employeeId: data.employeeId || session.user.id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        renewalReminderDate: data.renewalReminderDate ? new Date(data.renewalReminderDate) : null,
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        paymentStatus: data.paymentStatus,
        status: data.status,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        ...encrypted,
      },
      include: {
        customer: { select: { name: true } },
        product: { select: { name: true } },
      },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'SUBSCRIPTION_CREATED',
      entityType: 'Subscription',
      entityId: subscription.id,
      entityName: `${subscription.customer.name} — ${subscription.product.name}`,
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
