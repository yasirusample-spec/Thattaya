import crypto from 'crypto'

const WA_REG_URL = 'https://v.whatsapp.net/v2/code'
const WA_VERIFY_URL = 'https://v.whatsapp.net/v2/register'

export interface WARegistrationResult {
  status: 'sent' | 'error'
  retryAfter?: number
  reason?: string
}

export interface WAVerifyResult {
  status: 'ok' | 'error'
  login?: string
  pw?: string
  type?: string
  expiration?: number
  kind?: string
  reason?: string
}

function generateWAToken(cc: string, phone: string): string {
  const key = 'PdA2DJyKoLz6vJ65T6dv/nZQN3LFBF9VrFNkacoO'
  const data = cc + phone
  return crypto.createHmac('md5', Buffer.from(key, 'base64'))
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function detectCountryCode(phone: string): string {
  const c = phone.replace(/[^\d]/g, '')
  const prefixes = [
    ['380', '380'], ['358', '358'], ['351', '351'],
    ['44', '44'], ['49', '49'], ['33', '33'], ['91', '91'],
    ['86', '86'], ['81', '81'], ['82', '82'], ['55', '55'],
    ['52', '52'], ['34', '34'], ['39', '39'], ['31', '31'],
    ['46', '46'], ['47', '47'], ['45', '45'], ['48', '48'],
    ['90', '90'], ['7', '7'], ['1', '1'],
  ]
  for (const [prefix, code] of prefixes) {
    if (c.startsWith(prefix)) return code
  }
  return '1'
}

export async function requestWhatsAppCode(phoneNumber: string): Promise<WARegistrationResult> {
  const cleaned = phoneNumber.replace(/[^\d]/g, '')
  const cc = detectCountryCode(cleaned)
  const nationalNumber = cleaned.slice(cc.length)
  const deviceId = crypto.randomBytes(20).toString('base64')
  const token = generateWAToken(cc, nationalNumber)

  const params = new URLSearchParams({
    cc,
    in: nationalNumber,
    lg: 'en',
    lc: 'US',
    token,
    id: deviceId,
    mistyped: '6',
    network_radio_type: '1',
    simnum: '1',
    s: '',
    copiedrc: '1',
    hasinrc: '1',
    rcmatch: '1',
    pid: String(Math.floor(Math.random() * 65535)),
    method: 'sms',
    reason: '',
    hasav: '1',
  })

  try {
    const res = await fetch(`${WA_REG_URL}?${params}`, {
      headers: {
        'User-Agent': 'WhatsApp/2.24.6.77 A',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    const data = (await res.json()) as any
    return {
      status: data.status === 'sent' ? 'sent' : 'error',
      retryAfter: data.retry_after,
      reason: data.reason,
    }
  } catch (err: any) {
    return { status: 'error', reason: err.message }
  }
}

export async function verifyWhatsAppCode(phoneNumber: string, code: string): Promise<WAVerifyResult> {
  const cleaned = phoneNumber.replace(/[^\d]/g, '')
  const cc = detectCountryCode(cleaned)
  const nationalNumber = cleaned.slice(cc.length)
  const token = generateWAToken(cc, nationalNumber)

  const params = new URLSearchParams({
    cc,
    in: nationalNumber,
    lg: 'en',
    lc: 'US',
    token,
    id: crypto.randomBytes(20).toString('base64'),
    code: code.replace('-', ''),
    mistyped: '6',
    network_radio_type: '1',
    simnum: '1',
    hasinrc: '1',
  })

  try {
    const res = await fetch(`${WA_VERIFY_URL}?${params}`, {
      headers: {
        'User-Agent': 'WhatsApp/2.24.6.77 A',
        Accept: 'application/json',
      },
    })
    return (await res.json()) as WAVerifyResult
  } catch (err: any) {
    return { status: 'error', reason: err.message }
  }
}
