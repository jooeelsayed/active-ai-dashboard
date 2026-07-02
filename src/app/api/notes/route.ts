import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const noteSchema = z.object({
  content: z.string().min(1, 'المحتوى مطلوب'),
  customerId: z.string().optional().nullable(),
  subscriptionId: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = noteSchema.parse(body)

    const note = await prisma.note.create({
      data: {
        ...data,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const subscriptionId = searchParams.get('subscriptionId')

  const where: Record<string, unknown> = {}
  if (customerId) where.customerId = customerId
  if (subscriptionId) where.subscriptionId = subscriptionId

  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true } } },
  })

  return NextResponse.json(notes)
}
