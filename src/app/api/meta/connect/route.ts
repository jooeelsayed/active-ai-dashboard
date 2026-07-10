import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { userHasPermission } from '@/lib/server-permissions'
import {
  clearMetaConnection,
  getMetaConnection,
  getMetaPage,
  MetaApiError,
  saveMetaConnection,
} from '@/lib/meta'

const connectionInput = z.object({
  pageId: z.string().trim().regex(/^\d+$/, 'Page ID غير صحيح'),
  accessToken: z.string().trim().min(20, 'Page Access Token غير صحيح').max(4096),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const data = connectionInput.parse(await request.json())
    const page = await getMetaPage(data.pageId, data.accessToken)
    if (page.id !== data.pageId) {
      return NextResponse.json({ error: 'التوكن لا يطابق الصفحة المحددة' }, { status: 400 })
    }

    await saveMetaConnection({
      userId: session.user.id,
      pageId: page.id,
      pageName: page.name,
      accessToken: data.accessToken,
      connectedAt: new Date().toISOString(),
    })
    return NextResponse.json({ connected: true, page: { id: page.id, name: page.name } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof MetaApiError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'تعذر حفظ الاتصال المشفر. راجع ENCRYPTION_KEY.' }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const connection = await getMetaConnection(session.user.id)
  if (connection?.managedByEnvironment) {
    return NextResponse.json({ error: 'الاتصال مُدار من متغيرات Vercel' }, { status: 409 })
  }
  await clearMetaConnection()
  return NextResponse.json({ success: true })
}
