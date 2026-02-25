import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Return empty array for now - markas would be stored in database
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching markas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { markaNumber, description, isActive } = body

    if (!markaNumber) {
      return NextResponse.json({ error: 'Marka number is required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id: Date.now().toString(),
      markaNumber: markaNumber.toUpperCase(), 
      description,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error creating marka:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { markaNumber, description, isActive } = body

    if (!markaNumber) {
      return NextResponse.json({ error: 'Marka number is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Marka ID required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id, 
      markaNumber: markaNumber.toUpperCase(), 
      description,
      isActive: isActive !== false,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating marka:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Marka ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Marka deleted successfully' })
  } catch (error) {
    console.error('Error deleting marka:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
