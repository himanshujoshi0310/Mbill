import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication using the same session system
    const session = await getSession()
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent activity (read-only)
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    const recentCompanies = await prisma.company.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    const recentTraders = await prisma.trader.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    // Combine and format activities
    const activities = [
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user' as const,
        action: 'New User Created',
        details: `${user.name || user.userId} (${user.role})`,
        timestamp: user.createdAt
      })),
      ...recentCompanies.map(company => ({
        id: `company-${company.id}`,
        type: 'company' as const,
        action: 'New Company Registered',
        details: company.name,
        timestamp: company.createdAt
      })),
      ...recentTraders.map(trader => ({
        id: `trader-${trader.id}`,
        type: 'trader' as const,
        action: 'New Trader Created',
        details: trader.name,
        timestamp: trader.createdAt
      }))
    ]

    // Sort by timestamp (most recent first) and limit to 10
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    console.log('Super admin activity accessed:', sortedActivities.length, 'items')
    return NextResponse.json(sortedActivities)

  } catch (error) {
    console.error('Super admin activity error:', error)
    return NextResponse.json({ 
      error: 'Failed to load activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
