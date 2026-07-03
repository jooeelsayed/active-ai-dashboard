import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['delete', 'update_status', 'update_payment']),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = bulkSchema.parse(body)

    if (data.action === 'delete') {
      if (!hasPermission(session.user.role, 'subscriptions:delete')) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      
      // Unlink to prevent foreign key errors
      await prisma.payment.updateMany({ where: { subscriptionId: { in: data.ids } }, data: { subscriptionId: null } })
      await prisma.note.updateMany({ where: { subscriptionId: { in: data.ids } }, data: { subscriptionId: null } })
      await prisma.task.updateMany({ where: { subscriptionId: { in: data.ids } }, data: { subscriptionId: null } })

      const result = await prisma.subscription.deleteMany({ where: { id: { in: data.ids } } })
      await logActivity({
        userId: session.user.id, userName: session.user.name,
        action: 'SUBSCRIPTIONS_BULK_DELETED', entityType: 'Subscription',
        entityName: `${result.count} اشتراكات`,
      })
      return NextResponse.json({ affected: result.count })
    }

    if (data.action === 'update_status' && data.status) {
      if (!hasPermission(session.user.role, 'subscriptions:update')) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      const result = await prisma.subscription.updateMany({
        where: { id: { in: data.ids } },
        data: { status: data.status as never },
      })
      return NextResponse.json({ affected: result.count })
    }

    if (data.action === 'update_payment' && data.paymentStatus) {
      if (!hasPermission(session.user.role, 'subscriptions:update')) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      const result = await prisma.subscription.updateMany({
        where: { id: { in: data.ids } },
        data: { paymentStatus: data.paymentStatus as never },
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
