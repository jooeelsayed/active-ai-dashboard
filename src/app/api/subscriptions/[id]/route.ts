import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import { decryptFields } from '@/lib/crypto'
import { z } from 'zod'
import { encryptFields } from '@/lib/crypto'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
      product: true,
      employee: { select: { id: true, name: true } },
      payments: { orderBy: { paymentDate: 'desc' } },
      notes_rel: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!sub) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  // Strip sensitive fields
  const { encryptedLoginEmail, encryptedLoginPassword, encryptedLicenseKey, encryptedAccessLink, ...safeSub } = sub
  return NextResponse.json({ ...safeSub, hasSensitiveData: !!(encryptedLoginEmail || encryptedLoginPassword || encryptedLicenseKey || encryptedAccessLink) })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'subscriptions:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const updateSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    renewalReminderDate: z.string().optional().nullable(),
    salePrice: z.coerce.number().optional(),
    costPrice: z.coerce.number().optional(),
    paymentStatus: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED']).optional(),
    status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED', 'PENDING_SETUP']).optional(),
    paymentMethod: z.enum(['VODAFONE_CASH', 'INSTAPAY', 'BANK_TRANSFER', 'CASH', 'PAYPAL', 'OTHER']).optional(),
    notes: z.string().optional().nullable(),
    employeeId: z.string().optional().nullable(),
    loginEmail: z.string().optional().nullable(),
    loginPassword: z.string().optional().nullable(),
    licenseKey: z.string().optional().nullable(),
    accessLink: z.string().optional().nullable(),
  })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.renewalReminderDate) updateData.renewalReminderDate = new Date(data.renewalReminderDate)

    // Handle sensitive fields
    if ('loginEmail' in data || 'loginPassword' in data || 'licenseKey' in data || 'accessLink' in data) {
      if (!hasPermission(session.user.role, 'subscriptions:reveal_sensitive')) {
        return NextResponse.json({ error: 'ليس لديك صلاحية لتعديل البيانات الحساسة' }, { status: 403 })
      }
      const encrypted = encryptFields({
        loginEmail: data.loginEmail,
        loginPassword: data.loginPassword,
        licenseKey: data.licenseKey,
        accessLink: data.accessLink,
      })
      Object.assign(updateData, encrypted)
    }

    delete updateData.loginEmail
    delete updateData.loginPassword
    delete updateData.licenseKey
    delete updateData.accessLink

    const sub = await prisma.subscription.update({ where: { id }, data: updateData })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'SUBSCRIPTION_UPDATED',
      entityType: 'Subscription',
      entityId: sub.id,
    })

    return NextResponse.json(sub)
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
  if (!hasPermission(session.user.role, 'subscriptions:delete')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  
  // Unlink associated records to prevent foreign key constraint errors
  await prisma.payment.updateMany({ where: { subscriptionId: id }, data: { subscriptionId: null } })
  await prisma.note.updateMany({ where: { subscriptionId: id }, data: { subscriptionId: null } })
  await prisma.task.updateMany({ where: { subscriptionId: id }, data: { subscriptionId: null } })

  await prisma.subscription.delete({ where: { id } })

  await logActivity({
    userId: session.user.id,
    userName: session.user.name,
    action: 'SUBSCRIPTION_DELETED',
    entityType: 'Subscription',
    entityId: id,
  })

  return NextResponse.json({ success: true })
}
