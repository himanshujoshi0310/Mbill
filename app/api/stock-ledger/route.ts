import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received stock ledger body:', JSON.stringify(body, null, 2))

    const {
      companyId,
      productId,
      entryDate,
      type,
      qtyIn,
      qtyOut,
      refTable,
      refId,
      note
    } = body

    // Validate required fields
    if (!companyId || !productId || !entryDate || !type || (!qtyIn && !qtyOut)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('Recording stock ledger entry for product:', productId)

    // Create stock ledger entry
    const stockLedger = await prisma.stockLedger.create({
      data: {
        companyId,
        entryDate: new Date(entryDate),
        productId,
        type,
        qtyIn: parseFloat(qtyIn) || 0,
        qtyOut: parseFloat(qtyOut) || 0,
        refTable,
        refId
      }
    })

    console.log('Stock ledger entry recorded:', stockLedger.id)

    return NextResponse.json({ success: true, stockLedger })
  } catch (error) {
    console.error('Error recording stock ledger entry:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const productId = searchParams.get('productId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    let whereClause: any = { companyId }
    if (productId) {
      whereClause.productId = productId
    }

    const stockLedger = await prisma.stockLedger.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            unit: true
          }
        }
      },
      orderBy: { entryDate: 'desc' }
    })

    return NextResponse.json(stockLedger)
  } catch (error) {
    console.error('Error fetching stock ledger:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
