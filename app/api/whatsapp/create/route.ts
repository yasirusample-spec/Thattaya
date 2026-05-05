import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getAuthUserId } from '@/lib/auth'
import { requestWhatsAppCode, verifyWhatsAppCode } from '@/lib/whatsapp-register'
import { IVASMSClient, extractOTP } from '@/lib/ivasms'
import { v4 as uuid } from 'uuid'
import store from '@/lib/store'

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (user.has_whatsapp) {
      return NextResponse.json({ error: 'You already have a WhatsApp account. Delete it first.' }, { status: 400 })
    }

    const { phoneNumber } = await req.json()
    if (!phoneNumber) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    // Check number belongs to user
    const numRecord = db.prepare('SELECT * FROM numbers WHERE phone = ? AND user_id = ?').get(
      phoneNumber.replace(/\s/g, ''), userId
    ) as any

    // Step 1: Request WA code
    store.setWAStatus(userId, { step: 2, stepName: 'Requesting verification code...', status: 'in_progress' })
    const regResult = await requestWhatsAppCode(phoneNumber)

    if (regResult.status !== 'sent') {
      store.setWAStatus(userId, { step: 2, stepName: 'Request failed', status: 'error', error: `WA returned: ${regResult.reason || 'unknown error'}` })
      return NextResponse.json({ error: `WhatsApp code request failed: ${regResult.reason}`, retryAfter: regResult.retryAfter }, { status: 400 })
    }

    store.setWAStatus(userId, { step: 3, stepName: 'Waiting for SMS OTP from iVASMS...', status: 'in_progress' })

    // Step 2: Poll iVASMS for the WA OTP (2 minute timeout)
    let waOTP: string | null = null
    if (user.ivasms_email && numRecord) {
      const client = new IVASMSClient()
      const loggedIn = await client.login(user.ivasms_email, user.ivasms_password)
      if (loggedIn) {
        const deadline = Date.now() + 120000 // 2 minutes
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 5000))
          const smsMessages = await client.getSMSForNumber(numRecord.ivasms_id || '1')
          for (const sms of smsMessages) {
            if (/whatsapp/i.test(sms.body) && sms.otp) {
              waOTP = sms.otp
              break
            }
          }
          if (waOTP) break
        }
      }
    }

    if (!waOTP) {
      store.setWAStatus(userId, { step: 3, stepName: 'OTP not received (timeout)', status: 'error', error: 'Did not receive WhatsApp OTP within 2 minutes' })
      return NextResponse.json({ error: 'WhatsApp OTP not received within timeout. The SMS may not have arrived.' }, { status: 408 })
    }

    // Step 3: Verify
    store.setWAStatus(userId, { step: 4, stepName: 'Verifying account...', status: 'in_progress' })
    const verifyResult = await verifyWhatsAppCode(phoneNumber, waOTP)

    if (verifyResult.status !== 'ok') {
      store.setWAStatus(userId, { step: 4, stepName: 'Verification failed', status: 'error', error: `WA verify: ${verifyResult.reason}` })
      return NextResponse.json({ error: `WhatsApp verification failed: ${verifyResult.reason}` }, { status: 400 })
    }

    // Step 4: Store in DB
    const mobileToken = `dl_${uuid().replace(/-/g, '')}`
    db.prepare(`
      UPDATE users SET has_whatsapp = 1, whatsapp_number = ?, whatsapp_data = ?, mobile_token = COALESCE(mobile_token, ?)
      WHERE id = ?
    `).run(phoneNumber, JSON.stringify(verifyResult), mobileToken, userId)

    if (numRecord) {
      db.prepare('UPDATE numbers SET whatsapp_created = 1 WHERE id = ?').run(numRecord.id)
    }

    const token = db.prepare('SELECT mobile_token FROM users WHERE id = ?').get(userId) as any
    const qrData = `dlchat://connect?token=${token.mobile_token}&url=${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`

    store.setWAStatus(userId, { step: 5, stepName: 'Account created!', status: 'done', token: token.mobile_token, qrData })

    return NextResponse.json({ success: true, token: token.mobile_token, qrData, phone: phoneNumber })
  } catch (err: any) {
    console.error('[whatsapp/create]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
