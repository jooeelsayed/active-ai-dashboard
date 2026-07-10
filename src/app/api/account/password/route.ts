import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(12, 'كلمة المرور الجديدة يجب ألا تقل عن ١٢ حرفًا')
    .regex(/[a-z]/, 'أضف حرفًا إنجليزيًا صغيرًا')
    .regex(/[A-Z]/, 'أضف حرفًا إنجليزيًا كبيرًا')
    .regex(/\d/, 'أضف رقمًا واحدًا على الأقل'),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = passwordSchema.parse(await request.json())
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    })
    if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })

    const currentMatches = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!currentMatches) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 })
    }
    const reusesCurrent = await bcrypt.compare(data.newPassword, user.passwordHash)
    if (reusesCurrent) {
      return NextResponse.json({ error: 'اختر كلمة مرور جديدة مختلفة' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
    })
    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: session.user.id,
      entityName: session.user.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
