import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { subscriptionWhereForUser } from '@/lib/resource-access'

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(['delete', 'update_status', 'update_payment']),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED', 'PENDING_SETUP']).optional(),
  paymentStatus: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED']).optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = bulkSchema.parse(body)
    const ids = [...new Set(data.ids)]
    const scopedWhere = subscriptionWhereForUser(session.user, { id: { in: ids } })
    const allowed = await prisma.subscription.count({ where: scopedWhere })
    if (allowed !== ids.length) {
      return NextResponse.json({ error: 'بعض الاشتراكات غير موجودة أو غير مسموح بها' }, { status: 403 })
    }

    if (data.action === 'delete') {
      if (!(await userHasPermission(session.user, 'subscriptions:delete'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      
      // Unlink to prevent foreign key errors
      const [, , , result] = await prisma.$transaction([
        prisma.payment.updateMany({ where: { subscriptionId: { in: ids } }, data: { subscriptionId: null } }),
        prisma.note.updateMany({ where: { subscriptionId: { in: ids } }, data: { subscriptionId: null } }),
        prisma.task.updateMany({ where: { subscriptionId: { in: ids } }, data: { subscriptionId: null } }),
        prisma.subscription.deleteMany({ where: scopedWhere }),
      ])
      await logActivity({
        userId: session.user.id, userName: session.user.name,
        action: 'SUBSCRIPTIONS_BULK_DELETED', entityType: 'Subscription',
        entityName: `${result.count} اشتراكات`,
      })
      return NextResponse.json({ affected: result.count })
    }

    if (data.action === 'update_status' && data.status) {
      if (!(await userHasPermission(session.user, 'subscriptions:update'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      const result = await prisma.subscription.updateMany({
        where: scopedWhere,
        data: { status: data.status },
      })
      return NextResponse.json({ affected: result.count })
    }

    if (data.action === 'update_payment' && data.paymentStatus) {
      if (!(await userHasPermission(session.user, 'subscriptions:update'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      const result = await prisma.subscription.updateMany({
        where: scopedWhere,
        data: { paymentStatus: data.paymentStatus },
      })
      return NextResponse.json({ affected: result.count })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
