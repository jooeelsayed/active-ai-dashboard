import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const search = searchParams.get('search') ?? ''
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entityName: { contains: search, mode: 'insensitive' } },
      { userName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, limit, pages: Math.ceil(total / limit) })
}
