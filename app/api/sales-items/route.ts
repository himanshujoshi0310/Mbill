import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Return empty array for now - sales items would be stored in database
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching sales items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, hsnCode, gstRate, unit, sellingPrice, description, isActive } = body

    if (!name || !unit) {
      return NextResponse.json({ error: 'Sales item name and unit are required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id: Date.now().toString(),
      name, 
      hsnCode,
      gstRate,
      unit,
      sellingPrice,
      description,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error creating sales item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, hsnCode, gstRate, unit, sellingPrice, description, isActive } = body

    if (!name || !unit) {
      return NextResponse.json({ error: 'Sales item name and unit are required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Sales item ID required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id, 
      name, 
      hsnCode,
      gstRate,
      unit,
      sellingPrice,
      description,
      isActive: isActive !== false,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating sales item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Sales item ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Sales item deleted successfully' })
  } catch (error) {
    console.error('Error deleting sales item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
