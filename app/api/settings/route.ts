import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId, hashPassword, checkPassword } from '@/lib/auth'
import { v4 as uuid } from 'uuid'

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const user = db.prepare('SELECT id, name, email, ivasms_email, telegram_bot_token, telegram_chat_id, mobile_token FROM users WHERE id = ?').get(userId) as any
    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any

    if (body.type === 'profile') {
      const { name, email } = body
      if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), userId)
      if (email) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.toLowerCase().trim(), userId)
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'password') {
      const { oldPassword, newPassword } = body
      if (!checkPassword(oldPassword, user.password_hash)) {
        return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })
      }
      if (newPassword.length < 6) return NextResponse.json({ error: 'Password too short' }, { status: 400 })
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId)
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'ivasms') {
      const { email, password } = body
      db.prepare('UPDATE users SET ivasms_email = ?, ivasms_password = ? WHERE id = ?').run(email, password, userId)
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'telegram') {
      const { botToken, chatId } = body
      db.prepare('UPDATE users SET telegram_bot_token = ?, telegram_chat_id = ? WHERE id = ?').run(botToken, chatId, userId)
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'regenerate_token') {
      const newToken = `dl_${uuid().replace(/-/g, '')}`
      db.prepare('UPDATE users SET mobile_token = ? WHERE id = ?').run(newToken, userId)
      return NextResponse.json({ ok: true, token: newToken })
    }

    if (body.type === 'delete_all') {
      db.prepare('DELETE FROM sms_messages WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM numbers WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM verification_sessions WHERE user_id = ?').run(userId)
      db.prepare('UPDATE users SET has_whatsapp = 0, whatsapp_number = NULL, whatsapp_data = NULL WHERE id = ?').run(userId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown update type' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Test iVASMS connection
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, password } = await req.json()
    const { IVASMSClient } = await import('@/lib/ivasms')
    const client = new IVASMSClient()
    const ok = await client.login(email, password)
    return NextResponse.json({ ok, message: ok ? 'Connected successfully!' : 'Login failed — check credentials or Cloudflare challenge' })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 })
  }
}
