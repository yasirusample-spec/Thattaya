import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { IVASMSClient, extractOTP } from '@/lib/ivasms'
import { v4 as uuid } from 'uuid'

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const sessions = db.prepare('SELECT * FROM verification_sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    return NextResponse.json({ sessions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phoneNumber, service, numberId } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const db = getDb()
    const id = uuid()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    db.prepare(`
      INSERT INTO verification_sessions (id, user_id, number_id, phone_number, service, status, expires_at)
      VALUES (?, ?, ?, ?, ?, 'waiting', ?)
    `).run(id, userId, numberId || null, phoneNumber, service || 'Unknown', expiresAt)

    // Start polling in background
    startPolling(id, userId, phoneNumber, numberId)

    return NextResponse.json({ ok: true, sessionId: id, expiresAt })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

    const db = getDb()
    db.prepare('DELETE FROM verification_sessions WHERE id = ? AND user_id = ?').run(id, userId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function startPolling(sessionId: string, userId: string, phoneNumber: string, numberId?: string) {
  const db = getDb()
  const user = db.prepare('SELECT ivasms_email, ivasms_password FROM users WHERE id = ?').get(userId) as any
  if (!user?.ivasms_email) return

  const numRecord = numberId
    ? db.prepare('SELECT * FROM numbers WHERE id = ?').get(numberId) as any
    : db.prepare('SELECT * FROM numbers WHERE phone = ? AND user_id = ?').get(phoneNumber, userId) as any

  const deadline = Date.now() + 5 * 60 * 1000

  try {
    const client = new IVASMSClient()
    const loggedIn = await client.login(user.ivasms_email, user.ivasms_password)
    if (!loggedIn) return

    const poll = async () => {
      if (Date.now() > deadline) {
        db.prepare("UPDATE verification_sessions SET status = 'expired' WHERE id = ?").run(sessionId)
        return
      }

      const session = db.prepare('SELECT status FROM verification_sessions WHERE id = ?').get(sessionId) as any
      if (!session || session.status !== 'waiting') return

      try {
        const smsMessages = await client.getSMSForNumber(numRecord?.ivasms_id || '1')
        for (const sms of smsMessages) {
          if (sms.otp) {
            db.prepare("UPDATE verification_sessions SET status = 'received', otp = ? WHERE id = ?").run(sms.otp, sessionId)
            return
          }
        }
      } catch {}

      setTimeout(poll, 5000)
    }

    setTimeout(poll, 5000)
  } catch {}
}
