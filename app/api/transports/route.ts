import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const transports = await prisma.transport.findMany({
      where: { companyId },
      orderBy: { transporterName: 'asc' }
    })

    return NextResponse.json(transports)
  } catch (error) {
    console.error('Error fetching transports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      companyId,
      transporterName,
      vehicleNumber,
      driverName,
      driverPhone,
      capacity,
      freightRate
    } = body

    if (!companyId || !transporterName) {
      return NextResponse.json({ 
        error: 'Company ID and Transporter Name are required' 
      }, { status: 400 })
    }

    const transport = await prisma.transport.create({
      data: {
        companyId,
        transporterName,
        vehicleNumber: vehicleNumber || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        capacity: capacity || null,
        freightRate: freightRate || null
      }
    })

    return NextResponse.json(transport)
  } catch (error) {
    console.error('Error creating transport:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
