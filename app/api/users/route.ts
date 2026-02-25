import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      include: {
        trader: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { traderId, userId, password, name, role } = body

    if (!traderId || !userId || !password) {
      return NextResponse.json({ 
        error: 'Trader ID, User ID, and Password are required' 
      }, { status: 400 })
    }

    // Check if user with same userId already exists for the trader
    const existingUser = await prisma.user.findFirst({
      where: { 
        traderId,
        userId
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User ID already exists for this trader' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        traderId,
        userId,
        password,
        name: name || null,
        role: role || 'user'
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { traderId, userId, password, name, role } = body
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!traderId || !userId || !password) {
      return NextResponse.json({ 
        error: 'Trader ID, User ID, and Password are required' 
      }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if user with same userId already exists (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: { 
        traderId,
        userId,
        id: { not: id }
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User ID already exists for this trader' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        traderId,
        userId,
        password,
        name: name || null,
        role: role || 'user'
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
