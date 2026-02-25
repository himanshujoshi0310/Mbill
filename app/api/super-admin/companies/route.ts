import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  traderId: z.string().min(1, "Trader ID is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
})

const updateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  traderId: z.string().min(1, "Trader ID is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
})

// Helper function to verify super admin authentication
async function verifySuperAdmin() {
  // TEMPORARILY DISABLED FOR TESTING
  console.log('Super admin authentication bypassed for testing')
  return true
}

// GET - List all companies
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin()

    const { searchParams } = new URL(request.url)
    const traderId = searchParams.get('traderId')

    const where = traderId ? { traderId } : {}

    const companies = await prisma.company.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('❌ Error fetching companies:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch companies' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Create new company
export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin()

    const body = await request.json()
    const validatedData = createCompanySchema.parse(body)

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

    // Check if company with same name already exists for this trader
    const existingCompany = await prisma.company.findFirst({
      where: { 
        name: validatedData.name,
        traderId: validatedData.traderId
      }
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company with this name already exists for this trader' },
        { status: 409 }
      )
    }

    const company = await prisma.company.create({
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

    console.log('✅ Company created:', { 
      id: company.id, 
      name: company.name, 
      traderId: company.traderId 
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating company:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create company' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
