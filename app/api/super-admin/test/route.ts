import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const envPassword = process.env.SUPER_ADMIN_PASSWORD
    const defaultPassword = 'super-admin-2026-secure'
    
    return NextResponse.json({
      message: 'Super admin test endpoint',
      environment: {
        SUPER_ADMIN_PASSWORD_SET: !!envPassword,
        SUPER_ADMIN_PASSWORD_VALUE: envPassword || 'NOT_SET',
        DEFAULT_PASSWORD: defaultPassword,
        CURRENT_PASSWORD: envPassword || defaultPassword
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
