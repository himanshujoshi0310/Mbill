import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ensureCompanyAccess, getRequestAuthContext, parseJsonWithSchema } from '@/lib/api-security'
import { normalizeTenDigitPhone, parseNonNegativeNumber } from '@/lib/field-validation'
import { buildPaginationMeta, parsePaginationParams } from '@/lib/pagination'

const purchaseCreateSchema = z.object({
  companyId: z.string().min(1),
  billNumber: z.union([z.string(), z.number()]),
  billDate: z.string().min(1),
  farmerName: z.string().min(1),
  farmerAddress: z.string().optional(),
  farmerContact: z.string().optional(),
  krashakAnubandhNumber: z.string().optional(),
  markaNumber: z.string().optional(),
  productId: z.string().min(1),
  noOfBags: z.union([z.string(), z.number()]).optional(),
  hammali: z.union([z.string(), z.number()]).optional(),
  weight: z.union([z.string(), z.number()]),
  rate: z.union([z.string(), z.number()]),
  payableAmount: z.union([z.string(), z.number()]).optional(),
  paidAmount: z.union([z.string(), z.number()]).optional(),
  balance: z.union([z.string(), z.number()]).optional(),
  paymentStatus: z.string().optional()
})

const purchaseUpdateSchema = purchaseCreateSchema.extend({
  id: z.string().min(1),
  balanceAmount: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional()
})

function parseRequiredNonNegative(value: unknown, label: string): number | NextResponse {
  const num = parseNonNegativeNumber(value)
  if (num === null) {
    return NextResponse.json({ error: `${label} must be a non-negative number` }, { status: 400 })
  }
  return num
}

