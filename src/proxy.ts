import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLogin = req.nextUrl.pathname === '/login'

  if (!isLoggedIn && !isOnLogin) {
    const loginUrl = new URL('/login', req.nextUrl)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && isOnLogin) {
    const dashboardUrl = new URL('/', req.nextUrl)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|logo\\.png|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
}
