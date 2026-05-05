import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { v4 as uuid } from 'uuid'
import { IVASMSClient, extractOTP, detectService } from '@/lib/ivasms'

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const hasOtp = searchParams.get('hasOtp') === 'true'
    const service = searchParams.get('service') || ''
    const numberId = searchParams.get('numberId') || ''
    const offset = (page - 1) * limit

    const db = getDb()
    let query = 'SELECT * FROM sms_messages WHERE user_id = ?'
    const params: any[] = [userId]

    if (search) { query += ' AND (body LIKE ? OR sender LIKE ? OR phone_number LIKE ?)'; const s = `%${search}%`; params.push(s, s, s) }
    if (hasOtp) { query += ' AND otp IS NOT NULL AND otp != ""' }
    if (service) { query += ' AND service = ?'; params.push(service) }
    if (numberId) { query += ' AND number_id = ?'; params.push(numberId) }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const total = (db.prepare(countQuery).get(...params) as any)?.count || 0

    query += ' ORDER BY received_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const messages = db.prepare(query).all(...params)
    return NextResponse.json({ messages, total, page, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Manually add SMS (for testing)
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phone_number, sender, body, number_id } = await req.json()
    const db = getDb()
    const otp = extractOTP(body || '')
    const service = detectService(body || '')

    const id = uuid()
    db.prepare(`
      INSERT INTO sms_messages (id, user_id, number_id, phone_number, sender, body, otp, service)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, number_id || null, phone_number, sender || 'Unknown', body, otp, service)

    if (number_id) {
      db.prepare('UPDATE numbers SET sms_count = sms_count + 1, last_received = datetime("now") WHERE id = ?').run(number_id)
    }

    return NextResponse.json({ ok: true, id, otp, service })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
