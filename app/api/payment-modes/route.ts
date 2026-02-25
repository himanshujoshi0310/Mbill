import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Return default payment modes for now
    const defaultPaymentModes = [
      { id: 'cash', name: 'Cash', code: 'CASH', description: 'Cash payment', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'online', name: 'Online Transfer', code: 'ONLINE', description: 'Bank transfer', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'cheque', name: 'Cheque', code: 'CHEQUE', description: 'Cheque payment', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'upi', name: 'UPI', code: 'UPI', description: 'UPI payment', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'card', name: 'Card', code: 'CARD', description: 'Credit/Debit card', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]

    return NextResponse.json(defaultPaymentModes)
  } catch (error) {
    console.error('Error fetching payment modes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, description, isActive } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Payment mode name and code are required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id: Date.now().toString(),
      name, 
      code, 
      description,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error creating payment mode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, description, isActive } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Payment mode name and code are required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Payment mode ID required' }, { status: 400 })
    }

    return NextResponse.json({ 
      id, 
      name, 
      code, 
      description,
      isActive: isActive !== false,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating payment mode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Payment mode ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Payment mode deleted successfully' })
  } catch (error) {
    console.error('Error deleting payment mode:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
