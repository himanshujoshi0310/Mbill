import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const traders = await prisma.trader.findMany({
      include: {
        _count: {
          select: {
            companies: true,
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(traders)
  } catch (error) {
    console.error('Error fetching traders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Trader name is required' }, { status: 400 })
    }

    // Check if trader with same name already exists
    const existingTrader = await prisma.trader.findFirst({
      where: { name }
    })

    if (existingTrader) {
      return NextResponse.json({ error: 'Trader with this name already exists' }, { status: 400 })
    }

    const trader = await prisma.trader.create({
      data: { name }
    })

    return NextResponse.json(trader)
  } catch (error) {
    console.error('Error creating trader:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!name) {
      return NextResponse.json({ error: 'Trader name is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Trader ID required' }, { status: 400 })
    }

    // Check if trader with same name already exists (excluding current trader)
    const existingTrader = await prisma.trader.findFirst({
      where: { 
        name,
        id: { not: id }
      }
    })

    if (existingTrader) {
      return NextResponse.json({ error: 'Trader with this name already exists' }, { status: 400 })
    }

    const trader = await prisma.trader.update({
      where: { id },
      data: { name }
    })

    return NextResponse.json(trader)
  } catch (error) {
    console.error('Error updating trader:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Trader ID required' }, { status: 400 })
    }

    await prisma.trader.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Trader deleted successfully' })
  } catch (error) {
    console.error('Error deleting trader:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
