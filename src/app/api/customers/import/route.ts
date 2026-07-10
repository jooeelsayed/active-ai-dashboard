import { NextResponse } from 'next/server'
import { readSheet } from 'read-excel-file/node'
import Papa from 'papaparse'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasPermission } from '@/lib/server-permissions'
import { logActivity } from '@/lib/activity'
import { sheetRowsToRecords } from '@/lib/spreadsheet'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_IMPORT_ROWS = 500

const NAME_COLS = ['الاسم', 'name', 'اسم العميل', 'العميل']
const EMAIL_COLS = ['الايميل', 'الإيميل', 'email', 'البريد الالكتروني', 'البريد الإلكتروني']
const PHONE_COLS = ['رقم الهاتف', 'الهاتف', 'phone', 'موبايل']
const WHATSAPP_COLS = ['واتساب', 'whatsapp', 'رقم واتس', 'رقم الواتساب']
const PLAN_COLS = ['الخطة المشترك فيها', 'الخطة', 'plan', 'الخدمة', 'المنتج', 'الوالد سيبس']
const NOTES_COLS = ['ملاحظات', 'notes', 'ملاحظة']
const PRICE_COLS = ['السعر', 'price', 'المبلغ']
const START_DATE_COLS = ['تاريخ الاشتراك', 'تاريخ البداية', 'start date', 'startdate']
const END_DATE_COLS = ['تاريخ الانتهاء', 'تاريخ النهاية', 'end date', 'enddate']
const PAID_COLS = ['تم الدفع', 'paid', 'الدفع', 'تم الدفع (نعم/لا)']

function valueToString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value ?? '').trim()
}

function findCol(row: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const key = Object.keys(row).find(
      (candidate) => candidate.trim().toLowerCase() === alias.trim().toLowerCase()
    )
    if (key) {
      const value = valueToString(row[key])
      if (value) return value
    }
  }
  return ''
}

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const extension = file.name.toLowerCase().split('.').pop()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (extension === 'csv') {
    const parsed = Papa.parse<Record<string, unknown>>(
      buffer.toString('utf8').replace(/^\uFEFF/, ''),
      { header: true, skipEmptyLines: 'greedy' }
    )
    if (parsed.errors.length) throw new Error('INVALID_CSV')
    return parsed.data
  }

  if (extension === 'xlsx') {
    return sheetRowsToRecords(await readSheet(buffer))
  }

  throw new Error('UNSUPPORTED_FILE')
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await userHasPermission(session.user, 'customers:create'))) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف يجب ألا يتجاوز 5 ميجابايت' }, { status: 400 })
    }

    const rows = await parseFile(file)
    if (!rows.length) {
      return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على بيانات' }, { status: 400 })
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `الحد الأقصى ${MAX_IMPORT_ROWS} صف في كل عملية استيراد` }, { status: 400 })
    }

    const errors: string[] = []
    const candidates: Prisma.CustomerCreateManyInput[] = []

    rows.forEach((row, index) => {
      const rowNumber = index + 2
      const name = findCol(row, NAME_COLS).slice(0, 200)
      if (name.length < 2) {
        if (errors.length < 50) errors.push(`الصف ${rowNumber}: الاسم غير موجود أو قصير`)
        return
      }

      const emailValue = findCol(row, EMAIL_COLS).toLowerCase().slice(0, 320)
      const email = emailValue && z.string().email().safeParse(emailValue).success ? emailValue : null
      if (emailValue && !email && errors.length < 50) {
        errors.push(`الصف ${rowNumber}: البريد الإلكتروني غير صحيح`)
      }
      const phone = findCol(row, PHONE_COLS).slice(0, 40) || null
      const whatsapp = findCol(row, WHATSAPP_COLS).slice(0, 40) || null
      const plan = findCol(row, PLAN_COLS).slice(0, 100)
      const notes = findCol(row, NOTES_COLS).slice(0, 500)
      const price = findCol(row, PRICE_COLS).slice(0, 50)
      const startDate = findCol(row, START_DATE_COLS).slice(0, 50)
      const endDate = findCol(row, END_DATE_COLS).slice(0, 50)
      const paid = findCol(row, PAID_COLS).slice(0, 50)

      const noteParts: string[] = []
      if (plan) noteParts.push(`الخطة: ${plan}`)
      if (startDate) noteParts.push(`تاريخ الاشتراك: ${startDate}`)
      if (endDate) noteParts.push(`تاريخ الانتهاء: ${endDate}`)
      if (price) noteParts.push(`السعر: ${price}`)
      if (paid) noteParts.push(`تم الدفع: ${paid}`)
      if (notes) noteParts.push(`ملاحظات: ${notes}`)

      candidates.push({
        name,
        email,
        phone,
        whatsapp,
        internalNote: noteParts.length ? noteParts.join(' | ').slice(0, 1500) : null,
        tags: plan ? [plan] : [],
        status: 'ACTIVE',
        source: 'OTHER',
        createdById: session.user.id,
        assignedToId: session.user.id,
      })
    })

    const phones = [...new Set(candidates.flatMap((candidate) => candidate.phone ? [candidate.phone] : []))]
    const emails = [...new Set(candidates.flatMap((candidate) => candidate.email ? [candidate.email] : []))]
    const existing = phones.length || emails.length
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

    const knownPhones = new Set(existing.flatMap((customer) => customer.phone ? [customer.phone] : []))
    const knownEmails = new Set(existing.flatMap((customer) => customer.email ? [customer.email.toLowerCase()] : []))
    const signatures = new Set<string>()
    const toCreate = candidates.filter((candidate) => {
      if (candidate.phone && knownPhones.has(candidate.phone)) return false
      if (candidate.email && knownEmails.has(candidate.email.toLowerCase())) return false
      const signature = `${candidate.name.trim().toLowerCase()}|${candidate.phone ?? ''}|${candidate.email ?? ''}`
      if (signatures.has(signature)) return false
      signatures.add(signature)
      return true
    })

    const created = toCreate.length
      ? await prisma.customer.createMany({ data: toCreate })
      : { count: 0 }
    const skipped = rows.length - created.count

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMERS_IMPORTED',
      entityType: 'Customer',
      entityName: `استيراد ملف (${created.count} عملاء)`,
    })

    return NextResponse.json({ added: created.count, skipped, errors }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNSUPPORTED_FILE') {
      return NextResponse.json({ error: 'الأنواع المدعومة هي .xlsx و .csv فقط' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'INVALID_CSV') {
      return NextResponse.json({ error: 'ملف CSV غير صالح' }, { status: 400 })
    }
    return NextResponse.json({ error: 'فشل في معالجة الملف' }, { status: 500 })
  }
}
