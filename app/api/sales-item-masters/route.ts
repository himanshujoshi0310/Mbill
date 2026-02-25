import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporary in-memory storage for sales items
// Allows multiple sales items per product
let salesItemsStore: any[] = []
let nextId = 1

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get products for reference
    const products = await prisma.product.findMany({
      where: { companyId },
      include: {
        unit: true
      },
      orderBy: { name: 'asc' },
    })

    // Get sales items for this company
    const companySalesItems = salesItemsStore.filter(item => item.companyId === companyId)

    // Transform sales items with product info
    const salesItemMasters = companySalesItems.map(salesItem => {
      const product = products.find(p => p.id === salesItem.productId)
      return {
        id: salesItem.id,
        productId: salesItem.productId,
        salesItemName: salesItem.salesItemName,
        product: product || null,
        hsnCode: salesItem.hsnCode,
        gstRate: salesItem.gstRate,
        sellingPrice: salesItem.sellingPrice,
        description: salesItem.description,
        isActive: salesItem.isActive,
        createdAt: salesItem.createdAt,
        updatedAt: salesItem.updatedAt,
      }
    }).filter(item => item.product !== null) // Only return items with valid products

    return NextResponse.json(salesItemMasters)
  } catch (error) {
    console.error('Error fetching sales item masters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, productId, salesItemName, hsnCode, gstRate, sellingPrice, description, isActive } = body

    if (!companyId || !productId || !salesItemName) {
      return NextResponse.json({ error: 'Company ID, Product ID, and Sales Item Name are required' }, { status: 400 })
    }

    // Create new sales item with unique ID
    const now = new Date()
    const newSalesItem = {
      id: `temp_${nextId++}`,
      companyId,
      productId,
      salesItemName: salesItemName.trim(),
      hsnCode: hsnCode || null,
      gstRate: gstRate ? parseFloat(gstRate) : null,
      sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
      description: description || null,
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now,
    }

    // Add to store
    salesItemsStore.push(newSalesItem)

    // Get product info for response
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { unit: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Transform to response format
    const salesItemMaster = {
      ...newSalesItem,
      product: product,
    }

    return NextResponse.json(salesItemMaster)
  } catch (error) {
    console.error('Error creating sales item master:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, salesItemName, hsnCode, gstRate, sellingPrice, description, isActive } = body

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Sales Item Master ID and Company ID are required' }, { status: 400 })
    }

    // Find and update the sales item
    const itemIndex = salesItemsStore.findIndex(item => item.id === id && item.companyId === companyId)
    
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Sales Item Master not found' }, { status: 404 })
    }

    // Update the sales item
    const updatedItem = {
      ...salesItemsStore[itemIndex],
      productId: productId !== undefined ? productId : salesItemsStore[itemIndex].productId,
      salesItemName: salesItemName !== undefined ? salesItemName.trim() : salesItemsStore[itemIndex].salesItemName,
      hsnCode: hsnCode !== undefined ? hsnCode : salesItemsStore[itemIndex].hsnCode,
      gstRate: gstRate !== undefined ? (gstRate ? parseFloat(gstRate) : null) : salesItemsStore[itemIndex].gstRate,
      sellingPrice: sellingPrice !== undefined ? (sellingPrice ? parseFloat(sellingPrice) : null) : salesItemsStore[itemIndex].sellingPrice,
      description: description !== undefined ? description : salesItemsStore[itemIndex].description,
      isActive: isActive !== undefined ? isActive : salesItemsStore[itemIndex].isActive,
      updatedAt: new Date(),
    }

    salesItemsStore[itemIndex] = updatedItem

    // Get product info for response
    const product = await prisma.product.findUnique({
      where: { id: updatedItem.productId },
      include: { unit: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Transform to response format
    const salesItemMaster = {
      ...updatedItem,
      product: product,
    }

    return NextResponse.json(salesItemMaster)
  } catch (error) {
    console.error('Error updating sales item master:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Sales Item Master ID and Company ID are required' }, { status: 400 })
    }

    // Remove the sales item from store
    const initialLength = salesItemsStore.length
    salesItemsStore = salesItemsStore.filter(item => !(item.id === id && item.companyId === companyId))

    if (salesItemsStore.length === initialLength) {
      return NextResponse.json({ error: 'Sales Item Master not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Sales Item Master deleted successfully' })
  } catch (error) {
    console.error('Error deleting sales item master:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
