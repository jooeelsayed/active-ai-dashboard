import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'settings:read'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  let settings = await prisma.settings.findFirst()
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        companyName: 'Active Ai',
        logoPath: '/logo.png',
        currency: 'EGP',
        reminderDays: 7,
        whatsappTemplate: 'أهلاً يا {customerName} 👋\n\nاشتراك {productName} الخاص بحضرتك هينتهي يوم {endDate}.\n\nتحب نجددلك الاشتراك؟',
      },
    })
  }

  return NextResponse.json(settings)
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'settings:update'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const body = await request.json()
  const schema = z.object({
    companyName: z.string().optional(),
    currency: z.string().optional(),
    reminderDays: z.coerce.number().optional(),
    whatsappTemplate: z.string().optional(),
    logoPath: z.string().optional(),
  })

  const data = schema.parse(body)
  let settings = await prisma.settings.findFirst()

  if (settings) {
    settings = await prisma.settings.update({ where: { id: settings.id }, data })
  } else {
    settings = await prisma.settings.create({ data: { ...data, companyName: data.companyName ?? 'Active Ai' } })
  }

  return NextResponse.json(settings)
}
