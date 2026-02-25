import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to set CORS headers
function setCORSHeaders() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
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

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    // Verify company belongs to the user's trader
    const company = await prisma.company.findFirst({
      where: { 
        id: companyId,
        traderId: traderId 
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { 
        status: 403,
        headers: setCORSHeaders()
      })
    }

    const units = await prisma.unit.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(units, { headers: setCORSHeaders() })
  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, symbol, description } = body
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!name || !symbol) {
      return NextResponse.json({ error: 'Unit name and symbol are required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    // Verify company belongs to the user's trader
    const company = await prisma.company.findFirst({
      where: { 
        id: companyId,
        traderId: traderId 
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { 
        status: 403,
        headers: setCORSHeaders()
      })
    }

    // Check if unit with same symbol already exists for this company
    const existingUnit = await prisma.unit.findFirst({
      where: { 
        companyId,
        symbol
      }
    })

    if (existingUnit) {
      return NextResponse.json({ error: 'Unit with this symbol already exists' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        symbol,
        description,
        companyId
      }
    })

    return NextResponse.json(unit, { headers: setCORSHeaders() })
  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { name, symbol, description } = body
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const companyId = searchParams.get('companyId')

    if (!name || !symbol) {
      return NextResponse.json({ error: 'Unit name and symbol are required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    if (!id) {
      return NextResponse.json({ error: 'Unit ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    // Verify company belongs to the user's trader
    const company = await prisma.company.findFirst({
      where: { 
        id: companyId,
        traderId: traderId 
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { 
        status: 403,
        headers: setCORSHeaders()
      })
    }

    // Check if unit with same symbol already exists (excluding current unit)
    const existingUnit = await prisma.unit.findFirst({
      where: { 
        companyId,
        symbol,
        id: { not: id }
      }
    })

    if (existingUnit) {
      return NextResponse.json({ error: 'Unit with this symbol already exists' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name,
        symbol,
        description
      }
    })

    return NextResponse.json(unit, { headers: setCORSHeaders() })
  } catch (error) {
    console.error('Error updating unit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: setCORSHeaders()
    })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Unit ID required' }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    // Verify unit belongs to a company owned by the user's trader
    const unit = await prisma.unit.findFirst({
      where: { id },
      include: {
        company: {
          select: {
            traderId: true
          }
        }
      }
    })

    if (!unit || unit.company.traderId !== traderId) {
      return NextResponse.json({ error: 'Unit not found or access denied' }, { 
        status: 403,
        headers: setCORSHeaders()
      })
    }

    // Check if unit is being used by any products
    const productCount = await prisma.product.count({
      where: { unitId: id }
    })

    if (productCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete unit. It is being used by ${productCount} product(s).` 
      }, { 
        status: 400,
        headers: setCORSHeaders()
      })
    }

    await prisma.unit.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Unit deleted successfully' }, { 
      headers: setCORSHeaders()
    })
  } catch (error) {
    console.error('Error deleting unit:', error)
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
