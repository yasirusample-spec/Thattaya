import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { setupTelegramBot } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { botToken, chatId } = await req.json()
    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Bot token and chat ID required' }, { status: 400 })
    }

    const db = getDb()
    db.prepare('UPDATE users SET telegram_bot_token = ?, telegram_chat_id = ? WHERE id = ?')
      .run(botToken.trim(), chatId.trim(), userId)

    const result = await setupTelegramBot(userId, botToken.trim(), chatId.trim())
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Bot setup failed' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, username: result.username })
  } catch (err: any) {
    console.error('[telegram/setup]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT telegram_bot_token, telegram_chat_id FROM users WHERE id = ?').get(userId) as any
    return NextResponse.json({ configured: !!user?.telegram_bot_token, chatId: user?.telegram_chat_id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
