import { NextRequest, NextResponse } from 'next/server'
import { setSession } from '@/lib/session'
import { generateToken } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔍 Super admin auth request body:', body)
    
    const { userId, password } = body

    console.log('🔍 Super admin auth attempt:', { 
      userId, 
      passwordLength: password?.length
    })

    // Validation
    if (!userId || !password) {
      console.log('❌ Validation failed - missing fields:', { 
        hasUserId: !!userId, 
        hasPassword: !!password 
      })
      return NextResponse.json({ 
        error: 'User ID and password are required' 
      }, { status: 400 })
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: {
        traderId_userId: {
          traderId: 'system',
          userId: userId
        }
      },
      include: {
        trader: true
      }
    })

    if (!user) {
      console.log('❌ User not found:', userId)
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    // Verify role is SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
      console.log('❌ User is not super admin:', user.role)
      return NextResponse.json({ 
        error: 'Insufficient privileges' 
      }, { status: 403 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', userId)
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    console.log('✅ Super admin authentication successful for:', userId)

    // Generate proper JWT token
    const token = generateToken({
      userId: user.userId,
      traderId: user.traderId,
      name: user.name || 'System Administrator',
      role: user.role
    })

    // Set HttpOnly auth-token cookie
    await setSession(token)

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        traderId: user.traderId
      }
    })

  } catch (error) {
    console.error('❌ Super admin auth error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
