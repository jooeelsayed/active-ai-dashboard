import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1, 'يجب تحديد دفعة واحدة على الأقل'),
})

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'payments:delete'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { ids } = bulkSchema.parse(body)

    const result = await prisma.payment.deleteMany({ where: { id: { in: ids } } })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PAYMENTS_BULK_DELETED',
      entityType: 'Payment',
      entityName: `${result.count} دفعات`,
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
