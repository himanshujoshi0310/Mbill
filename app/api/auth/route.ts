import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { setSession } from '@/lib/session'
import { checkBruteForce, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/brute-force-protection'
import { verifyCaptcha, shouldRequireCaptcha } from '@/lib/captcha'
import { auditLogger } from '@/lib/audit-logging'

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

async function checkRateLimit(identifier: string, windowMs: number, maxRequests: number) {
  const now = Date.now()
  
  let entry = rateLimitStore.get(identifier)
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs }
    rateLimitStore.set(identifier, entry)
  }

  if (entry.count >= maxRequests) {
    const resetIn = Math.ceil((entry.resetTime - now) / 1000)
    return {
      blocked: true,
      resetIn
    }
  }

  entry.count++
  return { blocked: false }
}

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Enhanced brute force protection
  const bruteForceCheck = checkBruteForce(request)
  if (bruteForceCheck.blocked) {
    await auditLogger.logSecurityEvent(
      'unknown',
      'unknown',
      'BRUTE_FORCE_DETECTED',
      ipAddress,
      userAgent,
      { attemptCount: bruteForceCheck.attemptCount }
    )
    
    return NextResponse.json(
      { 
        error: bruteForceCheck.reason,
        attemptCount: bruteForceCheck.attemptCount
      },
      { 
        status: 429,
        headers: {
          'Retry-After': bruteForceCheck.retryAfter?.toString() || '3600'
        }
      }
    )
  }

  // Rate limiting
  const identifier = ipAddress
  
  const rateLimitResult = await checkRateLimit(identifier, 15 * 60 * 1000, 5) // 5 requests per 15 minutes
  
  if (rateLimitResult.blocked) {
    await auditLogger.logSecurityEvent(
      'unknown',
      'unknown',
      'RATE_LIMIT_EXCEEDED',
      ipAddress,
      userAgent
    )
    
    return NextResponse.json(
      { 
        error: 'Too many requests',
        retryAfter: rateLimitResult.resetIn
      },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.resetIn?.toString() || '60'
        }
      }
    )
  }

  // Set CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin'
    }

    const body = await request.json()
    const { traderId, userId, password, captchaToken } = body

    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt:', { traderId, userId })
    }

    // Validation
    if (!userId || !password) {
      return NextResponse.json({ 
        error: 'User ID and password are required' 
      }, { 
        status: 400,
        headers 
      })
    }

    // Check if CAPTCHA is required
    if (shouldRequireCaptcha(bruteForceCheck.attemptCount)) {
      if (!captchaToken) {
        await auditLogger.logSecurityEvent(
          userId,
          traderId || 'unknown',
          'CAPTCHA_REQUIRED',
          ipAddress,
          userAgent,
          { attemptCount: bruteForceCheck.attemptCount }
        )
        
        return NextResponse.json({
          error: 'CAPTCHA required for security verification',
          requiresCaptcha: true
        }, {
          status: 403,
          headers
        })
      }

      // Verify CAPTCHA
      const captchaResult = await verifyCaptcha(captchaToken, ipAddress)
      if (!captchaResult.success) {
        await auditLogger.logSecurityEvent(
          userId,
          traderId || 'unknown',
          'SUSPICIOUS_ACTIVITY',
          ipAddress,
          userAgent,
          { captchaError: captchaResult.error }
        )
        
        return NextResponse.json({
          error: 'CAPTCHA verification failed',
          requiresCaptcha: true
        }, {
          status: 403,
          headers
        })
      }
    }

    // Authenticate user using database
    const authResult = await authenticateUser({ userId, password, traderId })

    if (!authResult.success) {
      // Record failed attempt for brute force protection
      recordFailedAttempt(request)
      
      await auditLogger.logAuthentication(
        userId,
        traderId || 'unknown',
        'LOGIN_FAILURE',
        ipAddress,
        userAgent,
        authResult.error
      )
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Invalid credentials for:', userId)
      }
      return NextResponse.json({ 
        error: authResult.error || 'Invalid credentials' 
      }, { 
        status: 401,
        headers 
      })
    }

    // Record successful attempt (resets brute force counter)
    recordSuccessfulAttempt(request)

    await auditLogger.logAuthentication(
      authResult.user!.userId,
      authResult.user!.traderId,
      'LOGIN_SUCCESS',
      ipAddress,
      userAgent
    )

    if (process.env.NODE_ENV === 'development') {
      console.log('Login successful for:', userId)
    }

    // Set HttpOnly cookies with both tokens
    await setSession(authResult.token!, authResult.refreshToken)

    // Return success response (token not in body for security)
    return NextResponse.json({
      success: true,
      user: authResult.user,
      trader: authResult.trader,
      company: authResult.company
    }, {
      headers
    })

  } catch (error) {
    await auditLogger.logAuthentication(
      'unknown',
      'unknown',
      'LOGIN_FAILURE',
      ipAddress,
      userAgent,
      error instanceof Error ? error.message : 'Unknown error'
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Login API error:', error)
    }
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigins[0],
        'Vary': 'Origin'
      }
    })
  }
}

export async function OPTIONS() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
