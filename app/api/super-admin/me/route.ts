import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    // Use the same session system as regular users
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify this is a super admin token
    if (session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    return NextResponse.json({
      userId: session.userId,
      name: session.name,
      role: session.role,
      traderId: session.traderId
    })

  } catch (error) {
    console.error('Super admin auth check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
