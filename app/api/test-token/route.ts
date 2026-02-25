import { NextRequest, NextResponse } from 'next/server'
import { generateToken, verifyToken } from '@/lib/auth'

export async function GET() {
  try {
    // Test token generation and verification
    const testPayload = {
      userId: 'test',
      traderId: 'test',
      name: 'Test User',
      role: 'admin'
    }
    
    const token = generateToken(testPayload)
    console.log('Generated token:', token)
    
    const verified = verifyToken(token)
    console.log('Verification result:', verified)
    
    return NextResponse.json({
      success: true,
      token,
      verified,
      jwtSecret: process.env.JWT_SECRET ? 'EXISTS' : 'MISSING',
      jwtSecretLength: process.env.JWT_SECRET?.length || 0
    })
  } catch (error) {
    console.error('Token test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      jwtSecret: process.env.JWT_SECRET ? 'EXISTS' : 'MISSING'
    })
  }
}
