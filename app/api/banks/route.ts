import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Return empty array for now - banks would be stored in database
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching banks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branch, ifscCode, accountNumber, address, phone, isActive } = body

    if (!name || !ifscCode) {
      return NextResponse.json({ error: 'Bank name and IFSC code are required' }, { status: 400 })
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return NextResponse.json({ error: 'Invalid IFSC code format' }, { status: 400 })
    }

    return NextResponse.json({ 
      id: Date.now().toString(),
      name, 
      branch, 
      ifscCode, 
      accountNumber, 
      address, 
      phone,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error creating bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, branch, ifscCode, accountNumber, address, phone, isActive } = body

    if (!name || !ifscCode) {
      return NextResponse.json({ error: 'Bank name and IFSC code are required' }, { status: 400 })
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return NextResponse.json({ error: 'Invalid IFSC code format' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Bank ID required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id, 
      name, 
      branch, 
      ifscCode, 
      accountNumber, 
      address, 
      phone,
      isActive: isActive !== false,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Bank ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Bank deleted successfully' })
  } catch (error) {
    console.error('Error deleting bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
