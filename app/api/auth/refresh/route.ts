import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateToken } from '@/lib/auth'
import { setSession, clearSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh-token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      )
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)
    
    if (!payload) {
      // Clear invalid refresh token
      await clearSession()
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // Generate new access token
    const newAccessToken = generateToken(payload)
    
    // Set new session with fresh access token
    await setSession(newAccessToken, refreshToken)

    return NextResponse.json({
      success: true,
      token: newAccessToken
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Token refresh error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
