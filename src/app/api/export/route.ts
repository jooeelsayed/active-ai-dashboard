import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role, 'reports:export')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية للتصدير' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'customers'

  let csvContent = ''
  let filename = ''

  if (type === 'customers') {
    const customers = await prisma.customer.findMany({
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const headers = ['الاسم', 'الهاتف', 'واتساب', 'البريد الإلكتروني', 'الشركة', 'المصدر', 'الحالة', 'الموظف المسؤول', 'تاريخ الإضافة']
    const rows = customers.map((c) => [
      c.name, c.phone ?? '', c.whatsapp ?? '', c.email ?? '', c.company ?? '',
      c.source, c.status, c.assignedTo?.name ?? '', new Date(c.createdAt).toLocaleDateString('ar-EG'),
    ])
    csvContent = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    filename = 'customers.csv'
  } else if (type === 'subscriptions') {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        customer: { select: { name: true } },
        product: { select: { name: true, provider: true } },
        employee: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const headers = ['العميل', 'المنتج', 'المزود', 'تاريخ البداية', 'تاريخ الانتهاء', 'سعر البيع', 'سعر التكلفة', 'الربح', 'حالة الدفع', 'حالة الاشتراك', 'الموظف']
    const rows = subscriptions.map((s) => [
      s.customer.name, s.product.name, s.product.provider,
      new Date(s.startDate).toLocaleDateString('ar-EG'),
      new Date(s.endDate).toLocaleDateString('ar-EG'),
      s.salePrice.toString(), s.costPrice.toString(),
      (Number(s.salePrice) - Number(s.costPrice)).toFixed(2),
      s.paymentStatus, s.status, s.employee?.name ?? '',
    ])
    csvContent = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    filename = 'subscriptions.csv'
  } else if (type === 'payments') {
    const payments = await prisma.payment.findMany({
      include: {
        customer: { select: { name: true } },
        subscription: { include: { product: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    })
    const headers = ['العميل', 'المنتج', 'المبلغ', 'طريقة الدفع', 'تاريخ الدفع', 'رقم المرجع', 'الحالة', 'سُجّل بواسطة']
    const rows = payments.map((p) => [
      p.customer.name, p.subscription?.product?.name ?? '',
      p.amount.toString(), p.paymentMethod,
      new Date(p.paymentDate).toLocaleDateString('ar-EG'),
      p.referenceNumber ?? '', p.status, p.recordedBy?.name ?? '',
    ])
    csvContent = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    filename = 'payments.csv'
  }

  // Add BOM for Arabic Excel support
  const bom = '\uFEFF'
  return new NextResponse(bom + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
