import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { validateRequest, createCompanySchema, createUserSchema } from '@/lib/validation'

// Helper function to set CORS headers
function setCORSHeaders() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

// Super admin authentication (in production, use proper super admin auth)
const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_SECRET || 'billing-app-super-admin-2026'

function authenticateSuperAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  
  const token = authHeader.substring(7)
  return token === SUPER_ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  try {
    if (!authenticateSuperAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: setCORSHeaders()
      })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'traders', 'companies', 'users', 'stats'

    switch (type) {
      case 'traders':
        const traders = await prisma.trader.findMany({
          include: {
            _count: {
              select: {
                companies: true,
                users: true
              }
            }
          }
        })
        return NextResponse.json(traders, { headers: setCORSHeaders() })

      case 'companies':
        const companies = await prisma.company.findMany({
          include: {
            trader: {
              select: { name: true }
            }
          }
        })
        return NextResponse.json(companies, { headers: setCORSHeaders() })

      case 'users':
        const users = await prisma.user.findMany({
          include: {
            trader: {
              select: { name: true }
            }
          }
        })
        // Don't send passwords in response
        const safeUsers = users.map(({ password, ...user }) => user)
        return NextResponse.json(safeUsers, { headers: setCORSHeaders() })

      case 'stats':
        const [traderCount, companyCount, userCount] = await Promise.all([
          prisma.trader.count(),
          prisma.company.count(),
          prisma.user.count()
        ])
        
        return NextResponse.json({
          traders: traderCount,
          companies: companyCount,
          users: userCount
        }, { headers: setCORSHeaders() })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { 
          status: 400,
          headers: setCORSHeaders()
        })
    }
  } catch (error) {
    console.error('Super admin GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!authenticateSuperAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: setCORSHeaders()
      })
    }

    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'trader':
        const trader = await prisma.trader.create({
          data: {
            name: data.name,
          }
        })
        return NextResponse.json(trader, { headers: setCORSHeaders() })

      case 'company':
        const companyValidation = validateRequest(createCompanySchema, data)
        if (!companyValidation.success) {
          return NextResponse.json({ 
            error: 'Validation failed', 
            details: companyValidation.errors 
          }, { 
            status: 400,
            headers: setCORSHeaders()
          })
        }

        const company = await prisma.company.create({
          data: companyValidation.data!
        })
        return NextResponse.json(company, { headers: setCORSHeaders() })

      case 'user':
        const userValidation = validateRequest(createUserSchema, data)
        if (!userValidation.success) {
          return NextResponse.json({ 
            error: 'Validation failed', 
            details: userValidation.errors 
          }, { 
            status: 400,
            headers: setCORSHeaders()
          })
        }

        const { password, ...userData } = userValidation.data!
        const hashedPassword = await hashPassword(password)

        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword
          }
        })
        
        // Don't send password in response
        const { password: _, ...userResponse } = user
        return NextResponse.json(userResponse, { headers: setCORSHeaders() })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { 
          status: 400,
          headers: setCORSHeaders()
        })
    }
  } catch (error) {
    console.error('Super admin POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!authenticateSuperAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: setCORSHeaders()
      })
    }

    const body = await request.json()
    const { type, id, data, userId, traderId, newPassword } = body

    switch (type) {
      case 'reset-password':
        // Password reset functionality
        if (!userId || !traderId) {
          return NextResponse.json({ 
            error: 'User ID and Trader ID are required for password reset' 
          }, { 
            status: 400,
            headers: setCORSHeaders()
          })
        }

        // Generate new secure password if not provided
        const password = newPassword || generateSecurePassword()
        const hashedPassword = await hashPassword(password)

        // Update user password
        const updatedUser = await prisma.user.update({
          where: {
            traderId_userId: {
              traderId,
              userId
            }
          },
          data: {
            password: hashedPassword
          }
        })

        if (!updatedUser) {
          return NextResponse.json({ 
            error: 'User not found' 
          }, { 
            status: 404,
            headers: setCORSHeaders()
          })
        }

        console.log(`🔑 Password reset for user: ${userId} under trader: ${traderId}`)

        return NextResponse.json({
          success: true,
          message: 'Password reset successfully',
          credentials: {
            userId: updatedUser.userId,
            traderId: updatedUser.traderId,
            newPassword: password
          }
        }, {
          headers: setCORSHeaders()
        })

      case 'trader':
        const trader = await prisma.trader.update({
          where: { id },
          data: { name: data.name }
        })
        return NextResponse.json(trader, { headers: setCORSHeaders() })

      case 'company':
        const company = await prisma.company.update({
          where: { id },
          data: {
            name: data.name,
            address: data.address,
            phone: data.phone
          }
        })
        return NextResponse.json(company, { headers: setCORSHeaders() })

      case 'user':
        const updateData: any = {
          userId: data.userId,
          name: data.name,
          role: data.role,
          traderId: data.traderId
        }

        // Only update password if provided
        if (data.password) {
          updateData.password = await hashPassword(data.password)
        }

        const user = await prisma.user.update({
          where: { id },
          data: updateData
        })
        
        // Don't send password in response
        const { password: _, ...userResponse } = user
        return NextResponse.json(userResponse, { headers: setCORSHeaders() })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { 
          status: 400,
          headers: setCORSHeaders()
        })
    }
  } catch (error) {
    console.error('Super admin PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!authenticateSuperAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: setCORSHeaders()
      })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    switch (type) {
      case 'trader':
        // Delete trader and related data (cascading)
        await prisma.trader.delete({
          where: { id }
        })
        return NextResponse.json({ success: true, message: 'Trader deleted successfully' }, { 
          headers: setCORSHeaders()
        })

      case 'company':
        await prisma.company.delete({
          where: { id }
        })
        return NextResponse.json({ success: true, message: 'Company deleted successfully' }, { 
          headers: setCORSHeaders()
        })

      case 'user':
        await prisma.user.delete({
          where: { id }
        })
        return NextResponse.json({ success: true, message: 'User deleted successfully' }, { 
          headers: setCORSHeaders()
        })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { 
          status: 400,
          headers: setCORSHeaders()
        })
    }
  } catch (error) {
    console.error('Super admin DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: setCORSHeaders()
  })
}

// Helper function to generate secure passwords
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
