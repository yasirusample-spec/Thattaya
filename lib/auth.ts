import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dl-sms-secret-2025-team-death-legion'
)

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.userId as string
  } catch {
    return null
  }
}

export const hashPassword = (p: string) => bcrypt.hashSync(p, 10)
export const checkPassword = (p: string, h: string) => bcrypt.compareSync(p, h)

export async function getAuthUserId(req?: NextRequest): Promise<string | null> {
  let token: string | undefined

  if (req) {
    token = req.cookies.get('dl_token')?.value
    if (!token) {
      const auth = req.headers.get('authorization')
      if (auth?.startsWith('Bearer ')) token = auth.slice(7)
    }
  } else {
    try {
      const cookieStore = cookies()
      token = cookieStore.get('dl_token')?.value
    } catch {
      return null
    }
  }

  if (!token) return null
  return verifyToken(token)
}
