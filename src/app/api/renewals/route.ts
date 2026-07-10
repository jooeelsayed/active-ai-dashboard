import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { subscriptionWhereForUser } from '@/lib/resource-access'
import { addDays, startOfDay, endOfDay, endOfMonth } from 'date-fns'

const renewalSelect = {
  id: true,
  endDate: true,
  salePrice: true,
  customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
  product: { select: { name: true, provider: true } },
} as const

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'subscriptions:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)

  const [expiredNow, expireToday, expireIn3, expireIn7, expireThisMonth] = await Promise.all([
    // Already expired
    prisma.subscription.findMany({
      where: subscriptionWhereForUser(session.user, { status: { in: ['ACTIVE', 'EXPIRING_SOON'] }, endDate: { lt: today } }),
      select: renewalSelect,
      orderBy: { endDate: 'asc' },
      take: 100,
    }),
    // Expires today
    prisma.subscription.findMany({
      where: subscriptionWhereForUser(session.user, { status: { in: ['ACTIVE', 'EXPIRING_SOON'] }, endDate: { gte: today, lte: todayEnd } }),
      select: renewalSelect,
      orderBy: { endDate: 'asc' },
      take: 100,
    }),
    // Expires in 3 days
    prisma.subscription.findMany({
      where: subscriptionWhereForUser(session.user, {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 1), lte: endOfDay(addDays(today, 3)) },
      }),
      select: renewalSelect,
      orderBy: { endDate: 'asc' },
      take: 100,
    }),
    // Expires in 7 days
    prisma.subscription.findMany({
      where: subscriptionWhereForUser(session.user, {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 4), lte: endOfDay(addDays(today, 7)) },
      }),
      select: renewalSelect,
      orderBy: { endDate: 'asc' },
      take: 100,
    }),
    // Expires this month (beyond 7 days)
    prisma.subscription.findMany({
      where: subscriptionWhereForUser(session.user, {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 8), lte: endOfMonth(now) },
      }),
      select: renewalSelect,
      orderBy: { endDate: 'asc' },
      take: 100,
    }),
  ])

  // Fetch WhatsApp template from settings (select only whatsappTemplate to avoid DB schema mismatch errors)
  const settings = await prisma.settings.findFirst({ select: { whatsappTemplate: true } })
  const template = settings?.whatsappTemplate ?? 'أهلاً يا {customerName} 👋\n\nاشتراك {productName} الخاص بحضرتك هينتهي يوم {endDate}.\n\nتحب نجددلك الاشتراك؟'

  return NextResponse.json({
    expiredNow,
    expireToday,
    expireIn3,
    expireIn7,
    expireThisMonth,
    whatsappTemplate: template,
  })
}
