import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const firmId = searchParams.get('firmId')

    if (!firmId) {
      return NextResponse.json({ error: 'Firm ID is required' }, { status: 400 })
    }

    const salesInvoices = await prisma.salesBill.findMany({
      where: { companyId: firmId }, // Use companyId instead of firmId
      include: {
        party: true,
        salesItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { billDate: 'desc' }
    })

    return NextResponse.json(salesInvoices)
  } catch (error) {
    console.error('Error fetching sales invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      salesBill,
      transportBill,
      salesItems
    } = body

    // Extract sales bill data
    const {
      companyId,
      billNo,
      billDate,
      partyId,
      totalAmount,
      receivedAmount,
      balanceAmount,
      status
    } = salesBill

    // Validation
    if (!companyId || !billNo || !billDate || !partyId) {
      return NextResponse.json({ 
        error: 'Company ID, Bill No, Bill Date, and Party ID are required' 
      }, { status: 400 })
    }

    if (!salesItems || salesItems.length === 0) {
      return NextResponse.json({ 
        error: 'At least one sales item is required' 
      }, { status: 400 })
    }

    // Check for duplicate invoice number
    const existingInvoice = await prisma.salesBill.findFirst({
      where: { 
        companyId, 
        billNo 
      }
    })

    if (existingInvoice) {
      return NextResponse.json({ 
        error: `Bill number ${billNo} already exists for this company` 
      }, { status: 400 })
    }

    // Create sales bill with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create sales bill
      const salesBillRecord = await tx.salesBill.create({
        data: {
          companyId,
          billNo,
          billDate: new Date(billDate),
          partyId,
          totalAmount,
          receivedAmount: receivedAmount || 0,
          balanceAmount: balanceAmount || totalAmount,
          status: status || 'unpaid'
        }
      })

      // Create sales items
      for (const item of salesItems) {
        await tx.salesItem.create({
          data: {
            salesBillId: salesBillRecord.id,
            productId: item.productId,
            weight: item.weight,
            bags: item.bags,
            rate: item.rate,
            amount: item.amount
          }
        })
      }

      // Create transport bill if data provided
      let transportBillRecord = null
      if (transportBill && (transportBill.transportName || transportBill.lorryNo)) {
        transportBillRecord = await tx.transportBill.create({
          data: {
            salesBillId: salesBillRecord.id,
            transportName: transportBill.transportName,
            lorryNo: transportBill.lorryNo,
            freightPerQt: transportBill.freightPerQt,
            freightAmount: transportBill.freightAmount,
            advance: transportBill.advance,
            toPay: transportBill.toPay
          }
        })
      }

      return {
        salesBill: salesBillRecord,
        transportBill: transportBillRecord
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating sales bill:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
