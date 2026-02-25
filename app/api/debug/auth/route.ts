import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if auth-token cookie exists
    const authToken = request.cookies.get('auth-token')?.value
    const refreshToken = request.cookies.get('refresh-token')?.value
    
    console.log('=== AUTH DEBUG ===')
    console.log('Auth token exists:', !!authToken)
    console.log('Refresh token exists:', !!refreshToken)
    console.log('Auth token length:', authToken?.length || 0)
    console.log('All cookies:', request.cookies.getAll().map(c => c.name))
    console.log('==================')
    
    return NextResponse.json({
      success: true,
      hasAuthToken: !!authToken,
      hasRefreshToken: !!refreshToken,
      cookieNames: request.cookies.getAll().map(c => c.name),
      message: authToken ? 'Authentication cookies found' : 'No authentication cookies'
    })
  } catch (error) {
    console.error('Auth debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
