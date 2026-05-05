import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { IVASMSClient, extractOTP, detectService, detectCountry, getFlag } from '@/lib/ivasms'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any

    if (!user?.ivasms_email || !user?.ivasms_password) {
      return NextResponse.json({
        success: false,
        error: 'iVASMS credentials not configured. Go to Settings to add them.',
      }, { status: 400 })
    }

    const client = new IVASMSClient()
    const loggedIn = await client.login(user.ivasms_email, user.ivasms_password)

    if (!loggedIn) {
      return NextResponse.json({
        success: false,
        error: 'iVASMS login failed. Cloudflare protection may be active.',
        hint: 'Visit ivasms.com manually first, then try again. Credentials may also be incorrect.',
      }, { status: 200 })
    }

    const numbers = await client.getNumbers()

    let addedCount = 0
    for (const num of numbers) {
      const existing = db.prepare('SELECT id FROM numbers WHERE phone = ? AND user_id = ?').get(num.phone, userId) as any
      if (!existing) {
        db.prepare(`
          INSERT INTO numbers (id, user_id, ivasms_id, phone, country, flag, status, sms_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuid(), userId, num.id, num.phone, num.country, num.flag, 'active', 0)
        addedCount++
      }
    }

    const allNumbers = db.prepare('SELECT * FROM numbers WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    return NextResponse.json({
      success: true,
      count: allNumbers.length,
      added: addedCount,
      numbers: allNumbers,
    })
  } catch (err: any) {
    console.error('[ivasms/sync]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
