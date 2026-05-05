import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { signToken, hashPassword } from '@/lib/auth'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim())
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const id = uuid()
    const mobileToken = `dl_${uuid().replace(/-/g, '')}`
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, mobile_token) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name.trim(), email.toLowerCase().trim(), hashPassword(password), mobileToken)

    const token = await signToken(id)
    const res = NextResponse.json({ ok: true, user: { id, name, email } })
    res.cookies.set('dl_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err: any) {
    console.error('[auth/register]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
