import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

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
    const body = await request.json()
    const { companyId, name, address, phone1, phone2, ifscCode, bankName, accountNo, gstNumber } = body

    if (!companyId || !name) {
      return NextResponse.json({ error: 'Company ID and name are required' }, { status: 400 })
    }

    // Check if supplier already exists
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
        address: address || null,
        phone1: phone1 || null,
        phone2: phone2 || null,
        ifscCode: ifscCode || null,
        bankName: bankName || null,
        accountNo: accountNo || null,
        gstNumber: gstNumber || null,
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')
    const body = await request.json()
    const { name, address, phone1, phone2, ifscCode, bankName, accountNo, gstNumber } = body

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Supplier ID and Company ID are required' }, { status: 400 })
    }

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if name conflicts with another supplier
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

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name || existingSupplier.name,
        address: address !== undefined ? address : existingSupplier.address,
        phone1: phone1 !== undefined ? phone1 : existingSupplier.phone1,
        phone2: phone2 !== undefined ? phone2 : existingSupplier.phone2,
        ifscCode: ifscCode !== undefined ? ifscCode : existingSupplier.ifscCode,
        bankName: bankName !== undefined ? bankName : existingSupplier.bankName,
        accountNo: accountNo !== undefined ? accountNo : existingSupplier.accountNo,
        gstNumber: gstNumber !== undefined ? gstNumber : existingSupplier.gstNumber,
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
    const companyId = searchParams.get('companyId')

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Supplier ID and Company ID are required' }, { status: 400 })
    }

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if supplier has special purchase bills
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
