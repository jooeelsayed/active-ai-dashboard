import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { decryptFields } from '@/lib/crypto'
import { logActivity } from '@/lib/activity'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'subscriptions:reveal_sensitive')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية للكشف عن البيانات الحساسة' }, { status: 403 })
  }

  const { id } = await params
  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: {
      encryptedLoginEmail: true,
      encryptedLoginPassword: true,
      encryptedLicenseKey: true,
      encryptedAccessLink: true,
      customer: { select: { name: true } },
      product: { select: { name: true } },
    },
  })

  if (!sub) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  const decrypted = decryptFields({
    encryptedLoginEmail: sub.encryptedLoginEmail,
    encryptedLoginPassword: sub.encryptedLoginPassword,
    encryptedLicenseKey: sub.encryptedLicenseKey,
    encryptedAccessLink: sub.encryptedAccessLink,
  })

  await logActivity({
    userId: session.user.id,
    userName: session.user.name,
    action: 'SENSITIVE_REVEALED',
    entityType: 'Subscription',
    entityId: id,
    entityName: `${sub.customer.name} — ${sub.product.name}`,
    details: 'تم الكشف عن البيانات الحساسة للاشتراك',
  })

  return NextResponse.json(decrypted)
}
