import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Validation schema
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

// GET - Single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        trader: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('❌ Error fetching user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

    // Check if another user has the same ID for this trader
    const duplicateUser = await prisma.user.findUnique({
      where: {
        traderId_userId: {
          traderId: validatedData.traderId,
          userId: validatedData.userId
        }
      }
    })

    if (duplicateUser && duplicateUser.id !== id) {
      return NextResponse.json(
        { error: 'User with this ID already exists for this trader' },
        { status: 409 }
      )
    }

    // Prepare update data
    const updateData: any = {
      traderId: validatedData.traderId,
      userId: validatedData.userId,
      name: validatedData.name,
      role: validatedData.role
    }

    // Only update password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    console.log('✅ User updated:', { 
      traderId: user.traderId, 
      userId: user.userId, 
      role: user.role 
    })

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('❌ Error updating user:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySuperAdmin()
    const { id } = await params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deletion of super admin users
    if (existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete super admin users' },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    console.log('✅ User deleted:', { 
      traderId: existingUser.traderId, 
      userId: existingUser.userId 
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
