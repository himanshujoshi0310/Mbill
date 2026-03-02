import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ensureCompanyAccess, parseJsonWithSchema } from '@/lib/api-security'
import { cleanString, normalizeTenDigitPhone } from '@/lib/field-validation'

function normalizeCompanyId(raw: string | null): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value || value === 'null' || value === 'undefined') return null
  return value
}

const postSchema = z.object({
  companyId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  address: z.string().optional().nullable(),
  phone1: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNo: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  seed: z.boolean().optional()
}).strict()

const putSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().optional().nullable(),
  phone1: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNo: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable()
}).strict()

const DUMMY_SUPPLIERS = [
  {
    name: 'Shree Agro Supplies',
    address: 'Indore',
    phone1: '9988776655',
    phone2: '07314001122',
    ifscCode: 'HDFC0000123',
    bankName: 'HDFC Bank',
    accountNo: '001122334455',
    gstNumber: '23ABCDE1234F1Z5'
  },
  {
    name: 'Mahalaxmi Traders',
    address: 'Ujjain',
    phone1: '9765432109',
    phone2: null,
    ifscCode: 'SBIN0001234',
    bankName: 'SBI',
    accountNo: '998877665544',
    gstNumber: '23PQRSX9876L1Z8'
  }
] as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = normalizeCompanyId(searchParams.get('companyId'))

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const suppliers = await prisma.supplier.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        address: true,
        phone1: true,
        phone2: true,
        ifscCode: true,
        bankName: true,
        accountNo: true,
        gstNumber: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, postSchema)
    if (!parsed.ok) return parsed.response

    const { searchParams } = new URL(request.url)
    const companyId = normalizeCompanyId(searchParams.get('companyId') || parsed.data.companyId || null)
    const name = cleanString(parsed.data.name)
    const address = cleanString(parsed.data.address)
    const phone1 = normalizeTenDigitPhone(parsed.data.phone1)
    const phone2 = normalizeTenDigitPhone(parsed.data.phone2)
    const ifscCode = cleanString(parsed.data.ifscCode)?.toUpperCase() || null
    const bankName = cleanString(parsed.data.bankName)
    const accountNo = cleanString(parsed.data.accountNo)
    const gstNumber = cleanString(parsed.data.gstNumber)

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID and name are required' }, { status: 400 })
    }
    if (parsed.data.phone1 !== undefined && parsed.data.phone1 !== null && !phone1) {
      return NextResponse.json({ error: 'Primary phone must be exactly 10 digits' }, { status: 400 })
    }
    if (parsed.data.phone2 !== undefined && parsed.data.phone2 !== null && !phone2) {
      return NextResponse.json({ error: 'Secondary phone must be exactly 10 digits' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    if (parsed.data.seed === true) {
      const created = await prisma.$transaction(
        DUMMY_SUPPLIERS.map((row) =>
          prisma.supplier.create({
            data: {
              companyId,
              name: row.name,
              address: row.address,
              phone1: row.phone1,
              phone2: row.phone2,
              ifscCode: row.ifscCode,
              bankName: row.bankName,
              accountNo: row.accountNo,
              gstNumber: row.gstNumber
            }
          })
        )
      )
      return NextResponse.json({ success: true, message: `${created.length} dummy suppliers added successfully`, count: created.length })
    }

    if (!name) {
      return NextResponse.json({ error: 'Company ID and name are required' }, { status: 400 })
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        companyId,
        name,
      },
    })

    if (existingSupplier) {
      return NextResponse.json({ error: 'Supplier with this name already exists' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyId,
        name,
        address,
        phone1,
        phone2,
        ifscCode,
        bankName,
        accountNo,
        gstNumber,
      },
    })

    return NextResponse.json({ success: true, message: 'Supplier data stored successfully', supplier })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, putSchema)
    if (!parsed.ok) return parsed.response

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = normalizeCompanyId(searchParams.get('companyId'))

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Supplier ID and Company ID are required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const name = cleanString(parsed.data.name)

    if (name && name !== existingSupplier.name) {
      const nameConflict = await prisma.supplier.findFirst({
        where: {
          companyId,
          name,
          id: { not: id },
        },
      })

      if (nameConflict) {
        return NextResponse.json({ error: 'Supplier with this name already exists' }, { status: 400 })
      }
    }

    const phone1 = normalizeTenDigitPhone(parsed.data.phone1)
    const phone2 = normalizeTenDigitPhone(parsed.data.phone2)
    if (parsed.data.phone1 !== undefined && parsed.data.phone1 !== null && !phone1) {
      return NextResponse.json({ error: 'Primary phone must be exactly 10 digits' }, { status: 400 })
    }
    if (parsed.data.phone2 !== undefined && parsed.data.phone2 !== null && !phone2) {
      return NextResponse.json({ error: 'Secondary phone must be exactly 10 digits' }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name || existingSupplier.name,
        address: parsed.data.address !== undefined ? cleanString(parsed.data.address) : existingSupplier.address,
        phone1: parsed.data.phone1 !== undefined ? phone1 : existingSupplier.phone1,
        phone2: parsed.data.phone2 !== undefined ? phone2 : existingSupplier.phone2,
        ifscCode: parsed.data.ifscCode !== undefined ? cleanString(parsed.data.ifscCode)?.toUpperCase() || null : existingSupplier.ifscCode,
        bankName: parsed.data.bankName !== undefined ? cleanString(parsed.data.bankName) : existingSupplier.bankName,
        accountNo: parsed.data.accountNo !== undefined ? cleanString(parsed.data.accountNo) : existingSupplier.accountNo,
        gstNumber: parsed.data.gstNumber !== undefined ? cleanString(parsed.data.gstNumber) : existingSupplier.gstNumber,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = normalizeCompanyId(searchParams.get('companyId'))
    const all = searchParams.get('all') === 'true'

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    if (all) {
      const result = await prisma.supplier.deleteMany({ where: { companyId } })
      return NextResponse.json({ success: true, message: `${result.count} suppliers deleted successfully`, count: result.count })
    }

    if (!id) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const specialPurchaseBillsCount = await prisma.specialPurchaseBill.count({
      where: {
        supplierId: id,
      },
    })

    if (specialPurchaseBillsCount > 0) {
      return NextResponse.json({ error: 'Cannot delete supplier with existing special purchase bills' }, { status: 400 })
    }

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Supplier deleted successfully' })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
