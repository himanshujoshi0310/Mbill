import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    // Use the same session system as regular users
    await clearSession()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Super admin logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
