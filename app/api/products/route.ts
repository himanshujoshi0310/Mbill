import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: { companyId },
      include: {
        unit: true,
        stockLedger: {
          select: {
            qtyIn: true,
            qtyOut: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const productsWithStock = products.map(product => {
      const totalIn = product.stockLedger.reduce((sum: number, ledger: any) => sum + ledger.qtyIn, 0)
      const totalOut = product.stockLedger.reduce((sum: number, ledger: any) => sum + ledger.qtyOut, 0)
      const currentStock = totalIn - totalOut

      return {
        id: product.id,
        name: product.name,
        unit: product.unit.symbol,
        hsnCode: product.hsnCode,
        gstRate: product.gstRate,
        sellingPrice: product.sellingPrice,
        description: product.description,
        isActive: product.isActive,
        currentStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }
    })

    return NextResponse.json(productsWithStock)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, hsnCode, gstRate, sellingPrice, description, isActive } = body

    if (!name || !unit) {
      return NextResponse.json({ error: 'Product name and unit are required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Find the unit by symbol for this company
    const unitRecord = await prisma.unit.findFirst({
      where: { 
        companyId,
        symbol: unit.toLowerCase()
      }
    })

    if (!unitRecord) {
      return NextResponse.json({ error: 'Invalid unit' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        companyId,
        name,
        unitId: unitRecord.id,
        hsnCode: hsnCode || null,
        gstRate: gstRate ? parseFloat(gstRate) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        description: description || null,
        isActive: isActive !== false,
      },
      include: {
        unit: true
      }
    })

    return NextResponse.json({
      id: product.id,
      name: product.name,
      unit: product.unit.symbol,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate,
      sellingPrice: product.sellingPrice,
      description: product.description,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, hsnCode, gstRate, sellingPrice, description, isActive } = body

    if (!name || !unit) {
      return NextResponse.json({ error: 'Product name and unit are required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Find the unit by symbol for this company
    const unitRecord = await prisma.unit.findFirst({
      where: { 
        companyId,
        symbol: unit.toLowerCase()
      }
    })

    if (!unitRecord) {
      return NextResponse.json({ error: 'Invalid unit' }, { status: 400 })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        unitId: unitRecord.id,
        hsnCode: hsnCode || null,
        gstRate: gstRate ? parseFloat(gstRate) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        description: description || null,
        isActive: isActive !== false,
      },
      include: {
        unit: true
      }
    })

    return NextResponse.json({
      id: product.id,
      name: product.name,
      unit: product.unit.symbol,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate,
      sellingPrice: product.sellingPrice,
      description: product.description,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}