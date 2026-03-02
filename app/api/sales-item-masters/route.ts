import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ensureCompanyAccess, parseJsonWithSchema } from '@/lib/api-security'

let salesItemsStore: any[] = []
let nextId = 1

const postSchema = z.object({
  companyId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  salesItemName: z.string().trim().min(1),
  hsnCode: z.string().optional().nullable(),
  gstRate: z.union([z.number(), z.string()]).optional().nullable(),
  sellingPrice: z.union([z.number(), z.string()]).optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional()
}).strict()

const putSchema = z.object({
  productId: z.string().trim().min(1).optional(),
  salesItemName: z.string().trim().min(1).optional(),
  hsnCode: z.string().optional().nullable(),
  gstRate: z.union([z.number(), z.string()]).optional().nullable(),
  sellingPrice: z.union([z.number(), z.string()]).optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional()
}).strict()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const products = await prisma.product.findMany({
      where: { companyId },
      include: { unit: true },
      orderBy: { name: 'asc' },
    })

    const companySalesItems = salesItemsStore.filter(item => item.companyId === companyId)

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
    }).filter(item => item.product !== null)

    return NextResponse.json(salesItemMasters)
  } catch (error) {
    console.error('Error fetching sales item masters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithSchema(request, postSchema)
    if (!parsed.ok) return parsed.response

    const denied = await ensureCompanyAccess(request, parsed.data.companyId)
    if (denied) return denied

    const now = new Date()
    const newSalesItem = {
      id: `temp_${nextId++}`,
      companyId: parsed.data.companyId,
      productId: parsed.data.productId,
      salesItemName: parsed.data.salesItemName.trim(),
      hsnCode: parsed.data.hsnCode || null,
      gstRate: parsed.data.gstRate ? parseFloat(String(parsed.data.gstRate)) : null,
      sellingPrice: parsed.data.sellingPrice ? parseFloat(String(parsed.data.sellingPrice)) : null,
      description: parsed.data.description || null,
      isActive: parsed.data.isActive !== false,
      createdAt: now,
      updatedAt: now,
    }

    salesItemsStore.push(newSalesItem)

    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, companyId: parsed.data.companyId },
      include: { unit: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

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
    const parsed = await parseJsonWithSchema(request, putSchema)
    if (!parsed.ok) return parsed.response

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Sales Item Master ID and Company ID are required' }, { status: 400 })
    }

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

    const itemIndex = salesItemsStore.findIndex(item => item.id === id && item.companyId === companyId)

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Sales Item Master not found' }, { status: 404 })
    }

    const updatedItem = {
      ...salesItemsStore[itemIndex],
      productId: parsed.data.productId !== undefined ? parsed.data.productId : salesItemsStore[itemIndex].productId,
      salesItemName: parsed.data.salesItemName !== undefined ? parsed.data.salesItemName.trim() : salesItemsStore[itemIndex].salesItemName,
      hsnCode: parsed.data.hsnCode !== undefined ? parsed.data.hsnCode : salesItemsStore[itemIndex].hsnCode,
      gstRate: parsed.data.gstRate !== undefined ? (parsed.data.gstRate ? parseFloat(String(parsed.data.gstRate)) : null) : salesItemsStore[itemIndex].gstRate,
      sellingPrice: parsed.data.sellingPrice !== undefined ? (parsed.data.sellingPrice ? parseFloat(String(parsed.data.sellingPrice)) : null) : salesItemsStore[itemIndex].sellingPrice,
      description: parsed.data.description !== undefined ? parsed.data.description : salesItemsStore[itemIndex].description,
      isActive: parsed.data.isActive !== undefined ? parsed.data.isActive : salesItemsStore[itemIndex].isActive,
      updatedAt: new Date(),
    }

    salesItemsStore[itemIndex] = updatedItem

    const product = await prisma.product.findFirst({
      where: { id: updatedItem.productId, companyId },
      include: { unit: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

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

    const denied = await ensureCompanyAccess(request, companyId)
    if (denied) return denied

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
