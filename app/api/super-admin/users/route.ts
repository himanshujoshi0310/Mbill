import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Validation schemas
const createUserSchema = z.object({
  traderId: z.string().min(1, "Trader ID is required"),
  userId: z.string().min(1, "User ID is required").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  role: z.enum(["admin", "user"]),
})

const updateUserSchema = z.object({
  traderId: z.string().min(1, "Trader ID is required"),
  userId: z.string().min(1, "User ID is required").max(50),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  name: z.string().optional(),
  role: z.enum(["admin", "user"]),
})

// Helper function to verify super admin authentication
async function verifySuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized - Super Admin access required')
  }
}

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin()

    const { searchParams } = new URL(request.url)
    const traderId = searchParams.get('traderId')
    const companyId = searchParams.get('companyId')

    const where: any = {}
    if (traderId) where.traderId = traderId
    if (companyId) where.companyId = companyId

    const users = await prisma.user.findMany({
      where,
      include: {
        trader: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Remove password from response
    const usersWithoutPassword = users.map(({ password, ...user }) => user)

    return NextResponse.json(usersWithoutPassword)
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin()

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        traderId_userId: {
          traderId: validatedData.traderId,
          userId: validatedData.userId
        }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this ID already exists for this trader' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword
      },
      include: {
        trader: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    console.log('✅ User created:', { 
      traderId: user.traderId, 
      userId: user.userId, 
      role: user.role 
    })

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
