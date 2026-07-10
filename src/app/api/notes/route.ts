import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { userHasPermission } from '@/lib/server-permissions'
import { customerWhereForUser, subscriptionWhereForUser } from '@/lib/resource-access'

const noteSchema = z.object({
  content: z.string().min(1, 'المحتوى مطلوب'),
  customerId: z.string().optional().nullable(),
  subscriptionId: z.string().optional().nullable(),
}).refine((data) => data.customerId || data.subscriptionId, {
  message: 'يجب تحديد عميل أو اشتراك',
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = noteSchema.parse(body)

    if (data.customerId) {
      if (!(await userHasPermission(session.user, 'customers:update'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      const customer = await prisma.customer.findFirst({
        where: customerWhereForUser(session.user, { id: data.customerId }),
        select: { id: true },
      })
      if (!customer) return NextResponse.json({ error: 'العميل غير موجود أو غير مسموح به' }, { status: 404 })
    }

    if (data.subscriptionId) {
      if (!(await userHasPermission(session.user, 'subscriptions:update'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      const subscription = await prisma.subscription.findFirst({
        where: subscriptionWhereForUser(session.user, { id: data.subscriptionId }),
        select: { customerId: true },
      })
      if (!subscription) return NextResponse.json({ error: 'الاشتراك غير موجود أو غير مسموح به' }, { status: 404 })
      if (data.customerId && subscription.customerId !== data.customerId) {
        return NextResponse.json({ error: 'الاشتراك لا يتبع هذا العميل' }, { status: 400 })
      }
    }

    const note = await prisma.note.create({
      data: {
        ...data,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const subscriptionId = searchParams.get('subscriptionId')

  if (!customerId && !subscriptionId) {
    return NextResponse.json({ error: 'يجب تحديد عميل أو اشتراك' }, { status: 400 })
  }

  if (customerId) {
    if (!(await userHasPermission(session.user, 'customers:read'))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
    }
    const customer = await prisma.customer.findFirst({
      where: customerWhereForUser(session.user, { id: customerId }),
      select: { id: true },
    })
    if (!customer) return NextResponse.json({ error: 'العميل غير موجود أو غير مسموح به' }, { status: 404 })
  }

  if (subscriptionId) {
    if (!(await userHasPermission(session.user, 'subscriptions:read'))) {
      return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
    }
    const subscription = await prisma.subscription.findFirst({
      where: subscriptionWhereForUser(session.user, { id: subscriptionId }),
      select: { customerId: true },
    })
    if (!subscription) return NextResponse.json({ error: 'الاشتراك غير موجود أو غير مسموح به' }, { status: 404 })
    if (customerId && subscription.customerId !== customerId) {
      return NextResponse.json({ error: 'الاشتراك لا يتبع هذا العميل' }, { status: 400 })
    }
  }

  const where: Record<string, unknown> = {}
  if (customerId) where.customerId = customerId
  if (subscriptionId) where.subscriptionId = subscriptionId

  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true } } },
  })

  return NextResponse.json(notes)
}
