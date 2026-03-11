import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateStockBeforeSale } from '@/lib/stock-automation'
import { z } from 'zod'
import { ensureCompanyAccess, getRequestAuthContext, normalizeId, parseJsonWithSchema } from '@/lib/api-security'
import { buildPaginationMeta, parsePaginationParams } from '@/lib/pagination'

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

const salesUpdateSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().min(1),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  partyName: z.string().optional(),
  partyAddress: z.string().optional(),
  partyContact: z.string().optional(),
  salesItems: z.array(z.object({
    productId: z.string().min(1),
    totalWeight: z.coerce.number().min(0).optional(),
    qty: z.coerce.number().min(0).optional(),
    bags: z.coerce.number().int().min(0).optional(),
    weight: z.coerce.number().min(0).optional(),
    rate: z.coerce.number().min(0).optional(),
    amount: z.coerce.number().min(0).optional()
  })).optional(),
  transportBill: z.object({
    transportName: z.string().optional().nullable(),
    lorryNo: z.string().optional().nullable(),
    freightPerQt: z.coerce.number().min(0).optional(),
    freightAmount: z.coerce.number().min(0).optional(),
    advance: z.coerce.number().min(0).optional(),
    toPay: z.coerce.number().min(0).optional()
  }).optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  receivedAmount: z.union([z.string(), z.number()]).optional(),
  balanceAmount: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional()
})

function safeToDate(value?: string): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : new Date()
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, parsed)
}

