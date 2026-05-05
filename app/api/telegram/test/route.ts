import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { sendTestMessage } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT telegram_bot_token, telegram_chat_id FROM users WHERE id = ?').get(userId) as any
    if (!user?.telegram_bot_token) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 400 })
    }

    const ok = await sendTestMessage(userId)
    return NextResponse.json({ ok })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
