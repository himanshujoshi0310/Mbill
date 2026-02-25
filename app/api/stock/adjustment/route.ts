import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, productId, adjustmentDate, shortageWeight, remark, type } = body

    console.log('Stock adjustment request:', { companyId, productId, adjustmentDate, shortageWeight, remark, type })

    if (!companyId || !productId || !shortageWeight || !adjustmentDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('User ID from cookies:', userId)

    // Create stock ledger entry for shortage
    await prisma.stockLedger.create({
      data: {
        companyId,
        entryDate: new Date(adjustmentDate),
        productId,
        type: 'adjustment',
        qtyOut: parseFloat(shortageWeight),
        qtyIn: 0,
        refTable: 'stock_adjustments',
        refId: 'adjustment-' + Date.now(),
      },
    })

    console.log('Stock adjustment recorded successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Stock adjustment recorded successfully' 
    })
  } catch (error) {
    console.error('Error recording stock adjustment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
