import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    // Get user details from database using session info
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findFirst({
      where: {
        userId: session.userId,
        traderId: session.traderId
      },
      select: {
        id: true,
        userId: true,
        traderId: true,
        name: true,
        role: true,
        trader: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get company for this user
    const company = await prisma.company.findFirst({
      where: {
        traderId: user.traderId
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        traderId: user.traderId,
        name: user.name,
        role: user.role,
        companyId: company?.id || null // Add companyId here
      },
      trader: user.trader,
      company: company ? {
        id: company.id,
        name: company.name
      } : null
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Session check error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
