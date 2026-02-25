import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { validateStockBeforeSale } from '@/lib/stock-automation'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SALES BILLS API POST METHOD CALLED ===')
    
    const body = await request.json()
    console.log('RAW REQUEST BODY:', JSON.stringify(body, null, 2))
    
    // STEP 2: Validate salesItems structure
    if (body.salesItems) {
      console.log('SALES ITEMS ARRAY LENGTH:', body.salesItems.length)
      body.salesItems.forEach((item: any, index: number) => {
        console.log(`SALES ITEM ${index}:`, JSON.stringify(item, null, 2))
        console.log(`  - productId: ${item.productId}`)
        console.log(`  - productId type: ${typeof item.productId}`)
        console.log(`  - productId is null: ${item.productId === null}`)
        console.log(`  - productId is undefined: ${item.productId === undefined}`)
        console.log(`  - productId is empty string: ${item.productId === ""}`)
      })
    } else {
      console.log('❌ salesItems is missing from request body')
    }

    const {
      companyId,
      invoiceNo,
      invoiceDate,
      partyName,
      partyAddress,
      partyContact,
      transportName,
      lorryNumber,
      freightPerQt,
      freightAmount,
      advance,
      toPay,
      salesItems,
      totalProductItemQty,
      totalNoOfBags,
      totalWeight,
      totalAmount
    } = body

    // Validate required fields
    if (!companyId || !partyName || !salesItems || salesItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate stock availability before creating sales
    console.log('=== VALIDATING STOCK AVAILABILITY ===')
    const stockValidation = await validateStockBeforeSale(
      companyId,
      salesItems.map((item: any) => ({
        productId: item.productId,
        weight: parseFloat(item.weight) || 0
      }))
    )

    if (!stockValidation.isValid) {
      console.error('❌ Stock validation failed:', stockValidation.message)
      return NextResponse.json({ 
        error: 'Stock validation failed', 
        message: stockValidation.message,
        stockDetails: stockValidation.stockDetails
      }, { status: 400 })
    }

    console.log('✅ Stock validation passed')

    // Get user from cookies
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value || 'test-user'

    console.log('Creating party for:', partyName, 'company:', companyId)

    // Find or create party
    let party = await prisma.party.findFirst({
      where: {
        companyId,
        name: partyName,
      },
    })

    console.log('Party found:', party)

    if (!party) {
      console.log('Creating new party...')
      party = await prisma.party.create({
        data: {
          companyId,
          type: 'buyer',
          name: partyName,
          address: partyAddress || null,
          phone1: partyContact || null,
        },
      })
      console.log('Created new party:', party.id)
    } else {
      console.log('Updating existing party...')
      // Update existing party with new information if provided
      party = await prisma.party.update({
        where: { id: party.id },
        data: {
          address: partyAddress || party.address,
          phone1: partyContact || party.phone1,
        },
      })
      console.log('Updated existing party:', party.id)
    }

    // STEP 9: Use transaction for debugging
    let createdSalesBill: any = null
    
    await prisma.$transaction(async (tx) => {
      console.log('=== TRANSACTION STARTED ===')
      
      // Create sales bill within transaction
      console.log('Creating sales bill...')
      const salesBill = await tx.salesBill.create({
        data: {
          companyId,
          billNo: invoiceNo,
          billDate: new Date(invoiceDate),
          partyId: party.id,
          totalAmount: parseFloat(totalAmount) || 0,
          receivedAmount: 0, // Will be updated based on payments
          balanceAmount: parseFloat(totalAmount) || 0,
          status: 'unpaid',
          createdBy: userId,
        },
      })

      // STEP 3: Log sales bill creation result
      console.log('=== SALES BILL CREATION RESULT ===')
      console.log('CREATED SALES ID:', salesBill.id)
      console.log('salesBill.id type:', typeof salesBill.id)
      console.log('salesBill.id is undefined:', salesBill.id === undefined)
      console.log('salesBill.id is null:', salesBill.id === null)
      console.log('salesBill.id is empty string:', salesBill.id === "")
      if (!salesBill.id) {
        throw new Error('❌ SALES BILL CREATION FAILED: ID is undefined/null')
      }
      console.log('✅ Sales bill created successfully with ID:', salesBill.id)
      
      // Store for use outside transaction
      createdSalesBill = salesBill

      // Create sales items within transaction
      console.log('Creating sales items, count:', salesItems.length)
      for (const item of salesItems) {
        // STEP 4: Validate IDs BEFORE inserting
        console.log('=== VALIDATING ITEM BEFORE INSERT ===')
        console.log('ITEM TO INSERT:', JSON.stringify(item, null, 2))
        console.log('ITEM SOURCE - currentFormItems from frontend')
        console.log('ITEM.productId:', item.productId)
        console.log('ITEM.productId type:', typeof item.productId)
        
        if (!item.productId) {
          console.error('❌ productId is missing')
          throw new Error(`❌ productId is missing for item: ${JSON.stringify(item)}`)
        }
        
        if (!salesBill.id) {
          console.error('❌ salesBill.id is missing')
          throw new Error('❌ salesBill.id is missing')
        }
        
        console.log(`✅ Validation passed - productId: ${item.productId}, salesBillId: ${salesBill.id}`)
        
        // STEP 6: Log exact Prisma payload
        const payload = {
          salesBillId: salesBill.id,
          productId: item.productId,
          weight: item.weight || 0,
          bags: item.bags || null,
          rate: item.rate || 0,
          amount: item.amount || 0,
        }
        
        console.log('=== PRISMA PAYLOAD ===')
        console.log('PRISMA PAYLOAD:', JSON.stringify(payload, null, 2))
        console.log('salesBillId type:', typeof payload.salesBillId)
        console.log('productId type:', typeof payload.productId)
        console.log('weight type:', typeof payload.weight)
        console.log('rate type:', typeof payload.rate)
        console.log('amount type:', typeof payload.amount)
        console.log('Any NaN values:', Object.values(payload).some(val => isNaN(val)))
        
        // STEP 7: Wrap Prisma call with detailed error logging
        try {
          await tx.salesItem.create({
            data: payload,
          })
          console.log(`✅ Sales item created successfully for productId: ${item.productId}`)
        } catch (err: any) {
          console.error('=== PRISMA ERROR DETAILS ===')
          console.error('PRISMA ERROR ITEM:', payload)
          console.error('ERROR CODE:', err.code)
          console.error('ERROR MESSAGE:', err.message)
          console.error('ERROR META:', err.meta)
          console.error('FULL ERROR:', err)
          throw new Error(`❌ SALES ITEM CREATION FAILED: ${err.message} (Code: ${err.code})`)
        }
      }

      console.log('=== CREATING STOCK LEDGER ENTRIES ===')
      // Update stock ledger within transaction
      console.log('Updating stock ledger...')
      for (const item of salesItems) {
        await tx.stockLedger.create({
          data: {
            companyId,
            entryDate: new Date(invoiceDate),
            productId: item.productId,
            type: 'sales',
            qtyOut: item.weight || 0,
            refTable: 'sales_bills',
            refId: salesBill.id,
          },
        })
      }
      
      console.log('✅ TRANSACTION COMPLETED SUCCESSFULLY')
    })

    return NextResponse.json({ success: true, salesBill: createdSalesBill })
  } catch (error) {
    console.error('Error creating sales bill:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.toString() : String(error)
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== SALES BILLS API GET METHOD CALLED ===')
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const last = searchParams.get('last')
    
    console.log('COMPANY ID:', companyId)
    console.log('LAST PARAMETER:', last)

    if (!companyId) {
      console.log('❌ Company ID is required')
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    if (last === 'true') {
      console.log('GETTING LAST BILL NUMBER FOR COMPANY:', companyId)
      // Get highest bill number for company
      const lastBill = await prisma.salesBill.findFirst({
        where: { companyId },
        orderBy: { billNo: 'desc' },
        select: { billNo: true },
      })

      const lastBillNumber = lastBill ? parseInt(lastBill.billNo) : 0
      console.log('LAST BILL NUMBER FOUND:', lastBillNumber)
      return NextResponse.json({ lastBillNumber })
    }

    // Default: return all sales bills for company
    const salesBills = await prisma.salesBill.findMany({
      where: { companyId },
      include: {
        party: true,
        salesItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(salesBills)
  } catch (error) {
    console.error('Error in sales bills API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
