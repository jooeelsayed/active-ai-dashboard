import 'server-only'

import type { Prisma, Role } from '@prisma/client'

export interface ResourceUser {
  id: string
  role: Role
}

export function customerWhereForUser(
  user: ResourceUser,
  where: Prisma.CustomerWhereInput = {}
): Prisma.CustomerWhereInput {
  if (user.role !== 'EMPLOYEE') return where
  return { AND: [where, { assignedToId: user.id }] }
}

export function subscriptionWhereForUser(
  user: ResourceUser,
  where: Prisma.SubscriptionWhereInput = {}
): Prisma.SubscriptionWhereInput {
  if (user.role !== 'EMPLOYEE') return where
  return { AND: [where, { employeeId: user.id }] }
}

export function paymentWhereForUser(
  user: ResourceUser,
  where: Prisma.PaymentWhereInput = {}
): Prisma.PaymentWhereInput {
  if (user.role !== 'EMPLOYEE') return where
  return { AND: [where, { customer: { assignedToId: user.id } }] }
}
