import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

const JWT_EXPIRES_IN = '30m' // Short-lived access token
const REFRESH_EXPIRES_IN = '7d' // Long-lived refresh token

export interface AuthUser {
  id: string
  userId: string
  traderId: string
  name?: string
  role?: string
}

export interface LoginCredentials {
  userId: string
  password: string
  traderId?: string
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  trader?: {
    id: string
    name: string
  }
  company?: {
    id: string
    name: string
  }
  token?: string
  refreshToken?: string
  error?: string
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 14)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: Omit<AuthUser, 'id'>): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function generateRefreshToken(payload: Omit<AuthUser, 'id'>): string {
  return jwt.sign(payload, REFRESH_SECRET!, { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyRefreshToken(token: string): Omit<AuthUser, 'id'> | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET!) as any
    return {
      userId: decoded.userId,
      traderId: decoded.traderId,
      name: decoded.name,
      role: decoded.role
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Refresh token verification failed:', error instanceof Error ? error.message : 'Unknown error')
    }
    return null
  }
}

export function verifyToken(token: string): Omit<AuthUser, 'id'> | null {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== TOKEN VERIFICATION DEBUG ===');
      console.log('Token provided:', !!token);
      console.log('Token length:', token?.length || 0);
      console.log('JWT_SECRET available:', !!JWT_SECRET);
      console.log('JWT_SECRET length:', JWT_SECRET?.length || 0);
    }
    
    const decoded = jwt.verify(token, JWT_SECRET!) as any
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Token decoded successfully');
      console.log('Decoded payload:', {
        userId: decoded.userId,
        traderId: decoded.traderId,
        name: decoded.name,
        role: decoded.role
      });
      console.log('============================');
    }
    
    return {
      userId: decoded.userId,
      traderId: decoded.traderId,
      name: decoded.name,
      role: decoded.role
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      console.log('============================');
    }
    return null
  }
}

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { userId, password, traderId } = credentials

    // Find user in database
    const user = await prisma.user.findFirst({
      where: {
        userId: userId.toLowerCase().trim(),
        ...(traderId && { traderId })
      },
      include: {
        trader: true
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Get company for this user (assuming first company of the trader)
    const company = await prisma.company.findFirst({
      where: {
        traderId: user.traderId
      }
    })

    // Generate JWT tokens
    const token = generateToken({
      userId: user.userId,
      traderId: user.traderId,
      name: user.name || undefined,
      role: user.role || undefined
    })
    
    const refreshToken = generateRefreshToken({
      userId: user.userId,
      traderId: user.traderId,
      name: user.name || undefined,
      role: user.role || undefined
    })

    return {
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        traderId: user.traderId,
        name: user.name || undefined,
        role: user.role || undefined
      },
      trader: {
        id: user.trader.id,
        name: user.trader.name
      },
      company: company ? {
        id: company.id,
        name: company.name
      } : undefined,
      token,
      refreshToken
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Authentication error:', error)
    }
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}

export async function createUser(userData: {
  userId: string
  password: string
  traderId: string
  name?: string
  role?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        userId: userData.userId.toLowerCase().trim(),
        traderId: userData.traderId
      }
    })

    if (existingUser) {
      return {
        success: false,
        error: 'User already exists'
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    // Create user
    await prisma.user.create({
      data: {
        userId: userData.userId.toLowerCase().trim(),
        password: hashedPassword,
        traderId: userData.traderId,
        name: userData.name,
        role: userData.role || 'user'
      }
    })

    return { success: true }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('User creation error:', error)
    }
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}
