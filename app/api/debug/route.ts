import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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

    const companies = await prisma.company.findMany({
      include: {
        trader: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            parties: true,
            products: true,
            salesBills: true
          }
        }
      }
    })

    const users = await prisma.user.findMany({
      include: {
        trader: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      traders: {
        count: traders.length,
        data: traders
      },
      companies: {
        count: companies.length,
        data: companies
      },
      users: {
        count: users.length,
        data: users
      }
    })
  } catch (error) {
    console.error('Error debugging database:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
