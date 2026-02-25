import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received special purchase body:', JSON.stringify(body, null, 2))

    const {
      companyId,
      supplierInvoiceNo,
      billDate,
      supplierName,
      supplierAddress,
      supplierContact,
      productId,
      noOfBags,
      weight,
      rate,
      netAmount,
      otherAmount,
      grossAmount,
      paidAmount,
      balance,
      paymentStatus,
    } = body

    console.log('Extracted values:', {
      companyId,
      supplierInvoiceNo,
      billDate,
      supplierName,
      productId,
      weight,
      rate,
      netAmount,
      grossAmount,
      paidAmount,
      balance
    })

    // Validate required fields
    if (!companyId || !supplierName || !productId || !weight || !rate || !supplierInvoiceNo) {
      console.log('Validation failed - missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('User ID from cookies:', userId)

    console.log('Creating supplier for:', supplierName, 'company:', companyId)

    // Find or create supplier
    let supplier = await prisma.supplier.findFirst({
      where: {
        companyId,
        name: supplierName,
      },
    })

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          companyId,
          name: supplierName,
          address: supplierAddress || null,
          phone1: supplierContact || null,
        },
      })
      console.log('Created new supplier:', supplier.id)
    } else {
      // Update existing supplier with new information if provided
      supplier = await prisma.supplier.update({
        where: { id: supplier.id },
        data: {
          address: supplierAddress || supplier.address,
          phone1: supplierContact || supplier.phone1,
        },
      })
      console.log('Updated existing supplier:', supplier.id)
    }

    console.log('Creating special purchase bill...')

    // Create special purchase bill
    const specialPurchaseBill = await prisma.specialPurchaseBill.create({
      data: {
        companyId,
        supplierInvoiceNo,
        billDate: new Date(billDate),
        supplierId: supplier.id,
        totalAmount: parseFloat(grossAmount) || 0,
        paidAmount: parseFloat(paidAmount) || 0,
        balanceAmount: parseFloat(balance) || 0,
        status: paymentStatus || 'unpaid',
        createdBy: userId,
      },
    })

    console.log('Special purchase bill created:', specialPurchaseBill.id)

    // Create special purchase item
    await prisma.specialPurchaseItem.create({
      data: {
        specialPurchaseBillId: specialPurchaseBill.id,
        productId,
        noOfBags: parseInt(noOfBags) || null,
        weight: parseFloat(weight) || 0,
        rate: parseFloat(rate) || 0,
        netAmount: parseFloat(netAmount) || 0,
        otherAmount: parseFloat(otherAmount) || 0,
        grossAmount: parseFloat(grossAmount) || 0,
      },
    })

    console.log('Special purchase item created')

    // Update stock ledger
    await prisma.stockLedger.create({
      data: {
        companyId,
        entryDate: new Date(billDate),
        productId,
        type: 'purchase',
        qtyIn: parseFloat(weight) || 0,
        refTable: 'special_purchase_bills',
        refId: specialPurchaseBill.id,
      },
    })

    console.log('Stock ledger updated')

    return NextResponse.json({ success: true, specialPurchaseBill })
  } catch (error) {
    console.error('Error creating special purchase bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.toString() : String(error)
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const billId = searchParams.get('billId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    if (billId) {
      // Get single special purchase bill by ID
      const specialPurchaseBill = await prisma.specialPurchaseBill.findFirst({
        where: { 
          id: billId,
          companyId 
        },
        include: {
          supplier: true,
          specialPurchaseItems: {
            include: {
              product: true,
            },
          },
        },
      })

      if (!specialPurchaseBill) {
        return NextResponse.json({ error: 'Special purchase bill not found' }, { status: 404 })
      }

      return NextResponse.json(specialPurchaseBill)
    }

    // Default: return all special purchase bills for the company with optional date filtering
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

    const specialPurchaseBills = await prisma.specialPurchaseBill.findMany({
      where: whereClause,
      include: {
        supplier: true,
        specialPurchaseItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(specialPurchaseBills)
  } catch (error) {
    console.error('Error fetching special purchase bills:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received special purchase update body:', JSON.stringify(body, null, 2))

    const {
      id,
      companyId,
      supplierInvoiceNo,
      billDate,
      supplierName,
      supplierAddress,
      supplierContact,
      productId,
      noOfBags,
      weight,
      rate,
      netAmount,
      otherAmount,
      grossAmount,
      paidAmount,
      balanceAmount,
      status,
    } = body

    console.log('Extracted values:', {
      id,
      companyId,
      supplierInvoiceNo,
      billDate,
      supplierName,
      productId,
      weight,
      rate,
      netAmount,
      grossAmount,
      paidAmount,
      balanceAmount,
      status,
    })

    // Validate required fields
    if (!id || !companyId || !supplierName || !productId || !weight || !rate) {
      console.log('Validation failed - missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('User ID from cookies:', userId)

    // Find or create supplier
    let supplier = await prisma.supplier.findFirst({
      where: {
        companyId,
        name: supplierName,
      },
    })

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          companyId,
          name: supplierName,
          address: supplierAddress || null,
          phone1: supplierContact || null,
        },
      })
      console.log('Created new supplier:', supplier.id)
    } else {
      // Update existing supplier with new information if provided
      supplier = await prisma.supplier.update({
        where: { id: supplier.id },
        data: {
          address: supplierAddress || supplier.address,
          phone1: supplierContact || supplier.phone1,
        },
      })
      console.log('Updated existing supplier:', supplier.id)
    }

    console.log('Updating special purchase bill...')

    // Update special purchase bill
    const specialPurchaseBillData = {
      companyId,
      supplierInvoiceNo,
      billDate: new Date(billDate),
      supplierId: supplier.id,
      totalAmount: parseFloat(grossAmount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
      balanceAmount: parseFloat(balanceAmount) || 0,
      status: status || ((parseFloat(balanceAmount) || 0) === 0 ? 'paid' : (parseFloat(balanceAmount) || 0) === (parseFloat(grossAmount) || 0) ? 'unpaid' : 'partial'),
    }

    console.log('Special purchase bill data:', specialPurchaseBillData)

    const specialPurchaseBill = await prisma.specialPurchaseBill.update({
      where: { id },
      data: specialPurchaseBillData,
    })

    console.log('Special purchase bill updated:', specialPurchaseBill.id)

    // Update or create special purchase item
    const existingItem = await prisma.specialPurchaseItem.findFirst({
      where: { specialPurchaseBillId: id },
    })

    if (existingItem) {
      await prisma.specialPurchaseItem.update({
        where: { id: existingItem.id },
        data: {
          productId,
          noOfBags: parseInt(noOfBags) || null,
          weight: parseFloat(weight) || 0,
          rate: parseFloat(rate) || 0,
          netAmount: parseFloat(netAmount) || 0,
          otherAmount: parseFloat(otherAmount) || 0,
          grossAmount: parseFloat(grossAmount) || 0,
        },
      })
    } else {
      await prisma.specialPurchaseItem.create({
        data: {
          specialPurchaseBillId: id,
          productId,
          noOfBags: parseInt(noOfBags) || null,
          weight: parseFloat(weight) || 0,
          rate: parseFloat(rate) || 0,
          netAmount: parseFloat(netAmount) || 0,
          otherAmount: parseFloat(otherAmount) || 0,
          grossAmount: parseFloat(grossAmount) || 0,
        },
      })
    }

    console.log('Special purchase item updated/created')

    // Update stock ledger
    await prisma.stockLedger.updateMany({
      where: {
        refTable: 'special_purchase_bills',
        refId: id,
      },
      data: {
        entryDate: new Date(billDate),
        productId,
        qtyIn: parseFloat(weight) || 0,
      },
    })

    console.log('Stock ledger updated')

    return NextResponse.json({ success: true, specialPurchaseBill })
  } catch (error) {
    console.error('Error updating special purchase bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.toString() : String(error)
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 })
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

    // Check if special purchase bill exists and belongs to the company
    const specialPurchaseBill = await prisma.specialPurchaseBill.findFirst({
      where: {
        id: billId,
        companyId,
      },
    })

    if (!specialPurchaseBill) {
      return NextResponse.json({ error: 'Special purchase bill not found' }, { status: 404 })
    }

    // Delete special purchase items first
    await prisma.specialPurchaseItem.deleteMany({
      where: { specialPurchaseBillId: billId },
    })

    // Delete stock ledger entries
    await prisma.stockLedger.deleteMany({
      where: {
        refTable: 'special_purchase_bills',
        refId: billId,
      },
    })

    // Delete the special purchase bill
    await prisma.specialPurchaseBill.delete({
      where: { id: billId },
    })

    console.log('Special purchase bill deleted successfully:', billId)

    return NextResponse.json({ success: true, message: 'Special purchase bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting special purchase bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
