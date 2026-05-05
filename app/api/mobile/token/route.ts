import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const db = getDb()
    const user = db.prepare('SELECT id, name, email, has_whatsapp, whatsapp_number FROM users WHERE mobile_token = ?').get(token) as any
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    return NextResponse.json({ ok: true, user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
