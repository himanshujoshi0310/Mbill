import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const farmers = await prisma.farmer.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        address: true,
        phone1: true,
        krashakAnubandhNumber: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(farmers)
  } catch (error) {
    console.error('Error fetching farmers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, name, address, phone1, krashakAnubandhNumber } = body

    if (!companyId || !name) {
      return NextResponse.json({ error: 'Company ID and name are required' }, { status: 400 })
    }

    // Check if farmer already exists
    const existingFarmer = await prisma.farmer.findFirst({
      where: {
        companyId,
        name,
      },
    })

    if (existingFarmer) {
      return NextResponse.json({ error: 'Farmer with this name already exists' }, { status: 400 })
    }

    const farmer = await prisma.farmer.create({
      data: {
        companyId,
        name,
        address: address || null,
        phone1: phone1 || null,
        krashakAnubandhNumber: krashakAnubandhNumber || null,
      },
    })

    return NextResponse.json(farmer)
  } catch (error) {
    console.error('Error creating farmer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')
    const body = await request.json()
    const { name, address, phone1, krashakAnubandhNumber } = body

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Farmer ID and Company ID are required' }, { status: 400 })
    }

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 })
    }

    // Check if name conflicts with another farmer
    if (name && name !== existingFarmer.name) {
      const nameConflict = await prisma.farmer.findFirst({
        where: {
          companyId,
          name,
          id: { not: id },
        },
      })

      if (nameConflict) {
        return NextResponse.json({ error: 'Farmer with this name already exists' }, { status: 400 })
      }
    }

    const farmer = await prisma.farmer.update({
      where: { id },
      data: {
        name: name || existingFarmer.name,
        address: address !== undefined ? address : existingFarmer.address,
        phone1: phone1 !== undefined ? phone1 : existingFarmer.phone1,
        krashakAnubandhNumber: krashakAnubandhNumber !== undefined ? krashakAnubandhNumber : existingFarmer.krashakAnubandhNumber,
      },
    })

    return NextResponse.json(farmer)
  } catch (error) {
    console.error('Error updating farmer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Farmer ID and Company ID are required' }, { status: 400 })
    }

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 })
    }

    // Check if farmer has purchase bills
    const purchaseBillsCount = await prisma.purchaseBill.count({
      where: {
        farmerId: id,
      },
    })

    if (purchaseBillsCount > 0) {
      return NextResponse.json({ error: 'Cannot delete farmer with existing purchase bills' }, { status: 400 })
    }

    await prisma.farmer.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Farmer deleted successfully' })
  } catch (error) {
    console.error('Error deleting farmer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
