import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'subscriptions:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)

  const employeeFilter = session.user.role === 'EMPLOYEE'
    ? { employeeId: session.user.id }
    : {}

  const [expiredNow, expireToday, expireIn7] = await Promise.all([
    // Already expired (active/expiring_soon but past end date)
    prisma.subscription.findMany({
      where: {
        ...employeeFilter,
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { lt: today },
      },
      select: {
        id: true, endDate: true,
        customer: { select: { id: true, name: true } },
        product: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
    // Expires today
    prisma.subscription.findMany({
      where: {
        ...employeeFilter,
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: today, lte: todayEnd },
      },
      select: {
        id: true, endDate: true,
        customer: { select: { id: true, name: true } },
        product: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),
    // Expires within 7 days
    prisma.subscription.findMany({
      where: {
        ...employeeFilter,
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 1), lte: endOfDay(addDays(today, 7)) },
      },
      select: {
        id: true, endDate: true,
        customer: { select: { id: true, name: true } },
        product: { select: { name: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 20,
    }),
  ])

  const total = expiredNow.length + expireToday.length + expireIn7.length

  return NextResponse.json({
    total,
    expiredNow,
    expireToday,
    expireIn7,
  })
}
