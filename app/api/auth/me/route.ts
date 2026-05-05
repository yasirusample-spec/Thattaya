import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare(
      'SELECT id, name, email, ivasms_email, telegram_bot_token, telegram_chat_id, mobile_token, has_whatsapp, whatsapp_number, created_at FROM users WHERE id = ?'
    ).get(userId) as any

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user })
  } catch (err: any) {
    console.error('[auth/me]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
