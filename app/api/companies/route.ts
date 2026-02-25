import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, createCompanySchema, updateCompanySchema } from '@/lib/validation'

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

export async function GET(request: NextRequest) {
  try {
    // Get user info from request headers (set by middleware)
    const traderId = request.headers.get('x-trader-id')
    const userRole = request.headers.get('x-user-role')

    if (!traderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: setCORSHeaders()
      })
    }

    let companies

    if (userRole === 'admin') {
      // Admin can see all companies for their trader
      companies = await prisma.company.findMany({
        where: { traderId: traderId },
        include: {
          trader: {
            select: {
              name: true
            }
          }
        },
        orderBy: { name: 'asc' },
      })
    } else {
      // Regular users only see their assigned company
      const userCompanyId = request.headers.get('x-company-id')
      if (!userCompanyId) {
        return NextResponse.json({ error: 'Company assignment required' }, { 
          status: 403,
          headers: setCORSHeaders()
        })
      }
      
      companies = await prisma.company.findMany({
        where: { 
          id: userCompanyId,
          traderId: traderId 
        },
        include: {
          trader: {
            select: {
              name: true
            }
          }
        },
        orderBy: { name: 'asc' },
      })
    }

    return NextResponse.json(companies, { headers: setCORSHeaders() })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validateRequest(createCompanySchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    const { name, address, phone, traderId } = validation.data!

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // Super admin can create company for any trader
    let targetTraderId = traderId

    if (!targetTraderId) {
      // Super admin creating company without specifying trader - allow this
      // Or get trader ID from existing company for regular flow
      if (companyId) {
        const existingCompany = await prisma.company.findFirst({
          where: { id: companyId },
          select: { traderId: true }
        })

        if (existingCompany && existingCompany.traderId) {
          targetTraderId = existingCompany.traderId
        } else {
          // Super admin can create company without trader initially
          targetTraderId = undefined
        }
      } else {
        // Super admin can create company without trader initially
        targetTraderId = undefined
      }
    }

    const company = await prisma.company.create({
      data: {
        traderId: targetTraderId,
        name,
        address,
        phone,
      },
    })

    return NextResponse.json(company, { headers: setCORSHeaders() })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validateRequest(updateCompanySchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    const { name, address, phone } = validation.data!

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Company ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        address,
        phone,
      },
    })

    return NextResponse.json(company, { headers: setCORSHeaders() })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Company ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    await prisma.company.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Company deleted successfully' }, { 
      headers: setCORSHeaders()
    })
  } catch (error) {
    console.error('Error deleting company:', error)
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
