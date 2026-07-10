import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userHasPermission } from '@/lib/server-permissions'
import { getMetaConnection, getMetaGraphVersion, getMetaPage, MetaApiError } from '@/lib/meta'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const connection = await getMetaConnection(session.user.id)
  if (!connection) {
    return NextResponse.json({ connected: false, graphVersion: getMetaGraphVersion() })
  }

  try {
    const page = await getMetaPage(connection.pageId, connection.accessToken)
    return NextResponse.json({
      connected: true,
      page: { id: page.id, name: page.name },
      connectedAt: connection.connectedAt,
      managedByEnvironment: !!connection.managedByEnvironment,
      graphVersion: getMetaGraphVersion(),
    })
  } catch (error) {
    return NextResponse.json({
      connected: true,
      page: { id: connection.pageId, name: connection.pageName },
      connectionError: error instanceof MetaApiError ? error.message : 'تعذر التحقق من اتصال Meta',
      managedByEnvironment: !!connection.managedByEnvironment,
      graphVersion: getMetaGraphVersion(),
    })
  }
}
