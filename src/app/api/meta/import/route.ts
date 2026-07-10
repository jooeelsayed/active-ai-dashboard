import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { userHasPermission } from '@/lib/server-permissions'
import { getMetaConnection, getMetaForms, getMetaLeads, mapMetaLead, MetaApiError } from '@/lib/meta'

const importSchema = z.object({
  formId: z.string().regex(/^\d+$/),
  leadIds: z.array(z.string().regex(/^\d+$/)).min(1).max(100)
    .transform((values) => [...new Set(values)]),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const data = importSchema.parse(await request.json())
    const connection = await getMetaConnection(session.user.id)
    if (!connection) return NextResponse.json({ error: 'Meta Business غير متصل' }, { status: 409 })

    const forms = await getMetaForms(connection)
    const form = forms.find((item) => item.id === data.formId)
    if (!form) return NextResponse.json({ error: 'النموذج لا يتبع الصفحة المتصلة' }, { status: 403 })

    const selected = new Set(data.leadIds)
    const contacts = (await getMetaLeads(connection, data.formId))
      .filter((lead) => selected.has(lead.id))
      .map(mapMetaLead)
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
    if (!contacts.length) {
      return NextResponse.json({ error: 'لم يتم العثور على Leads قابلة للاستيراد' }, { status: 404 })
    }

    const metaTags = contacts.map((contact) => `meta-lead:${contact.id}`)
    const alreadyImported = await prisma.customer.findMany({
      where: { tags: { hasSome: metaTags } },
      select: { tags: true },
    })
    const importedIds = new Set(
      alreadyImported.flatMap((customer) => customer.tags
        .filter((tag) => tag.startsWith('meta-lead:'))
        .map((tag) => tag.slice('meta-lead:'.length)))
    )

    const pending = contacts.filter((contact) => !importedIds.has(contact.id))
    const phones = [...new Set(pending.flatMap((contact) => contact.phone ? [contact.phone] : []))]
    const emails = [...new Set(pending.flatMap((contact) => contact.email ? [contact.email] : []))]
    const existingContacts = phones.length || emails.length
      ? await prisma.customer.findMany({
          where: {
            OR: [
              ...(phones.length ? [{ phone: { in: phones } }] : []),
              ...(emails.length ? [{ email: { in: emails, mode: 'insensitive' as const } }] : []),
            ],
          },
          select: { phone: true, email: true },
        })
      : []
    const knownPhones = new Set(existingContacts.flatMap((customer) => customer.phone ? [customer.phone] : []))
    const knownEmails = new Set(existingContacts.flatMap((customer) => customer.email ? [customer.email.toLowerCase()] : []))

    let duplicateContacts = 0
    const createData: Prisma.CustomerCreateManyInput[] = []
    const localSignatures = new Set<string>()
    for (const contact of pending) {
      if ((contact.phone && knownPhones.has(contact.phone)) ||
          (contact.email && knownEmails.has(contact.email.toLowerCase()))) {
        duplicateContacts++
        continue
      }
      const signature = `${contact.phone ?? ''}|${contact.email ?? ''}|${contact.name.toLowerCase()}`
      if (localSignatures.has(signature)) {
        duplicateContacts++
        continue
      }
      localSignatures.add(signature)

      const noteParts = [
        `Meta Lead ID: ${contact.id}`,
        `النموذج: ${form.name}`,
      ]
      if (contact.createdTime) noteParts.push(`تاريخ Lead: ${contact.createdTime}`)
      if (contact.adName) noteParts.push(`الإعلان: ${contact.adName}`)

      createData.push({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        source: 'FACEBOOK',
        status: 'NEW',
        internalNote: noteParts.join(' | ').slice(0, 1200),
        tags: ['Meta Lead Ads', `meta-lead:${contact.id}`, `meta-form:${form.id}`],
        createdById: session.user.id,
        assignedToId: session.user.id,
      })
    }

    const created = createData.length
      ? await prisma.customer.createMany({ data: createData })
      : { count: 0 }
    const missing = data.leadIds.length - contacts.length
    const skipped = importedIds.size + duplicateContacts + Math.max(0, missing)

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMERS_META_IMPORTED',
      entityType: 'Customer',
      entityName: `Meta Lead Ads (${created.count} عملاء)`,
      details: `form:${form.id}`,
    })

    return NextResponse.json({
      added: created.count,
      skipped,
      alreadyImported: importedIds.size,
      duplicateContacts,
      missing: Math.max(0, missing),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات الاستيراد غير صحيحة' }, { status: 400 })
    }
    if (error instanceof MetaApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'فشل استيراد عملاء Meta' }, { status: 500 })
  }
}
