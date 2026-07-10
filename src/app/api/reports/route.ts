import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { customerWhereForUser, paymentWhereForUser, subscriptionWhereForUser } from '@/lib/resource-access'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'reports:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const requestedEmployeeId = searchParams.get('employeeId') ?? ''
  const employeeId = session.user.role === 'EMPLOYEE' ? session.user.id : requestedEmployeeId

  const dateFilter: Prisma.DateTimeFilter = {}
  if (from) dateFilter.gte = startOfDay(new Date(from))
  if (to) dateFilter.lte = endOfDay(new Date(to))

  const subWhere: Prisma.SubscriptionWhereInput = {}
  if (from || to) subWhere.createdAt = dateFilter
  if (employeeId) subWhere.employeeId = employeeId

  const payWhere: Prisma.PaymentWhereInput = { status: 'PAID' }
  if (from || to) payWhere.paymentDate = dateFilter
  if (employeeId) payWhere.subscription = { employeeId }

  const scopedSubWhere = subscriptionWhereForUser(session.user, subWhere)
  const scopedPayWhere = paymentWhereForUser(session.user, payWhere)
  const scopedCustomerWhere = customerWhereForUser(
    session.user,
    employeeId ? { assignedToId: employeeId } : {}
  )

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
      where: scopedPayWhere,
    }),

    // Revenue by employee
    prisma.subscription.groupBy({
      by: ['employeeId'],
      _sum: { salePrice: true, costPrice: true },
      _count: { id: true },
      where: scopedSubWhere,
    }),

    // Revenue by product
    prisma.subscription.groupBy({
      by: ['productId'],
      _sum: { salePrice: true },
      _count: { id: true },
      where: scopedSubWhere,
    }),

    // Customers by source
    prisma.customer.groupBy({
      by: ['source'],
      _count: { id: true },
      where: scopedCustomerWhere,
    }),

    // Payments by method
    prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: { id: true },
      where: scopedPayWhere,
    }),

    // Subscriptions by status
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
      where: scopedSubWhere,
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
