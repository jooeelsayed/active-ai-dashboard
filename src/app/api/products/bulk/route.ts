import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['delete', 'activate', 'deactivate']),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = bulkSchema.parse(body)

    if (data.action === 'delete') {
      if (!(await userHasPermission(session.user, 'products:delete'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      
      // We need to soft delete if there are active subscriptions, otherwise hard delete.
      // So we'll find all products with subscriptions.
      const productsWithSubs = await prisma.product.findMany({
        where: { id: { in: data.ids } },
        include: { _count: { select: { subscriptions: true } } },
      })
      
      const toHardDelete = productsWithSubs.filter(p => p._count.subscriptions === 0).map(p => p.id)
      const toSoftDelete = productsWithSubs.filter(p => p._count.subscriptions > 0).map(p => p.id)
      
      if (toHardDelete.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: toHardDelete } } })
      }
      if (toSoftDelete.length > 0) {
        await prisma.product.updateMany({ where: { id: { in: toSoftDelete } }, data: { isActive: false } })
      }
      
      await logActivity({
        userId: session.user.id, userName: session.user.name,
        action: 'PRODUCTS_BULK_DELETED', entityType: 'Product',
        entityName: `${data.ids.length} منتجات`,
      })
      
      return NextResponse.json({ deleted: toHardDelete.length, deactivated: toSoftDelete.length })
    }

    if (data.action === 'activate' || data.action === 'deactivate') {
      if (!(await userHasPermission(session.user, 'products:update'))) {
        return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
      }
      
      const isActive = data.action === 'activate'
      const result = await prisma.product.updateMany({
        where: { id: { in: data.ids } },
        data: { isActive },
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
