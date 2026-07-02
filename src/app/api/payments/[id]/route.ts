import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'payments:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const payment = await prisma.payment.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(payment)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'payments:delete')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
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
