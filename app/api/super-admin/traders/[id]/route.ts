import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema
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

// GET - Single trader
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    const trader = await prisma.trader.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            companies: true,
            users: true
          }
        },
        companies: {
          select: {
            id: true,
            name: true,
            createdAt: true
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        users: {
          select: {
            id: true,
            userId: true,
            name: true,
            role: true,
            createdAt: true
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!trader) {
      return NextResponse.json({ error: 'Trader not found' }, { status: 404 })
    }

    return NextResponse.json(trader)
  } catch (error) {
    console.error('❌ Error fetching trader:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trader' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Update trader
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    const body = await request.json()
    const validatedData = updateTraderSchema.parse(body)

    // Check if trader exists
    const existingTrader = await prisma.trader.findUnique({
      where: { id }
    })

    if (!existingTrader) {
      return NextResponse.json({ error: 'Trader not found' }, { status: 404 })
    }

    // Check if another trader has the same name
    const duplicateTrader = await prisma.trader.findFirst({
      where: { 
        name: validatedData.name,
        id: { not: id }
      }
    })

    if (duplicateTrader) {
      return NextResponse.json(
        { error: 'Trader with this name already exists' },
        { status: 409 }
      )
    }

    const trader = await prisma.trader.update({
      where: { id },
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

    console.log('✅ Trader updated:', { id: trader.id, name: trader.name })

    return NextResponse.json(trader)
  } catch (error) {
    console.error('❌ Error updating trader:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update trader' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Delete trader
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    // Check if trader exists
    const existingTrader = await prisma.trader.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            companies: true,
            users: true
          }
        }
      }
    })

    if (!existingTrader) {
      return NextResponse.json({ error: 'Trader not found' }, { status: 404 })
    }

    // Prevent deletion of system trader
    if (id === 'system') {
      return NextResponse.json(
        { error: 'Cannot delete system trader' },
        { status: 403 }
      )
    }

    // Log what will be deleted/disassociated
    console.log(`🗑️ Deleting trader "${existingTrader.name}" with:`, {
      users: existingTrader._count.users,
      companies: existingTrader._count.companies
    })

    await prisma.trader.delete({
      where: { id }
    })

    console.log('✅ Trader deleted:', { id, name: existingTrader.name })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting trader:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete trader' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
