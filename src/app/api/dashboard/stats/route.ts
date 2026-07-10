import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { customerWhereForUser, paymentWhereForUser, subscriptionWhereForUser } from '@/lib/resource-access'
import { startOfMonth, endOfMonth, addDays, startOfDay, subMonths, format } from 'date-fns'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await userHasPermission(session.user, 'reports:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const now = new Date()
  const today = startOfDay(now)
  const sevenDaysLater = addDays(today, 7)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const sixMonthsStart = startOfMonth(subMonths(now, 5))
  const canReadActivity = await userHasPermission(session.user, 'activity:read')
  const canReadEmployees = await userHasPermission(session.user, 'employees:read')
  const customerScope = (where: Prisma.CustomerWhereInput = {}) => customerWhereForUser(session.user, where)
  const subscriptionScope = (where: Prisma.SubscriptionWhereInput = {}) => subscriptionWhereForUser(session.user, where)
  const paymentScope = (where: Prisma.PaymentWhereInput = {}) => paymentWhereForUser(session.user, where)

  const [
    totalCustomers,
    activeSubscriptions,
    expiredSubscriptions,
    expiringSoon,
    pendingPayments,
    monthlyRevenueData,
    topProductGroups,
    recentActivity,
    recentPayments,
    subsByStatus,
    employeeStats,
  ] = await Promise.all([
    // Total customers
    prisma.customer.count({ where: customerScope() }),

    // Active subscriptions
    prisma.subscription.count({ where: subscriptionScope({ status: 'ACTIVE' }) }),

    // Expired subscriptions
    prisma.subscription.count({ where: subscriptionScope({ status: 'EXPIRED' }) }),

    // Expiring in 7 days
    prisma.subscription.count({
      where: subscriptionScope({
        status: 'ACTIVE',
        endDate: { gte: today, lte: sevenDaysLater },
      }),
    }),

    // Pending/unpaid payments (sum)
    prisma.subscription.aggregate({
      _sum: { salePrice: true },
      where: subscriptionScope({ paymentStatus: 'UNPAID' }),
    }),

    // Monthly revenue (current month)
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: paymentScope({
        paymentDate: { gte: monthStart, lte: monthEnd },
        status: 'PAID',
      }),
    }),

    // Top products by subscription count
    prisma.subscription.groupBy({
      by: ['productId'],
      _count: { id: true },
      where: subscriptionScope({ product: { isActive: true } }),
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),

    // Recent activity log
    canReadActivity
      ? prisma.activityLog.findMany({
          where: session.user.role === 'EMPLOYEE' ? { userId: session.user.id } : undefined,
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),

    // Revenue by month (last 6 months)
    prisma.payment.findMany({
      where: paymentScope({ paymentDate: { gte: sixMonthsStart }, status: 'PAID' }),
      select: { paymentDate: true, amount: true },
      orderBy: { paymentDate: 'asc' },
    }),

    // Subscriptions by status
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
      where: subscriptionScope(),
    }),

    // Employee performance
    canReadEmployees
      ? prisma.user.findMany({
          where: { role: { in: ['EMPLOYEE', 'MANAGER'] }, isActive: true },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                assignedCustomers: true,
                subscriptions: true,
              },
            },
          },
          take: 5,
        })
      : Promise.resolve([]),
  ])

  // Calculate monthly profit from subscriptions
  const monthlyProfit = await prisma.subscription.aggregate({
    _sum: { salePrice: true, costPrice: true },
    where: subscriptionScope({
      createdAt: { gte: monthStart, lte: monthEnd },
      paymentStatus: 'PAID',
    }),
  })

  const profitValue =
    (Number(monthlyProfit._sum.salePrice) || 0) - (Number(monthlyProfit._sum.costPrice) || 0)
  const productIds = topProductGroups.map((product) => product.productId)
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, provider: true },
      })
    : []
  const productById = new Map(products.map((product) => [product.id, product]))
  const revenueByMonth = new Map<string, number>()
  for (let index = 5; index >= 0; index--) {
    revenueByMonth.set(format(startOfMonth(subMonths(now, index)), 'yyyy-MM'), 0)
  }
  for (const payment of recentPayments) {
    const month = format(payment.paymentDate, 'yyyy-MM')
    if (revenueByMonth.has(month)) {
      revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + Number(payment.amount))
    }
  }

  return NextResponse.json({
    stats: {
      totalCustomers,
      activeSubscriptions,
      expiredSubscriptions,
      expiringSoon,
      pendingPaymentsAmount: Number(pendingPayments._sum.salePrice) || 0,
      monthlyRevenue: Number(monthlyRevenueData._sum.amount) || 0,
      monthlyProfit: profitValue,
    },
    revenueByMonth: Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({ month, revenue })),
    subsByStatus: subsByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    topProducts: topProductGroups.map((group) => {
      const product = productById.get(group.productId)
      return {
        id: group.productId,
        name: product?.name ?? 'غير محدد',
        provider: product?.provider ?? '',
        count: group._count.id,
      }
    }),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityName: a.entityName,
      userName: a.userName || a.user?.name,
      createdAt: a.createdAt,
    })),
    employeeStats: employeeStats.map((e) => ({
      id: e.id,
      name: e.name,
      customers: e._count.assignedCustomers,
      subscriptions: e._count.subscriptions,
    })),
  })
}
