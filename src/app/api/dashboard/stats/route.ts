import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, addDays, startOfDay } from 'date-fns'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const today = startOfDay(now)
  const sevenDaysLater = addDays(today, 7)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [
    totalCustomers,
    activeSubscriptions,
    expiredSubscriptions,
    expiringSoon,
    pendingPayments,
    monthlyRevenueData,
    topProducts,
    recentActivity,
    revenueByMonth,
    subsByStatus,
    employeeStats,
  ] = await Promise.all([
    // Total customers
    prisma.customer.count(),

    // Active subscriptions
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),

    // Expired subscriptions
    prisma.subscription.count({ where: { status: 'EXPIRED' } }),

    // Expiring in 7 days
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        endDate: { gte: today, lte: sevenDaysLater },
      },
    }),

    // Pending/unpaid payments (sum)
    prisma.subscription.aggregate({
      _sum: { salePrice: true },
      where: { paymentStatus: 'UNPAID' },
    }),

    // Monthly revenue (current month)
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
        status: 'PAID',
      },
    }),

    // Top products by subscription count
    prisma.product.findMany({
      take: 5,
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: {
        subscriptions: { _count: 'desc' },
      },
      where: { isActive: true },
    }),

    // Recent activity log
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),

    // Revenue by month (last 6 months)
    prisma.$queryRaw<Array<{ month: string; revenue: number; profit: number }>>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "paymentDate"), 'YYYY-MM') as month,
        SUM(amount)::float as revenue,
        0::float as profit
      FROM "Payment"
      WHERE "paymentDate" >= NOW() - INTERVAL '6 months'
        AND status = 'PAID'
      GROUP BY DATE_TRUNC('month', "paymentDate")
      ORDER BY DATE_TRUNC('month', "paymentDate") ASC
    `,

    // Subscriptions by status
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Employee performance
    prisma.user.findMany({
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
    }),
  ])

  // Calculate monthly profit from subscriptions
  const monthlyProfit = await prisma.subscription.aggregate({
    _sum: { salePrice: true, costPrice: true },
    where: {
      createdAt: { gte: monthStart, lte: monthEnd },
      paymentStatus: 'PAID',
    },
  })

  const profitValue =
    (Number(monthlyProfit._sum.salePrice) || 0) - (Number(monthlyProfit._sum.costPrice) || 0)

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
    revenueByMonth: revenueByMonth.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
    })),
    subsByStatus: subsByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    topProducts: topProducts.map((p) => ({
      id: p.id,
      name: p.name,
      provider: p.provider,
      count: p._count.subscriptions,
    })),
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
