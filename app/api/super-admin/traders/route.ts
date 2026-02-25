import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const createTraderSchema = z.object({
  name: z.string().min(1, "Trader name is required").max(100),
})

const updateTraderSchema = z.object({
  name: z.string().min(1, "Trader name is required").max(100),
})

// Helper function to verify super admin authentication
async function verifySuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized - Super Admin access required')
  }
}

// GET - List all traders
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin()

    const traders = await prisma.trader.findMany({
      include: {
        _count: {
          select: {
            companies: true,
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(traders)
  } catch (error) {
    console.error('❌ Error fetching traders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch traders' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Create new trader
export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin()

    const body = await request.json()
    const validatedData = createTraderSchema.parse(body)

    // Check if trader with same name already exists
    const existingTrader = await prisma.trader.findFirst({
      where: { name: validatedData.name }
    })

    if (existingTrader) {
      return NextResponse.json(
        { error: 'Trader with this name already exists' },
        { status: 409 }
      )
    }

    const trader = await prisma.trader.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            companies: true,
            users: true
          }
        }
      }
    })

    console.log('✅ Trader created:', { id: trader.id, name: trader.name })

    return NextResponse.json(trader, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating trader:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create trader' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
