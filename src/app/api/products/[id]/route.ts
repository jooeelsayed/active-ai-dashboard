import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'products:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json()
  const product = await prisma.product.update({ where: { id }, data: body })
  await logActivity({ userId: session.user.id, userName: session.user.name, action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: id, entityName: product.name })
  return NextResponse.json(product)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'products:delete')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }
  const { id } = await params
  await prisma.product.delete({ where: { id } })
  await logActivity({ userId: session.user.id, userName: session.user.name, action: 'PRODUCT_DELETED', entityType: 'Product', entityId: id })
  return NextResponse.json({ success: true })
}
