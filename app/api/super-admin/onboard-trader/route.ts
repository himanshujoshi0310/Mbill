import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Validation schemas
const traderSchema = z.object({
  name: z.string().min(1, "Trader name is required").max(100),
})

const userSchema = z.object({
  userId: z.string().min(1, "User ID is required").max(50),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["admin", "user"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const companySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  address: z.string().optional(),
  phone: z.string().optional(),
})

const onboardingSchema = z.object({
  trader: traderSchema,
  users: z.array(userSchema).min(1, "At least one user is required"),
  companies: z.array(companySchema).min(1, "At least one company is required"),
})

// Helper function to verify super admin authentication
async function verifySuperAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized - Super Admin access required')
  }
}

// Helper function for transaction rollback
async function rollbackTransaction(operations: any[]) {
  console.log('🔄 Rolling back failed operations...')
  for (const operation of operations.reverse()) {
    try {
      if (operation.type === 'trader') {
        await prisma.trader.delete({ where: { id: operation.id } })
      } else if (operation.type === 'user') {
        await prisma.user.delete({ where: { id: operation.id } })
      } else if (operation.type === 'company') {
        await prisma.company.delete({ where: { id: operation.id } })
      }
    } catch (error) {
      console.error(`❌ Failed to rollback ${operation.type} ${operation.id}:`, error)
    }
  }
}

export async function POST(request: NextRequest) {
  const completedOperations: any[] = []
  
  try {
    await verifySuperAdmin()

    const body = await request.json()
    const validatedData = onboardingSchema.parse(body)

    console.log('🚀 Starting trader onboarding process...')

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      let traderId: string

      // Step 1: Create trader
      console.log('📝 Creating trader:', validatedData.trader.name)
      const trader = await tx.trader.create({
        data: validatedData.trader
      })
      traderId = trader.id
      completedOperations.push({ type: 'trader', id: trader.id })
      console.log('✅ Trader created:', trader.id)

      // Step 2: Create users
      const createdUsers = []
      for (const userData of validatedData.users) {
        console.log('👤 Creating user:', userData.userId)
        
        // Check if user already exists for this trader
        const existingUser = await tx.user.findUnique({
          where: {
            traderId_userId: {
              traderId: trader.id,
              userId: userData.userId
            }
          }
        })

        if (existingUser) {
          throw new Error(`User with ID "${userData.userId}" already exists for this trader`)
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12)

        const user = await tx.user.create({
          data: {
            ...userData,
            traderId: trader.id,
            password: hashedPassword
          }
        })
        createdUsers.push(user)
        completedOperations.push({ type: 'user', id: user.id })
        console.log('✅ User created:', user.userId)
      }

      // Step 3: Create companies
      const createdCompanies = []
      for (const companyData of validatedData.companies) {
        console.log('🏢 Creating company:', companyData.name)
        
        // Check if company already exists for this trader
        const existingCompany = await tx.company.findFirst({
          where: {
            name: companyData.name,
            traderId: trader.id
          }
        })

        if (existingCompany) {
          throw new Error(`Company "${companyData.name}" already exists for this trader`)
        }

        const company = await tx.company.create({
          data: {
            ...companyData,
            traderId: trader.id
          }
        })
        createdCompanies.push(company)
        completedOperations.push({ type: 'company', id: company.id })
        console.log('✅ Company created:', company.name)
      }

      return {
        trader,
        users: createdUsers.map(({ password, ...user }) => user),
        companies: createdCompanies
      }
    })

    console.log('🎉 Trader onboarding completed successfully!')
    console.log('📊 Summary:', {
      traderId: result.trader.id,
      usersCreated: result.users.length,
      companiesCreated: result.companies.length
    })

    return NextResponse.json({
      success: true,
      message: 'Trader setup created successfully',
      data: result
    })

  } catch (error) {
    console.error('❌ Trader onboarding failed:', error)
    
    // Attempt rollback if operations were completed
    if (completedOperations.length > 0) {
      try {
        await rollbackTransaction(completedOperations)
        console.log('🔄 Rollback completed')
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError)
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create trader setup',
        details: completedOperations.length > 0 ? 'Partial creation was rolled back' : undefined
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
