import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'reports:read')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const employeeId = searchParams.get('employeeId') ?? ''

  const dateFilter: Record<string, unknown> = {}
  if (from) dateFilter.gte = startOfDay(new Date(from))
  if (to) dateFilter.lte = endOfDay(new Date(to))

  const subWhere: Record<string, unknown> = {}
  if (from || to) subWhere.createdAt = dateFilter
  if (employeeId) subWhere.employeeId = employeeId

  const payWhere: Record<string, unknown> = { status: 'PAID' }
  if (from || to) payWhere.paymentDate = dateFilter

  const [
    revenueTotal,
    subscriptionsByEmployee,
    subscriptionsByProduct,
    customersBySource,
    paymentsByMethod,
    subscriptionsByStatus,
  ] = await Promise.all([
    // Total revenue in period
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: payWhere,
    }),

    // Revenue by employee
    prisma.subscription.groupBy({
      by: ['employeeId'],
      _sum: { salePrice: true, costPrice: true },
      _count: { id: true },
      where: subWhere,
    }),

    // Revenue by product
    prisma.subscription.groupBy({
      by: ['productId'],
      _sum: { salePrice: true },
      _count: { id: true },
      where: subWhere,
    }),

    // Customers by source
    prisma.customer.groupBy({
      by: ['source'],
      _count: { id: true },
    }),

    // Payments by method
    prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: { id: true },
      where: payWhere,
    }),

    // Subscriptions by status
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
      where: subWhere,
    }),
  ])

  // Enrich with names
  const employees = await prisma.user.findMany({
    where: { id: { in: subscriptionsByEmployee.map((s) => s.employeeId ?? '').filter(Boolean) } },
    select: { id: true, name: true },
  })

  const products = await prisma.product.findMany({
    where: { id: { in: subscriptionsByProduct.map((s) => s.productId) } },
    select: { id: true, name: true, provider: true },
  })

  return NextResponse.json({
    revenueTotal: Number(revenueTotal._sum.amount) || 0,
    subscriptionsByEmployee: subscriptionsByEmployee.map((s) => ({
      employeeId: s.employeeId,
      employeeName: employees.find((e) => e.id === s.employeeId)?.name ?? 'غير محدد',
      revenue: Number(s._sum.salePrice) || 0,
      cost: Number(s._sum.costPrice) || 0,
      profit: (Number(s._sum.salePrice) || 0) - (Number(s._sum.costPrice) || 0),
      count: s._count.id,
    })),
    subscriptionsByProduct: subscriptionsByProduct.map((s) => {
      const p = products.find((prod) => prod.id === s.productId)
      return {
        productId: s.productId,
        productName: p?.name ?? 'غير محدد',
        provider: p?.provider ?? '',
        revenue: Number(s._sum.salePrice) || 0,
        count: s._count.id,
      }
    }),
    customersBySource: customersBySource.map((c) => ({
      source: c.source,
      count: c._count.id,
    })),
    paymentsByMethod: paymentsByMethod.map((p) => ({
      method: p.paymentMethod,
      amount: Number(p._sum.amount) || 0,
      count: p._count.id,
    })),
    subscriptionsByStatus: subscriptionsByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
  })
}
