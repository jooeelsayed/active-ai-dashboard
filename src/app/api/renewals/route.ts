import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)

  const [expiredNow, expireToday, expireIn3, expireIn7, expireThisMonth] = await Promise.all([
    // Already expired
    prisma.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'EXPIRING_SOON'] }, endDate: { lt: today } },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
        product: { select: { name: true, provider: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    // Expires today
    prisma.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'EXPIRING_SOON'] }, endDate: { gte: today, lte: todayEnd } },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
        product: { select: { name: true, provider: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    // Expires in 3 days
    prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 1), lte: endOfDay(addDays(today, 3)) },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
        product: { select: { name: true, provider: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    // Expires in 7 days
    prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 4), lte: endOfDay(addDays(today, 7)) },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
        product: { select: { name: true, provider: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
    // Expires this month (beyond 7 days)
    prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { gte: addDays(today, 8), lte: endOfMonth(now) },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
        product: { select: { name: true, provider: true } },
      },
      orderBy: { endDate: 'asc' },
    }),
  ])

  // Fetch WhatsApp template from settings
  const settings = await prisma.settings.findFirst()
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
