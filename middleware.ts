import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Define which routes require authentication
const protectedRoutes = [
  '/api/companies',
  '/api/parties',
  '/api/products',
  '/api/purchase-bills',
  '/api/sales-bills',
  '/api/payments',
  '/api/stock',
  '/api/transports',
  '/api/farmers',
  '/api/suppliers',
  '/api/units'
]

// Define which routes are public (don't require authentication)
const publicRoutes = [
  '/api/auth',
  '/api/login',
  '/api/debug',
  '/api/test'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if the route requires authentication
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Try to get token from Authorization header first, then from cookies
    const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '')
    const token = authHeader || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')?.[0] || 'http://localhost:3000',
            'Vary': 'Origin'
          }
        }
      )
    }

    // Verify token
    if (process.env.NODE_ENV === 'development') {
      console.log('=== MIDDLEWARE DEBUG ===');
      console.log('Token received:', !!token);
      console.log('Token length:', token?.length || 0);
      console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    }
    
    const payload = verifyToken(token)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Token verification result:', payload ? 'VALID' : 'INVALID');
      console.log('===================');
    }
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')?.[0] || 'http://localhost:3000',
            'Vary': 'Origin'
          }
        }
      )
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-trader-id', payload.traderId)
    requestHeaders.set('x-user-role', payload.role || 'user')

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // For all other routes, continue
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