function extractBillSequence(billNo: string): number {
  if (!billNo) return 0
  const trimmed = billNo.trim()
  if (!trimmed) return 0
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10)
  const chunks = trimmed.match(/\d+/g)
  if (!chunks || chunks.length === 0) return 0
  const lastChunk = chunks[chunks.length - 1]
  const parsed = Number.parseInt(lastChunk, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function sanitizeSalesBill<T extends {
  totalAmount?: unknown
  receivedAmount?: unknown
  balanceAmount?: unknown
  status?: unknown
  salesItems?: Array<{ qty?: unknown; weight?: unknown; rate?: unknown; amount?: unknown }>
}>(bill: T): T {
  const safeTotalAmount = toNonNegativeNumber(bill.totalAmount, 0)
  const safeReceivedAmount = toNonNegativeNumber(bill.receivedAmount, 0)
  const safeBalanceAmount = Math.max(0, safeTotalAmount - safeReceivedAmount)
  const safeStatus = safeBalanceAmount === 0 ? 'paid' : safeReceivedAmount > 0 ? 'partial' : 'unpaid'

  return {
    ...bill,
    totalAmount: safeTotalAmount,
    receivedAmount: safeReceivedAmount,
    balanceAmount: safeBalanceAmount,
    status: safeStatus,
    salesItems: Array.isArray(bill.salesItems)
      ? bill.salesItems.map((item) => ({
          ...item,
          qty: toNonNegativeNumber(item.qty ?? item.weight, 0),
          weight: toNonNegativeNumber(item.weight ?? item.qty, 0),
          rate: toNonNegativeNumber(item.rate, 0),
          amount: toNonNegativeNumber(item.amount, 0)
        }))
      : bill.salesItems
  } as T
}

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
          billDate: safeToDate(invoiceDate),
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
            entryDate: safeToDate(invoiceDate),
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
    const companyId = normalizeId(searchParams.get('companyId'))
    const billId = normalizeId(searchParams.get('billId'))
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
        const value = extractBillSequence(bill.billNo)
        return Number.isFinite(value) ? Math.max(max, value) : max
      }, 0)
      return NextResponse.json({ lastBillNumber })
    }

    if (billId) {
      const bill = await prisma.salesBill.findFirst({
        where: {
          id: billId,
          companyId
        },
        include: {
          party: true,
          salesItems: {
            include: {
              product: true
            }
          },
          transportBills: true
        }
      })

      if (!bill) {
        return NextResponse.json({ error: 'Sales bill not found' }, { status: 404 })
      }

      return NextResponse.json(sanitizeSalesBill(bill))
    }

    const pagination = parsePaginationParams(searchParams, { defaultPageSize: 50, maxPageSize: 200 })
    const whereClause = {
      companyId,
      ...(pagination.search
        ? {
            OR: [
              { billNo: { contains: pagination.search } },
              { status: { contains: pagination.search } }
            ]
          }
        : {})
    }

    const [salesBills, total] = await Promise.all([
      prisma.salesBill.findMany({
        where: whereClause,
        include: {
          party: true,
          salesItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        ...(pagination.enabled ? { skip: pagination.skip, take: pagination.pageSize } : {})
      }),
      pagination.enabled ? prisma.salesBill.count({ where: whereClause }) : Promise.resolve(0)
    ])

    const safeSalesBills = salesBills.map((bill) => sanitizeSalesBill(bill))

    if (pagination.enabled) {
      return NextResponse.json({
        data: safeSalesBills,
        meta: buildPaginationMeta(total, pagination)
      })
    }

    return NextResponse.json(safeSalesBills)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, salesUpdateSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const companyId = normalizeId(body.companyId)
    const billId = normalizeId(body.id || new URL(request.url).searchParams.get('billId'))

    if (!companyId || !billId) {
      return NextResponse.json({ error: 'Company ID and bill ID are required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const existing = await prisma.salesBill.findFirst({
      where: {
        id: billId,
        companyId
      },
      include: {
        salesItems: true
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Sales bill not found' }, { status: 404 })
    }

    let partyId = existing.partyId
    const requestedParty = normalizeId(body.partyName)
    if (requestedParty) {
      const party = await prisma.party.findFirst({
        where: {
          id: requestedParty,
          companyId
        }
      })
      if (party) {
        partyId = party.id
        if (body.partyAddress !== undefined || body.partyContact !== undefined) {
          await prisma.party.update({
            where: { id: party.id },
            data: {
              address: body.partyAddress ?? party.address,
              phone1: body.partyContact ?? party.phone1
            }
          })
        }
      }
    }

    const nextBillDate = body.invoiceDate ? safeToDate(body.invoiceDate) : existing.billDate
    const nextTotal = body.totalAmount !== undefined ? toNonNegativeNumber(body.totalAmount, existing.totalAmount) : existing.totalAmount
    const nextReceived = body.receivedAmount !== undefined ? toNonNegativeNumber(body.receivedAmount, existing.receivedAmount) : existing.receivedAmount
    const nextBalance = body.balanceAmount !== undefined
      ? toNonNegativeNumber(body.balanceAmount, existing.balanceAmount)
      : Math.max(0, nextTotal - nextReceived)
    const nextStatus = body.status || (nextBalance === 0 ? 'paid' : nextReceived > 0 ? 'partial' : 'unpaid')

    const updated = await prisma.$transaction(async (tx) => {
      const bill = await tx.salesBill.update({
        where: { id: existing.id },
        data: {
          billNo: body.invoiceNo?.trim() || existing.billNo,
          billDate: nextBillDate,
          partyId,
          totalAmount: nextTotal,
          receivedAmount: nextReceived,
          balanceAmount: nextBalance,
          status: nextStatus
        },
        include: {
          party: true,
          salesItems: {
            include: {
              product: true
            }
          }
        }
      })

      if (Array.isArray(body.salesItems) && body.salesItems.length > 0) {
        await tx.salesItem.deleteMany({ where: { salesBillId: existing.id } })
        await tx.stockLedger.deleteMany({
          where: {
            companyId,
            refTable: 'sales_bills',
            refId: existing.id
          }
        })

        for (const item of body.salesItems) {
          const normalizedWeight = toNonNegativeNumber(
            item.weight ?? item.totalWeight ?? item.qty ?? 0,
            0
          )
          await tx.salesItem.create({
            data: {
              salesBillId: existing.id,
              productId: item.productId,
              weight: normalizedWeight,
              rate: toNonNegativeNumber(item.rate, 0),
              amount: toNonNegativeNumber(item.amount, 0),
              bags: item.bags !== undefined ? Math.floor(toNonNegativeNumber(item.bags, 0)) : null
            }
          })
          await tx.stockLedger.create({
            data: {
              companyId,
              entryDate: nextBillDate,
              productId: item.productId,
              type: 'sales',
              qtyOut: normalizedWeight,
              refTable: 'sales_bills',
              refId: existing.id
            }
          })
        }
      }

      if (body.transportBill) {
        const transportName = body.transportBill.transportName?.trim() || null
        const lorryNo = body.transportBill.lorryNo?.trim() || null
        const freightPerQt = toNonNegativeNumber(body.transportBill.freightPerQt, 0)
        const freightAmount = toNonNegativeNumber(body.transportBill.freightAmount, 0)
        const advance = toNonNegativeNumber(body.transportBill.advance, 0)
        const toPay = toNonNegativeNumber(body.transportBill.toPay, 0)

        const hasTransportData = Boolean(
          transportName ||
          lorryNo ||
          freightPerQt > 0 ||
          freightAmount > 0 ||
          advance > 0 ||
          toPay > 0
        )

        const existingTransportBill = await tx.transportBill.findFirst({
          where: { salesBillId: existing.id }
        })

        if (hasTransportData) {
          if (existingTransportBill) {
            await tx.transportBill.update({
              where: { id: existingTransportBill.id },
              data: {
                transportName,
                lorryNo,
                freightPerQt,
                freightAmount,
                advance,
                toPay
              }
            })
          } else {
            await tx.transportBill.create({
              data: {
                salesBillId: existing.id,
                transportName,
                lorryNo,
                freightPerQt,
                freightAmount,
                advance,
                toPay
              }
            })
          }
        } else if (existingTransportBill) {
          await tx.transportBill.delete({
            where: { id: existingTransportBill.id }
          })
        }
      }

      return bill
    })

    return NextResponse.json({ success: true, salesBill: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams
    const companyId = normalizeId(searchParams.get('companyId'))
    const billId = normalizeId(searchParams.get('billId'))

    if (!companyId || !billId) {
      return NextResponse.json({ error: 'Company ID and bill ID are required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const existing = await prisma.salesBill.findFirst({
      where: {
        id: billId,
        companyId
      },
      select: { id: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Sales bill not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockLedger.deleteMany({
        where: {
          companyId,
          refTable: 'sales_bills',
          refId: billId
        }
      })
      await tx.salesBill.delete({
        where: { id: billId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
