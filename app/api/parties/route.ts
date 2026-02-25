import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all parties for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const parties = await prisma.party.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(parties)
  } catch (error) {
    console.error('Error fetching parties:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - create new party
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, address, phone1, phone2, ifscCode, bankName, accountNo } = body

    if (!type || !name) {
      return NextResponse.json({ error: 'Party type and name are required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const party = await prisma.party.create({
      data: {
        companyId,
        type,
        name,
        address,
        phone1,
        phone2,
        ifscCode,
        bankName,
        accountNo
      }
    })

    return NextResponse.json(party)
  } catch (error) {
    console.error('Error creating party:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - update existing party
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Party ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { type, name, address, phone1, phone2, ifscCode, bankName, accountNo } = body

    const updatedParty = await prisma.party.update({
      where: { id },
      data: {
        type,
        name,
        address,
        phone1,
        phone2,
        ifscCode,
        bankName,
        accountNo
      }
    })

    return NextResponse.json(updatedParty)
  } catch (error) {
    console.error('Error updating party:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - delete party
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Party ID is required' }, { status: 400 })
    }

    await prisma.party.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Party deleted successfully' })
  } catch (error) {
    console.error('Error deleting party:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}