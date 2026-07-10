import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const employeeSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'READONLY']).default('EMPLOYEE'),
  phone: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'employees:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const employees = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          assignedCustomers: true,
          subscriptions: true,
        },
      },
    },
  })

  return NextResponse.json(employees)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'employees:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = employeeSchema.parse(body)

    // Managers can't create admins or other managers
    if (session.user.role === 'MANAGER' && (data.role === 'ADMIN' || data.role === 'MANAGER')) {
      return NextResponse.json({ error: 'لا يمكنك إنشاء حساب بصلاحية مدير أو أعلى' }, { status: 403 })
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 400 })

    const passwordHash = await bcrypt.hash(data.password, 12)
    const employee = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        phone: data.phone || null,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'EMPLOYEE_CREATED',
      entityType: 'User',
      entityId: employee.id,
      entityName: employee.name,
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
