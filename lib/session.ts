import { cookies } from 'next/headers'
import { verifyToken } from './auth'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  
  if (!token) return null
  
  try {
    const payload = verifyToken(token)
    return payload
  } catch {
    return null
  }
}

export async function setSession(token: string, refreshToken?: string) {
  const cookieStore = await cookies()
  
  // Set access token (short-lived)
  cookieStore.set('auth-token', token, {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 60, // 30 minutes
    priority: 'high'
  })
  
  // Set refresh token (long-lived) if provided
  if (refreshToken) {
    cookieStore.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      priority: 'high'
    })
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  
  // Clear all authentication-related cookies
  cookieStore.delete('auth-token')
  cookieStore.delete('refresh-token')
  cookieStore.delete('userId')
  cookieStore.delete('traderId')
  cookieStore.delete('companyId')
}
