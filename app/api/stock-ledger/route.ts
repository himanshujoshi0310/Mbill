import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ensureCompanyAccess, parseJsonWithSchema } from '@/lib/api-security'

const stockLedgerCreateSchema = z.object({
  companyId: z.string().min(1),
  productId: z.string().min(1),
  entryDate: z.string().min(1),
  type: z.enum(['purchase', 'sales', 'adjustment']),
  qtyIn: z.coerce.number().min(0).optional(),
  qtyOut: z.coerce.number().min(0).optional(),
  refTable: z.string().min(1),
  refId: z.string().min(1)
}).refine((data) => (data.qtyIn || 0) > 0 || (data.qtyOut || 0) > 0, {
  message: 'Either qtyIn or qtyOut must be greater than 0',
  path: ['qtyIn']
})

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, stockLedgerCreateSchema)
    if (!parsed.ok) return parsed.response
    const { companyId, productId, entryDate, type, qtyIn, qtyOut, refTable, refId } = parsed.data
    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    // Create stock ledger entry
    const stockLedger = await prisma.stockLedger.create({
      data: {
        companyId,
        entryDate: new Date(entryDate),
        productId,
        type,
        qtyIn: Number(qtyIn) || 0,
        qtyOut: Number(qtyOut) || 0,
        refTable,
        refId
      }
    })

    return NextResponse.json({ success: true, stockLedger })
  } catch (error) {
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
    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

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
    void error
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
