import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { getMetaConnection, getMetaForms, getMetaLeads, mapMetaLead, MetaApiError } from '@/lib/meta'

const formIdSchema = z.string().regex(/^\d+$/)

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const formId = formIdSchema.safeParse(new URL(request.url).searchParams.get('formId'))
  if (!formId.success) return NextResponse.json({ error: 'Form ID غير صحيح' }, { status: 400 })

  const connection = await getMetaConnection(session.user.id)
  if (!connection) return NextResponse.json({ error: 'Meta Business غير متصل' }, { status: 409 })

  try {
    const forms = await getMetaForms(connection)
    if (!forms.some((form) => form.id === formId.data)) {
      return NextResponse.json({ error: 'النموذج لا يتبع الصفحة المتصلة' }, { status: 403 })
    }

    const leads = (await getMetaLeads(connection, formId.data))
      .map(mapMetaLead)
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
    const metaTags = leads.map((lead) => `meta-lead:${lead.id}`)
    const imported = metaTags.length
      ? await prisma.customer.findMany({
          where: { tags: { hasSome: metaTags } },
          select: { tags: true },
        })
      : []
    const importedIds = new Set(
      imported.flatMap((customer) => customer.tags
        .filter((tag) => tag.startsWith('meta-lead:'))
        .map((tag) => tag.slice('meta-lead:'.length)))
    )

    return NextResponse.json({
      leads: leads.map((lead) => ({ ...lead, imported: importedIds.has(lead.id) })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof MetaApiError ? error.message : 'تعذر تحميل عملاء Meta' },
      { status: 502 }
    )
  }
}
