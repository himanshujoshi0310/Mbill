import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing purchase bills API...')
    
    // Test basic connection
    const billCount = await prisma.purchaseBill.count()
    console.log('Total purchase bills in database:', billCount)
    
    // Test with company filter
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    
    if (companyId) {
      const companyBills = await prisma.purchaseBill.findMany({
        where: { companyId },
        include: {
          farmer: true,
        },
        take: 5, // Limit to 5 for testing
      })
      
      console.log('Bills for company:', companyId, companyBills.length)
      
      return NextResponse.json({
        totalBills: billCount,
        companyBills: companyBills,
        companyBillsCount: companyBills.length,
        companyId: companyId
      })
    }
    
    return NextResponse.json({
      totalBills: billCount,
      message: 'Please provide companyId parameter'
    })
    
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}
