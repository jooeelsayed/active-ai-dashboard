import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  provider: z.string().min(1).optional(),
  category: z.enum(['CHATBOT', 'DESIGN', 'VIDEO', 'AUDIO', 'PRODUCTIVITY', 'CODING', 'OTHER']).optional(),
  planName: z.string().min(1).optional(),
  durationDays: z.coerce.number().min(1).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  accountType: z.enum(['INDIVIDUAL', 'SHARED', 'LICENSE_KEY', 'INVITATION', 'OTHER']).optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { subscriptions: true } } },
  })
  if (!product) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'products:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Strip non-updatable fields before validation
    const { id: _id, _count, createdAt, updatedAt, ...rest } = body
    void _id; void _count; void createdAt; void updatedAt

    const data = updateSchema.parse(rest)

    const product = await prisma.product.update({ where: { id }, data })
    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      entityName: product.name,
    })
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('PATCH product error:', error)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'products:delete')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const { id } = await params

    // Check if product has active subscriptions
    const subCount = await prisma.subscription.count({ where: { productId: id } })
    if (subCount > 0) {
      // Soft delete — just mark inactive
      await prisma.product.update({ where: { id }, data: { isActive: false } })
      await logActivity({
        userId: session.user.id,
        userName: session.user.name,
        action: 'PRODUCT_DEACTIVATED',
        entityType: 'Product',
        entityId: id,
      })
      return NextResponse.json({ success: true, deactivated: true, message: `تم إيقاف المنتج (له ${subCount} اشتراك مرتبط)` })
    }

    await prisma.product.delete({ where: { id } })
    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE product error:', error)
    return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 })
  }
}
