import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Active Ai — لوحة إدارة الاشتراكات',
    template: '%s | Active Ai',
  },
  description: 'نظام إدارة اشتراكات الذكاء الاصطناعي لشركة Active Ai',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="font-arabic antialiased bg-navy-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
