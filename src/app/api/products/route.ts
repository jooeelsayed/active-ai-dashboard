import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'

const productSchema = z.object({
  name: z.string().min(2, 'اسم المنتج مطلوب'),
  provider: z.string().min(1, 'المزود مطلوب'),
  category: z.enum(['CHATBOT', 'DESIGN', 'VIDEO', 'AUDIO', 'PRODUCTIVITY', 'CODING', 'OTHER']).default('OTHER'),
  planName: z.string().min(1, 'اسم الخطة مطلوب'),
  durationDays: z.coerce.number().min(1, 'المدة مطلوبة'),
  sellingPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  accountType: z.enum(['INDIVIDUAL', 'SHARED', 'LICENSE_KEY', 'INVITATION', 'OTHER']).default('INDIVIDUAL'),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const isActive = searchParams.get('isActive')

  const where: Record<string, unknown> = {}
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { provider: { contains: search, mode: 'insensitive' } },
  ]
  if (category) where.category = category
  if (isActive !== null && isActive !== '') where.isActive = isActive === 'true'

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { subscriptions: true } } },
  })

  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'products:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = productSchema.parse(body)
    const product = await prisma.product.create({ data })

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      entityName: product.name,
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
