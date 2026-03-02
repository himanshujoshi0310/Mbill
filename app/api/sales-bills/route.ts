import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStockBeforeSale } from '@/lib/stock-automation'
import { z } from 'zod'
import { ensureCompanyAccess, getRequestAuthContext, parseJsonWithSchema } from '@/lib/api-security'

const salesItemSchema = z.object({
  productId: z.string().min(1),
  weight: z.coerce.number().min(0).optional(),
  bags: z.coerce.number().int().min(0).optional(),
  rate: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0).optional()
})

const salesCreateSchema = z.object({
  companyId: z.string().min(1),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  partyName: z.string().min(1),
  partyAddress: z.string().optional(),
  partyContact: z.string().optional(),
  salesItems: z.array(salesItemSchema).min(1),
  totalAmount: z.union([z.string(), z.number()]).optional()
})

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, salesCreateSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
    const {
      companyId,
      invoiceNo,
      invoiceDate,
      partyName,
      partyAddress,
      partyContact,
      salesItems,
      totalAmount
    } = body
    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const stockValidation = await validateStockBeforeSale(
      companyId,
      salesItems.map((item) => ({
        productId: item.productId,
        weight: Number(item.weight) || 0
      }))
    )
    if (!stockValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Stock validation failed',
          message: stockValidation.message,
          stockDetails: stockValidation.stockDetails
        },
        { status: 400 }
      )
    }

    const auth = getRequestAuthContext(request)
    const userId = auth?.userId || 'system'

    let party = await prisma.party.findFirst({
      where: {
        companyId,
        name: partyName
      }
    })

    if (!party) {
      party = await prisma.party.create({
        data: {
          companyId,
          type: 'buyer',
          name: partyName,
          address: partyAddress || null,
          phone1: partyContact || null
        }
      })
    } else {
      party = await prisma.party.update({
        where: { id: party.id },
        data: {
          address: partyAddress || party.address,
          phone1: partyContact || party.phone1
        }
      })
    }

    const createdSalesBill = await prisma.$transaction(async (tx) => {
      const salesBill = await tx.salesBill.create({
        data: {
          companyId,
          billNo: invoiceNo || '1',
          billDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          partyId: party.id,
          totalAmount: Number(totalAmount) || 0,
          receivedAmount: 0,
          balanceAmount: Number(totalAmount) || 0,
          status: 'unpaid',
          createdBy: userId
        }
      })

      for (const item of salesItems) {
        if (!item.productId) {
          throw new Error('productId is missing in sales item')
        }

        await tx.salesItem.create({
          data: {
            salesBillId: salesBill.id,
            productId: item.productId,
            weight: Number(item.weight) || 0,
            bags: item.bags ? Number(item.bags) : null,
            rate: Number(item.rate) || 0,
            amount: Number(item.amount) || 0
          }
        })
      }

      for (const item of salesItems) {
        await tx.stockLedger.create({
          data: {
            companyId,
            entryDate: invoiceDate ? new Date(invoiceDate) : new Date(),
            productId: item.productId,
            type: 'sales',
            qtyOut: Number(item.weight) || 0,
            refTable: 'sales_bills',
            refId: salesBill.id
          }
        })
      }

      return salesBill
    })

    return NextResponse.json({ success: true, salesBill: createdSalesBill })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const last = searchParams.get('last')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }
    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    if (last === 'true') {
      const bills = await prisma.salesBill.findMany({
        where: { companyId },
        select: { billNo: true }
      })
      const lastBillNumber = bills.reduce((max, bill) => {
        const value = Number.parseInt(bill.billNo, 10)
        return Number.isFinite(value) ? Math.max(max, value) : max
      }, 0)
      return NextResponse.json({ lastBillNumber })
    }

    const salesBills = await prisma.salesBill.findMany({
      where: { companyId },
      include: {
        party: true,
        salesItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(salesBills)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
