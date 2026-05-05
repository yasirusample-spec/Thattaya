import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import store from '@/lib/store'

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT has_whatsapp, whatsapp_number, whatsapp_data, mobile_token FROM users WHERE id = ?').get(userId) as any

    const creationStatus = store.getWAStatus(userId)

    return NextResponse.json({
      hasWhatsApp: !!user?.has_whatsapp,
      phone: user?.whatsapp_number,
      token: user?.mobile_token,
      waData: user?.whatsapp_data ? JSON.parse(user.whatsapp_data) : null,
      creationStatus: creationStatus || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    db.prepare('UPDATE users SET has_whatsapp = 0, whatsapp_number = NULL, whatsapp_data = NULL WHERE id = ?').run(userId)
    db.prepare('UPDATE numbers SET whatsapp_created = 0 WHERE user_id = ?').run(userId)
    store.clearWAStatus(userId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
