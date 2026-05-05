import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId, verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tokenParam = searchParams.get('token')
    const chatId = searchParams.get('chatId')

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
    const user = db.prepare('SELECT has_whatsapp, whatsapp_number, whatsapp_data FROM users WHERE id = ?').get(userId) as any

    if (!user?.has_whatsapp) {
      return NextResponse.json({ messages: [], note: 'No WhatsApp account connected' })
    }

    // Return SMS messages as chat messages for the connected WhatsApp number
    const messages = db.prepare(`
      SELECT * FROM sms_messages WHERE user_id = ? 
      ORDER BY received_at DESC LIMIT 50
    `).all(userId)

    return NextResponse.json({ messages, phone: user.whatsapp_number })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
