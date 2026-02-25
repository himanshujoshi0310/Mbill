import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema
const updateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  traderId: z.string().min(1, "Trader ID is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
})

// Helper function to verify super admin authentication
async function verifySuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized - Super Admin access required')
  }
}

// GET - Single company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        trader: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            parties: true,
            farmers: true,
            suppliers: true,
            products: true,
            purchaseBills: true,
            salesBills: true
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('❌ Error fetching company:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch company' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    const body = await request.json()
    const validatedData = updateCompanySchema.parse(body)

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Verify trader exists
    const trader = await prisma.trader.findUnique({
      where: { id: validatedData.traderId }
    })

    if (!trader) {
      return NextResponse.json(
        { error: 'Trader not found' },
        { status: 404 }
      )
    }

    // Check if another company has the same name for this trader
    const duplicateCompany = await prisma.company.findFirst({
      where: { 
        name: validatedData.name,
        traderId: validatedData.traderId,
        id: { not: id }
      }
    })

    if (duplicateCompany) {
      return NextResponse.json(
        { error: 'Company with this name already exists for this trader' },
        { status: 409 }
      )
    }

    const company = await prisma.company.update({
      where: { id },
      data: validatedData,
      include: {
        trader: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            parties: true,
            farmers: true,
            suppliers: true,
            products: true,
            purchaseBills: true,
            salesBills: true
          }
        }
      }
    })

    console.log('✅ Company updated:', { 
      id: company.id, 
      name: company.name, 
      traderId: company.traderId 
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('❌ Error updating company:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update company' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Delete company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            parties: true,
            farmers: true,
            suppliers: true,
            products: true,
            purchaseBills: true,
            salesBills: true
          }
        }
      }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Prevent deletion if company has related data
    const hasRelatedData = 
      existingCompany._count.parties > 0 ||
      existingCompany._count.farmers > 0 ||
      existingCompany._count.suppliers > 0 ||
      existingCompany._count.products > 0 ||
      existingCompany._count.purchaseBills > 0 ||
      existingCompany._count.salesBills > 0

    if (hasRelatedData) {
      return NextResponse.json(
        { 
          error: 'Cannot delete company with existing related data',
          details: existingCompany._count
        },
        { status: 409 }
      )
    }

    await prisma.company.delete({
      where: { id }
    })

    console.log('✅ Company deleted:', { 
      id, 
      name: existingCompany.name 
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting company:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete company' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
