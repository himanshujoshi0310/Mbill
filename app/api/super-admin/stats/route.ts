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

    // Get system statistics (read-only)
    const [
      traderCount,
      companyCount,
      userCount,
      purchaseBillCount,
      salesBillCount
    ] = await Promise.all([
      prisma.trader.count(),
      prisma.company.count(),
      prisma.user.count(),
      prisma.purchaseBill.count(),
      prisma.salesBill.count()
    ])

    const stats = {
      totalTraders: traderCount,
      totalCompanies: companyCount,
      totalUsers: userCount,
      totalPurchaseBills: purchaseBillCount,
      totalSalesBills: salesBillCount,
      totalAmount: 0, // Could be calculated if needed
      lastUpdated: new Date().toISOString()
    }

    console.log('Super admin stats accessed:', stats)
    return NextResponse.json(stats)

  } catch (error) {
    console.error('Super admin stats error:', error)
    return NextResponse.json({ 
      error: 'Failed to load statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
