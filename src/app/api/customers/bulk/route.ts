import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { customerWhereForUser } from '@/lib/resource-access'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'يجب تحديد عنصر واحد على الأقل').max(100),
})

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'يجب تحديد عنصر واحد على الأقل').max(100),
  status: z.enum(['NEW', 'ACTIVE', 'WAITING', 'PROBLEM', 'BLOCKED', 'OLD']),
})

// ─── Bulk Delete ───────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:delete'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { ids } = bulkDeleteSchema.parse(body)
    const uniqueIds = [...new Set(ids)]
    const allowed = await prisma.customer.findMany({
      where: customerWhereForUser(session.user, { id: { in: uniqueIds } }),
      select: { id: true },
    })
    if (allowed.length !== uniqueIds.length) {
      return NextResponse.json({ error: 'بعض العملاء غير موجودين أو غير مسموح بهم' }, { status: 403 })
    }

    const [, result] = await prisma.$transaction([
      prisma.task.deleteMany({ where: { customerId: { in: uniqueIds } } }),
      prisma.customer.deleteMany({ where: { id: { in: uniqueIds } } }),
    ])

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMERS_BULK_DELETED',
      entityType: 'Customer',
      entityName: `${result.count} عملاء`,
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Bulk delete error:', error)
    return NextResponse.json({ error: 'فشل الحذف الجماعي' }, { status: 500 })
  }
}

// ─── Bulk Status Update ────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:update'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { ids, status } = bulkUpdateSchema.parse(body)
    const uniqueIds = [...new Set(ids)]
    const scopedWhere = customerWhereForUser(session.user, { id: { in: uniqueIds } })
    const allowed = await prisma.customer.count({ where: scopedWhere })
    if (allowed !== uniqueIds.length) {
      return NextResponse.json({ error: 'بعض العملاء غير موجودين أو غير مسموح بهم' }, { status: 403 })
    }

    const result = await prisma.customer.updateMany({
      where: scopedWhere,
      data: { status },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMERS_BULK_STATUS_UPDATED',
      entityType: 'Customer',
      entityName: `${result.count} عملاء → ${status}`,
    })

    return NextResponse.json({ affected: result.count })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Bulk update error:', error)
    return NextResponse.json({ error: 'فشل تحديث الحالة' }, { status: 500 })
  }
}
