import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { logActivity } from '@/lib/activity'
import * as XLSX from 'xlsx'

// Column header aliases for the Excel file
const NAME_COLS = ['الاسم', 'name', 'اسم العميل', 'العميل']
const EMAIL_COLS = ['الايميل', 'الإيميل', 'email', 'البريد الالكتروني', 'البريد الإلكتروني']
const PHONE_COLS = ['رقم الهاتف', 'الهاتف', 'phone', 'موبايل']
const WHATSAPP_COLS = ['واتساب', 'whatsapp', 'رقم واتس', 'رقم الواتساب']
const PLAN_COLS = ['الخطة المشترك فيها', 'الخطة', 'plan', 'الخدمة', 'المنتج', 'الوالد سيبس']
const NOTES_COLS = ['ملاحظات', 'notes', 'ملاحظة']
const PRICE_COLS = ['السعر', 'price', 'المبلغ', 'السعر']
const START_DATE_COLS = ['تاريخ الاشتراك', 'تاريخ البداية', 'start date', 'startdate']
const END_DATE_COLS = ['تاريخ الانتهاء', 'تاريخ النهاية', 'end date', 'enddate']
const PAID_COLS = ['تم الدفع', 'paid', 'الدفع', 'تم الدفع (نعم/لا)']

function findCol(row: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const key = Object.keys(row).find(
      k => k.trim().toLowerCase() === alias.trim().toLowerCase()
    )
    if (key && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim()
    }
  }
  return ''
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'customers:create')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (!rows.length) return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على بيانات' }, { status: 400 })

    const results = { added: 0, skipped: 0, errors: [] as string[] }

    for (const row of rows) {
      const name = findCol(row, NAME_COLS)
      if (!name || name.length < 2) {
        results.skipped++
        continue
      }

      const email = findCol(row, EMAIL_COLS)
      const phone = findCol(row, PHONE_COLS)
      const whatsapp = findCol(row, WHATSAPP_COLS)
      const plan = findCol(row, PLAN_COLS)
      const notes = findCol(row, NOTES_COLS)
      const price = findCol(row, PRICE_COLS)
      const startDate = findCol(row, START_DATE_COLS)
      const endDate = findCol(row, END_DATE_COLS)
      const paid = findCol(row, PAID_COLS)

      // Build internal note from subscription details
      const noteParts = []
      if (plan) noteParts.push(`الخطة: ${plan}`)
      if (startDate) noteParts.push(`تاريخ الاشتراك: ${startDate}`)
      if (endDate) noteParts.push(`تاريخ الانتهاء: ${endDate}`)
      if (price) noteParts.push(`السعر: ${price}`)
      if (paid) noteParts.push(`تم الدفع: ${paid}`)
      if (notes) noteParts.push(`ملاحظات: ${notes}`)

      const internalNote = noteParts.length ? noteParts.join(' | ') : null

      // Tag from plan name
      const tags = plan ? [plan] : []

      try {
        await prisma.customer.create({
          data: {
            name,
            email: email || null,
            phone: phone || null,
            whatsapp: whatsapp || null,
            internalNote,
            tags,
            status: 'ACTIVE',
            source: 'OTHER',
            createdById: session.user.id,
            assignedToId: session.user.id,
          },
        })
        results.added++
      } catch (err) {
        results.errors.push(`"${name}": ${(err as Error).message}`)
        results.skipped++
      }
    }

    await logActivity({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CUSTOMERS_IMPORTED',
      entityType: 'Customer',
      entityName: `استيراد Excel (${results.added} عملاء)`,
    })

    return NextResponse.json(results, { status: 201 })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'فشل في معالجة الملف' }, { status: 500 })
  }
}
