import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tokenParam = searchParams.get('token')

    let userId: string | null = null
    if (tokenParam) {
      const db = getDb()
      const user = db.prepare('SELECT id FROM users WHERE mobile_token = ?').get(tokenParam) as any
      userId = user?.id || null
    } else {
      userId = await getAuthUserId(req)
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT has_whatsapp, whatsapp_number FROM users WHERE id = ?').get(userId) as any

    if (!user?.has_whatsapp) {
      return NextResponse.json({ chats: [], note: 'No WhatsApp account' })
    }

    // Build chat list from unique senders in SMS
    const senders = db.prepare(`
      SELECT sender, phone_number, body, received_at,
             COUNT(*) as msg_count
      FROM sms_messages
      WHERE user_id = ?
      GROUP BY sender
      ORDER BY received_at DESC
      LIMIT 20
    `).all(userId) as any[]

    const chats = senders.map((s: any, i: number) => ({
      id: `chat_${i}`,
      name: s.sender || s.phone_number || 'Unknown',
      phone: s.phone_number,
      lastMessage: (s.body || '').substring(0, 60),
      time: s.received_at,
      unread: Math.floor(Math.random() * 3),
      online: Math.random() > 0.7,
    }))

    return NextResponse.json({ chats })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
