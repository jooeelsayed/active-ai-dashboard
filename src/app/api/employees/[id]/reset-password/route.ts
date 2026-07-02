import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'employees:update')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { password } = z.object({ password: z.string().min(8) }).parse(body)

  const passwordHash = await bcrypt.hash(password, 12)
  const employee = await prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: { name: true },
  })

  await logActivity({
    userId: session.user.id,
    userName: session.user.name,
    action: 'EMPLOYEE_PASSWORD_RESET',
    entityType: 'User',
    entityId: id,
    entityName: employee.name,
  })

  return NextResponse.json({ success: true })
}
