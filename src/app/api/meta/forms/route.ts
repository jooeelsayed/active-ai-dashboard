import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userHasPermission } from '@/lib/server-permissions'
import { getMetaConnection, getMetaForms, MetaApiError } from '@/lib/meta'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const connection = await getMetaConnection(session.user.id)
  if (!connection) return NextResponse.json({ error: 'Meta Business غير متصل' }, { status: 409 })

  try {
    return NextResponse.json({ forms: await getMetaForms(connection) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof MetaApiError ? error.message : 'تعذر تحميل نماذج Meta' },
      { status: 502 }
    )
  }
}
