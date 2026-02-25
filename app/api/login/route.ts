import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, password } = body

    console.log('Login attempt:', userId)

    if (!userId || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    // Hardcoded credentials
    if (userId === 'admin@mandi.com' && password === 'admin123') {
      return NextResponse.json({
        success: true,
        user: {
          id: 'user-id',
          userId: 'admin@mandi.com',
          name: 'Admin User',
          role: 'admin'
        },
        trader: {
          id: 'cmli3fjj60000jh23cw4cdims',
          name: 'Mandi Trader'
        },
        company: {
          id: 'cmli3fjj60000jh23cw4cdims',
          name: 'Mandi Traders Ltd'
        }
      })
    }

    return NextResponse.json({ 
      error: 'Invalid credentials' 
    }, { status: 401 })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
