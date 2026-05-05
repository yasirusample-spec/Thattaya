import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { chatId, text, token } = await req.json()

    let userId: string | null = null
    if (token) {
      const db = getDb()
      const user = db.prepare('SELECT id FROM users WHERE mobile_token = ?').get(token) as any
      userId = user?.id || null
    } else {
      userId = await getAuthUserId(req)
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT has_whatsapp, whatsapp_number, whatsapp_data FROM users WHERE id = ?').get(userId) as any

    if (!user?.has_whatsapp) {
      return NextResponse.json({ error: 'No WhatsApp account connected' }, { status: 400 })
    }

    // In a real implementation, this would use the stored WA credentials to send via WA API
    // For now, log the send attempt and return success
    console.log(`[WA Send] User ${userId} -> ${chatId}: ${text}`)

    return NextResponse.json({ ok: true, messageId: `msg_${Date.now()}`, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