function clampNonNegative(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function sanitizePurchaseBill<T extends {
  totalAmount?: unknown
  paidAmount?: unknown
  balanceAmount?: unknown
  purchaseItems?: Array<{ qty?: unknown; rate?: unknown; hammali?: unknown; amount?: unknown }>
}>(bill: T): T {
  return {
    ...bill,
    totalAmount: clampNonNegative(bill.totalAmount),
    paidAmount: clampNonNegative(bill.paidAmount),
    balanceAmount: clampNonNegative(bill.balanceAmount),
    purchaseItems: Array.isArray(bill.purchaseItems)
      ? bill.purchaseItems.map((item) => ({
          ...item,
          qty: clampNonNegative(item.qty),
          rate: clampNonNegative(item.rate),
          hammali: clampNonNegative(item.hammali),
          amount: clampNonNegative(item.amount)
        }))
      : bill.purchaseItems
  } as T
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, purchaseCreateSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
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
      paymentStatus
    } = body

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied
    const farmerPhone = normalizeTenDigitPhone(farmerContact)
    if (farmerContact !== undefined && farmerContact !== null && farmerContact !== '' && !farmerPhone) {
      return NextResponse.json({ error: 'Farmer contact must be exactly 10 digits' }, { status: 400 })
    }

    const parsedWeight = parseRequiredNonNegative(weight, 'Weight')
    if (parsedWeight instanceof NextResponse) return parsedWeight
    const parsedRate = parseRequiredNonNegative(rate, 'Rate')
    if (parsedRate instanceof NextResponse) return parsedRate
    const parsedPayable = parseRequiredNonNegative(payableAmount, 'Payable amount')
    if (parsedPayable instanceof NextResponse) return parsedPayable
    const parsedPaid = parseNonNegativeNumber(paidAmount) ?? 0
    if (parsedPaid > parsedPayable) {
      return NextResponse.json({ error: 'Paid amount cannot exceed payable amount' }, { status: 400 })
    }
    const parsedBalance = parseNonNegativeNumber(balance) ?? 0
    const parsedHammali = parseNonNegativeNumber(hammali) ?? 0

    const auth = getRequestAuthContext(request)
    const userId = auth?.userId || 'system'

    let farmer = await prisma.farmer.findFirst({
      where: {
        companyId,
        name: farmerName
      }
    })

    if (!farmer) {
      farmer = await prisma.farmer.create({
        data: {
          companyId,
          name: farmerName,
          address: farmerAddress || null,
          phone1: farmerPhone,
          krashakAnubandhNumber: krashakAnubandhNumber || null
        }
      })
    } else {
      farmer = await prisma.farmer.update({
        where: { id: farmer.id },
        data: {
          address: farmerAddress || farmer.address,
          phone1: farmerPhone || farmer.phone1,
          krashakAnubandhNumber: krashakAnubandhNumber || farmer.krashakAnubandhNumber
        }
      })
    }

    const purchaseBill = await prisma.purchaseBill.create({
      data: {
        companyId,
        billNo: String(billNumber),
        billDate: new Date(billDate),
        farmerId: farmer.id,
        totalAmount: parsedPayable,
        paidAmount: parsedPaid,
        balanceAmount: parsedBalance,
        status: paymentStatus || 'unpaid',
        createdBy: userId
      }
    })

    await prisma.purchaseItem.create({
      data: {
        purchaseBillId: purchaseBill.id,
        productId,
        qty: parsedWeight,
        rate: parsedRate,
        hammali: parsedHammali,
        bags: noOfBags ? parseInt(String(noOfBags), 10) : null,
        markaNo: markaNumber || null,
        amount: parsedPayable
      }
    })

    await prisma.stockLedger.create({
      data: {
        companyId,
        entryDate: new Date(billDate),
        productId,
        type: 'purchase',
        qtyIn: parsedWeight,
        refTable: 'purchase_bills',
        refId: purchaseBill.id
      }
    })

    return NextResponse.json({ success: true, purchaseBill })
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
    const billId = searchParams.get('billId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }
    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    if (billId) {
      const purchaseBill = await prisma.purchaseBill.findFirst({
        where: { id: billId, companyId },
        include: {
          farmer: true,
          purchaseItems: {
            include: {
              product: true
            }
          }
        }
      })

      if (!purchaseBill) {
        return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
      }
      return NextResponse.json(sanitizePurchaseBill(purchaseBill))
    }

    if (last === 'true') {
      const bills = await prisma.purchaseBill.findMany({
        where: { companyId },
        select: { billNo: true }
      })
      const lastBillNumber = bills.reduce((max, bill) => {
        const value = Number.parseInt(bill.billNo, 10)
        return Number.isFinite(value) ? Math.max(max, value) : max
      }, 0)
      return NextResponse.json({ lastBillNumber })
    }

    const whereClause: {
      companyId: string
      billDate?: { gte?: Date; lte?: Date }
      OR?: Array<{ billNo: { contains: string } } | { status: { contains: string } }>
    } = { companyId }

    if (dateFrom || dateTo) {
      whereClause.billDate = {}
      if (dateFrom) whereClause.billDate.gte = new Date(dateFrom)
      if (dateTo) whereClause.billDate.lte = new Date(dateTo)
    }

    const pagination = parsePaginationParams(searchParams, { defaultPageSize: 50, maxPageSize: 200 })
    if (pagination.search) {
      whereClause.OR = [
        { billNo: { contains: pagination.search } },
        { status: { contains: pagination.search } }
      ]
    }

    const [purchaseBills, total] = await Promise.all([
      prisma.purchaseBill.findMany({
        where: whereClause,
        include: {
          farmer: true,
          purchaseItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        ...(pagination.enabled ? { skip: pagination.skip, take: pagination.pageSize } : {})
      }),
      pagination.enabled ? prisma.purchaseBill.count({ where: whereClause }) : Promise.resolve(0)
    ])

    const safePurchaseBills = purchaseBills.map((bill) => sanitizePurchaseBill(bill))

    if (pagination.enabled) {
      return NextResponse.json({
        data: safePurchaseBills,
        meta: buildPaginationMeta(total, pagination)
      })
    }

    return NextResponse.json(safePurchaseBills)
  } catch {
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
    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const purchaseBill = await prisma.purchaseBill.findFirst({
      where: { id: billId, companyId },
      include: {
        purchaseItems: true
      }
    })

    if (!purchaseBill) {
      return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
    }

    await prisma.stockLedger.deleteMany({
      where: {
        refTable: 'purchase_bills',
        refId: billId
      }
    })

    await prisma.purchaseItem.deleteMany({
      where: { purchaseBillId: billId }
    })

    await prisma.purchaseBill.delete({
      where: { id: billId }
    })

    return NextResponse.json({ success: true, message: 'Purchase bill deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, purchaseUpdateSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
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
      status
    } = body

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied
    const farmerPhone = normalizeTenDigitPhone(farmerContact)
    if (farmerContact !== undefined && farmerContact !== null && farmerContact !== '' && !farmerPhone) {
      return NextResponse.json({ error: 'Farmer contact must be exactly 10 digits' }, { status: 400 })
    }

    const parsedWeight = parseRequiredNonNegative(weight, 'Weight')
    if (parsedWeight instanceof NextResponse) return parsedWeight
    const parsedRate = parseRequiredNonNegative(rate, 'Rate')
    if (parsedRate instanceof NextResponse) return parsedRate
    const parsedPayable = parseRequiredNonNegative(payableAmount, 'Payable amount')
    if (parsedPayable instanceof NextResponse) return parsedPayable
    const parsedPaid = parseNonNegativeNumber(paidAmount) ?? 0
    if (parsedPaid > parsedPayable) {
      return NextResponse.json({ error: 'Paid amount cannot exceed payable amount' }, { status: 400 })
    }
    const parsedBalance = parseNonNegativeNumber(balanceAmount) ?? 0
    const parsedHammali = parseNonNegativeNumber(hammali) ?? 0

    let farmer = await prisma.farmer.findFirst({
      where: {
        companyId,
        name: farmerName
      }
    })

    if (!farmer) {
      farmer = await prisma.farmer.create({
        data: {
          companyId,
          name: farmerName,
          address: farmerAddress || null,
          phone1: farmerPhone,
          krashakAnubandhNumber: krashakAnubandhNumber || null
        }
      })
    } else {
      farmer = await prisma.farmer.update({
        where: { id: farmer.id },
        data: {
          address: farmerAddress || farmer.address,
          phone1: farmerPhone || farmer.phone1,
          krashakAnubandhNumber: krashakAnubandhNumber || farmer.krashakAnubandhNumber
        }
      })
    }

    const purchaseBill = await prisma.purchaseBill.update({
      where: { id },
      data: {
        companyId,
        billNo: String(billNumber),
        billDate: new Date(billDate),
        farmerId: farmer.id,
        totalAmount: parsedPayable,
        paidAmount: parsedPaid,
        balanceAmount: parsedBalance,
        status: status || 'unpaid'
      }
    })

    const existingItem = await prisma.purchaseItem.findFirst({
      where: { purchaseBillId: id }
    })
    if (existingItem) {
      await prisma.purchaseItem.update({
        where: { id: existingItem.id },
        data: {
          productId,
          qty: parsedWeight,
          rate: parsedRate,
          hammali: parsedHammali,
          bags: noOfBags ? parseInt(String(noOfBags), 10) : null,
          amount: parsedPayable
        }
      })
    }

    const existingLedger = await prisma.stockLedger.findFirst({
      where: {
        refTable: 'purchase_bills',
        refId: id
      }
    })
    if (existingLedger) {
      await prisma.stockLedger.update({
        where: { id: existingLedger.id },
        data: {
          companyId,
          entryDate: new Date(billDate),
          productId,
          qtyIn: parsedWeight
        }
      })
    }

    return NextResponse.json({ success: true, purchaseBill })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
