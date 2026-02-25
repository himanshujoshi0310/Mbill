import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received body:', JSON.stringify(body, null, 2))

    const {
      companyId,
      billNumber,
      billDate,
      farmerName,
      farmerAddress,
      farmerContact,
      krashakAnubandhNumber,
      markaNumber,
      productId,
      noOfBags,
      hammali,
      weight,
      rate,
      payableAmount,
      paidAmount,
      balance,
      paymentStatus,
    } = body

    console.log('Extracted values:', {
      companyId,
      billNumber,
      billDate,
      farmerName,
      productId,
      weight,
      rate,
      payableAmount,
      paidAmount,
      balance
    })

    // Validate required fields
    if (!companyId || !farmerName || !productId || !weight || !rate) {
      console.log('Validation failed - missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('User ID from cookies:', userId)

    console.log('Creating farmer for:', farmerName, 'company:', companyId)

    // Find or create farmer
    let farmer = await prisma.farmer.findFirst({
      where: {
        companyId,
        name: farmerName,
      },
    })

    if (!farmer) {
      farmer = await prisma.farmer.create({
        data: {
          companyId,
          name: farmerName,
          address: farmerAddress || null,
          phone1: farmerContact || null,
          krashakAnubandhNumber: krashakAnubandhNumber || null,
        },
      })
      console.log('Created new farmer:', farmer.id)
    } else {
      // Update existing farmer with new information if provided
      farmer = await prisma.farmer.update({
        where: { id: farmer.id },
        data: {
          address: farmerAddress || farmer.address,
          phone1: farmerContact || farmer.phone1,
          krashakAnubandhNumber: krashakAnubandhNumber || farmer.krashakAnubandhNumber,
        },
      })
      console.log('Updated existing farmer:', farmer.id)
    }

    console.log('Creating purchase bill...')

    // Create purchase bill
    const purchaseBill = await prisma.purchaseBill.create({
      data: {
        companyId,
        billNo: billNumber,
        billDate: new Date(billDate),
        farmerId: farmer.id,
        totalAmount: parseFloat(payableAmount) || 0,
        paidAmount: parseFloat(paidAmount) || 0,
        balanceAmount: parseFloat(balance) || 0,
        status: paymentStatus || 'unpaid',
        createdBy: userId,
      },
    })

    console.log('Purchase bill created:', purchaseBill.id)

    // Create purchase item
    await prisma.purchaseItem.create({
      data: {
        purchaseBillId: purchaseBill.id,
        productId,
        qty: parseFloat(weight) || 0,
        rate: parseFloat(rate) || 0,
        hammali: parseFloat(hammali) || 0,
        bags: parseInt(noOfBags) || null,
        markaNo: markaNumber || null,
        amount: parseFloat(payableAmount) || 0,
      },
    })

    console.log('Purchase item created')

    // Update stock ledger
    await prisma.stockLedger.create({
      data: {
        companyId,
        entryDate: new Date(billDate),
        productId,
        type: 'purchase',
        qtyIn: parseFloat(weight) || 0,
        refTable: 'purchase_bills',
        refId: purchaseBill.id,
      },
    })

    console.log('Stock ledger updated')

    return NextResponse.json({ success: true, purchaseBill })
  } catch (error) {
    console.error('Error creating purchase bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.toString() : String(error)
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const last = searchParams.get('last')
    const billId = searchParams.get('billId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    if (billId) {
      // Get single purchase bill by ID
      const purchaseBill = await prisma.purchaseBill.findFirst({
        where: { 
          id: billId,
          companyId 
        },
        include: {
          farmer: true,
          purchaseItems: {
            include: {
              product: true,
            },
          },
        },
      })

      if (!purchaseBill) {
        return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
      }

      return NextResponse.json(purchaseBill)
    }

    if (last === 'true') {
      // Get the highest bill number for the company
      const lastBill = await prisma.purchaseBill.findFirst({
        where: { companyId },
        orderBy: { billNo: 'desc' },
        select: { billNo: true },
      })

      const lastBillNumber = lastBill ? parseInt(lastBill.billNo) : 0
      return NextResponse.json({ lastBillNumber })
    }

    // Default: return all purchase bills for the company with optional date filtering
    const whereClause: any = { companyId }
    
    // Add date filtering if provided
    if (dateFrom || dateTo) {
      whereClause.billDate = {}
      if (dateFrom) {
        whereClause.billDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.billDate.lte = new Date(dateTo)
      }
    }

    const purchaseBills = await prisma.purchaseBill.findMany({
      where: whereClause,
      include: {
        farmer: true,
        purchaseItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(purchaseBills)
  } catch (error) {
    console.error('Error fetching purchase bills:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const billId = searchParams.get('billId')
    const companyId = searchParams.get('companyId')

    if (!billId || !companyId) {
      return NextResponse.json({ error: 'Bill ID and Company ID are required' }, { status: 400 })
    }

    console.log('Deleting purchase bill:', billId, 'for company:', companyId)

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    // Find the purchase bill
    const purchaseBill = await prisma.purchaseBill.findFirst({
      where: { 
        id: billId,
        companyId 
      },
      include: {
        purchaseItems: true
      }
    })

    if (!purchaseBill) {
      return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
    }

    // Delete related records in order
    // 1. Delete stock ledger entries
    await prisma.stockLedger.deleteMany({
      where: {
        refTable: 'purchase_bills',
        refId: billId
      }
    })

    // 2. Delete purchase items
    await prisma.purchaseItem.deleteMany({
      where: {
        purchaseBillId: billId
      }
    })

    // 3. Delete the purchase bill
    await prisma.purchaseBill.delete({
      where: { id: billId }
    })

    console.log('Purchase bill deleted successfully:', billId)

    return NextResponse.json({ success: true, message: 'Purchase bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received body:', JSON.stringify(body, null, 2))

    const {
      id,
      companyId,
      billNumber,
      billDate,
      farmerName,
      farmerAddress,
      farmerContact,
      krashakAnubandhNumber,
      productId,
      noOfBags,
      hammali,
      weight,
      rate,
      payableAmount,
      paidAmount,
      balanceAmount,
      status,
    } = body

    console.log('Extracted values:', {
      id,
      companyId,
      billNumber,
      billDate,
      farmerName,
      productId,
      weight,
      rate,
      payableAmount,
      paidAmount,
      balanceAmount,
      status,
    })

    // Validate required fields
    if (!id || !companyId || !farmerName || !productId || !weight || !rate) {
      console.log('Validation failed - missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('User ID from cookies:', userId)

    // Find or create farmer
    let farmer = await prisma.farmer.findFirst({
      where: {
        companyId,
        name: farmerName,
      },
    })

    if (!farmer) {
      farmer = await prisma.farmer.create({
        data: {
          companyId,
          name: farmerName,
          address: farmerAddress || null,
          phone1: farmerContact || null,
          krashakAnubandhNumber: krashakAnubandhNumber || null,
        },
      })
      console.log('Created new farmer:', farmer.id)
    } else {
      // Update existing farmer with new information if provided
      farmer = await prisma.farmer.update({
        where: { id: farmer.id },
        data: {
          address: farmerAddress || farmer.address,
          phone1: farmerContact || farmer.phone1,
          krashakAnubandhNumber: krashakAnubandhNumber || farmer.krashakAnubandhNumber,
        },
      })
      console.log('Updated existing farmer:', farmer.id)
    }

    console.log('Updating purchase bill...')

    // Update purchase bill
    const purchaseBillData = {
      companyId,
      billNo: billNumber,
      billDate: new Date(billDate),
      farmerId: farmer.id,
      totalAmount: parseFloat(payableAmount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
      balanceAmount: parseFloat(balanceAmount) || 0,
      status: status || ((parseFloat(balanceAmount) || 0) === 0 ? 'paid' : (parseFloat(balanceAmount) || 0) === (parseFloat(payableAmount) || 0) ? 'unpaid' : 'partial'),
    }

    console.log('Purchase bill data:', purchaseBillData)

    const purchaseBill = await prisma.purchaseBill.update({
      where: { id },
      data: purchaseBillData,
    })

    console.log('Purchase bill updated:', purchaseBill.id)

    // Update existing purchase item
    const existingItem = await prisma.purchaseItem.findFirst({
      where: { purchaseBillId: id },
    })

    if (existingItem) {
      await prisma.purchaseItem.update({
        where: { id: existingItem.id },
        data: {
          productId,
          qty: parseFloat(weight) || 0,
          rate: parseFloat(rate) || 0,
          hammali: parseFloat(hammali) || 0,
          bags: parseFloat(noOfBags) || 0,
          amount: parseFloat(payableAmount) || 0,
        },
      })
      console.log('Purchase item updated:', existingItem.id)
    }

    // Update stock ledger
    const existingLedger = await prisma.stockLedger.findFirst({
      where: {
        refTable: 'purchase_bills',
        refId: id,
      },
    })

    if (existingLedger) {
      await prisma.stockLedger.update({
        where: { id: existingLedger.id },
        data: {
          entryDate: new Date(billDate),
          productId,
          qtyIn: parseFloat(weight) || 0,
        },
      })
      console.log('Stock ledger updated:', existingLedger.id)
    }

    return NextResponse.json({ success: true, purchaseBill })
  } catch (error) {
    console.error('Error updating purchase bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.toString() : String(error)
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 })
  }
}
