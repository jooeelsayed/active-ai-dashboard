import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

const updateSchema = z.object({
  subscriptionId: z.string().optional().nullable(),
  amount: z.coerce.number().positive().optional(),
  paymentMethod: z.enum(['VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER', 'CASH', 'PAYPAL', 'OTHER']).optional(),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
  status: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED']).optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'payments:update'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  try {
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { customerId: true },
    })
    if (!existing) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 })

    const data = updateSchema.parse(await request.json())
    if (data.subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: data.subscriptionId },
        select: { customerId: true },
      })
      if (!subscription || subscription.customerId !== existing.customerId) {
        return NextResponse.json({ error: 'الاشتراك لا يتبع عميل هذه الدفعة' }, { status: 400 })
      }
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...data,
        ...(data.paymentDate ? { paymentDate: new Date(data.paymentDate) } : {}),
      },
    })
    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PAYMENT_UPDATED',
      entityType: 'Payment',
      entityId: id,
    })
    return NextResponse.json(payment)
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
  if (!(await userHasPermission(session.user, 'payments:delete'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.payment.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 })
  await prisma.payment.delete({ where: { id } })

  await logActivity({
    userId: session.user.id,
    userName: session.user.name,
    action: 'PAYMENT_DELETED',
    entityType: 'Payment',
    entityId: id,
  })

  return NextResponse.json({ success: true })
}
