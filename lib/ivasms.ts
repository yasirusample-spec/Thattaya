import nodeFetch from 'node-fetch'
import * as tough from 'tough-cookie'
import * as cheerio from 'cheerio'

export interface PhoneNumber {
  id: string
  phone: string
  country: string
  flag: string
  status: string
  smsCount: number
  lastReceived?: string
}

export interface SMSMessage {
  id: string
  sender: string
  body: string
  otp: string | null
  service: string
  receivedAt: string
}

const sessions: Map<string, { jar: tough.CookieJar; loggedIn: boolean }> = new Map()

export class IVASMSClient {
  private jar: tough.CookieJar
  private BASE = 'https://www.ivasms.com'
  private headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'max-age=0',
  }

  constructor(jar?: tough.CookieJar) {
    this.jar = jar || new tough.CookieJar()
  }

  private async request(url: string, options: any = {}): Promise<any> {
    const cookieHeader = await this.jar.getCookieString(url)
    const res = await nodeFetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
      redirect: 'manual',
    }) as any

    const setCookieHeaders = res.headers.raw?.()['set-cookie'] || []
    for (const cookie of setCookieHeaders) {
      try { await this.jar.setCookie(cookie, url) } catch {}
    }
    return res
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      // Step 1: GET login page
      const loginPage = await this.request(`${this.BASE}/login`)
      const html = await loginPage.text()
      const $ = cheerio.load(html)
      const token = $('input[name="_token"]').val() as string

      if (!token) {
        console.warn('[iVASMS] No CSRF token — possible Cloudflare challenge')
        return false
      }

      // Step 2: POST login form
      const body = new URLSearchParams({ email, password, _token: token, remember: 'on' })
      const loginRes = await this.request(`${this.BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${this.BASE}/login`,
          'Origin': this.BASE,
        },
        body: body.toString(),
      })

      const location = loginRes.headers.get('location') || ''
      const status = loginRes.status

      if (status === 302 && location && !location.includes('/login')) return true
      if (status === 200) {
        const text = await loginRes.text()
        if (text.includes('dashboard') || text.includes('numbers') || text.includes('logout')) return true
      }
      return false
    } catch (err) {
      console.error('[iVASMS] Login error:', err)
      return false
    }
  }

  async getNumbers(): Promise<PhoneNumber[]> {
    try {
      const res = await this.request(`${this.BASE}/numbers`)
      if (res.status === 302 || res.status === 401) throw new Error('NOT_LOGGED_IN')
      const html = await res.text()
      return this.parseNumbers(html)
    } catch (err: any) {
      if (err.message === 'NOT_LOGGED_IN') throw err
      console.error('[iVASMS] getNumbers error:', err)
      return []
    }
  }

  parseNumbers(html: string): PhoneNumber[] {
    const $ = cheerio.load(html)
    const numbers: PhoneNumber[] = []
    const seen = new Set<string>()

    // Try various table/row selectors
    const selectors = [
      'table tbody tr',
      '.number-row',
      '[class*="number-item"]',
      '[class*="phone-row"]',
    ]

    for (const sel of selectors) {
      $(sel).each((i, el) => {
        const cells = $(el).find('td')
        let phone = ''

        cells.each((_, cell) => {
          const txt = $(cell).text().trim().replace(/\s+/g, '')
          if (txt.match(/^\+?\d{7,15}$/)) phone = txt
        })

        if (!phone) {
          const txt = $(el).text().trim()
          const m = txt.match(/\+?\d[\d\s\-]{6,14}\d/)
          if (m) phone = m[0].replace(/[\s\-]/g, '')
        }

        if (phone && !seen.has(phone)) {
          seen.add(phone)
          numbers.push({
            id: `ivasms-${i}-${Date.now()}`,
            phone,
            country: detectCountry(phone),
            flag: getFlag(phone),
            status: 'active',
            smsCount: 0,
          })
        }
      })
      if (numbers.length > 0) break
    }

    // Also try data attributes
    $('[data-number],[data-phone],[data-value]').each((i, el) => {
      const phone = ($(el).attr('data-number') || $(el).attr('data-phone') || $(el).attr('data-value') || '').trim()
      if (phone.match(/^\+?\d{7,15}$/) && !seen.has(phone)) {
        seen.add(phone)
        numbers.push({ id: `ivasms-d-${i}`, phone, country: detectCountry(phone), flag: getFlag(phone), status: 'active', smsCount: 0 })
      }
    })

    return numbers
  }

  async getSMSForNumber(numberId: string): Promise<SMSMessage[]> {
    try {
      const res = await this.request(`${this.BASE}/numbers/${numberId}/messages`)
      const html = await res.text()
      return this.parseSMS(html)
    } catch (err) {
      console.error('[iVASMS] getSMS error:', err)
      return []
    }
  }

  parseSMS(html: string): SMSMessage[] {
    const $ = cheerio.load(html)
    const messages: SMSMessage[] = []

    $('table tbody tr, .sms-row, .message-row, [class*="message-item"]').each((i, el) => {
      const cells = $(el).find('td')
      let sender = '', body = '', time = ''

      if (cells.length >= 2) {
        sender = $(cells[0]).text().trim()
        body = $(cells[1]).text().trim()
        time = $(cells[2])?.text().trim() || new Date().toISOString()
      } else {
        body = $(el).text().trim()
      }

      if (body && body.length > 2) {
        messages.push({
          id: `sms-${i}-${Date.now()}`,
          sender: sender || 'Unknown',
          body,
          otp: extractOTP(body),
          service: detectService(body),
          receivedAt: time || new Date().toISOString(),
        })
      }
    })

    return messages
  }
}

export function detectCountry(phone: string): string {
  const c = phone.replace(/[^\d]/g, '')
  if (c.startsWith('1')) return 'United States'
  if (c.startsWith('44')) return 'United Kingdom'
  if (c.startsWith('49')) return 'Germany'
  if (c.startsWith('33')) return 'France'
  if (c.startsWith('7')) return 'Russia'
  if (c.startsWith('91')) return 'India'
  if (c.startsWith('86')) return 'China'
  if (c.startsWith('81')) return 'Japan'
  if (c.startsWith('55')) return 'Brazil'
  if (c.startsWith('52')) return 'Mexico'
  if (c.startsWith('34')) return 'Spain'
  if (c.startsWith('39')) return 'Italy'
  if (c.startsWith('31')) return 'Netherlands'
  if (c.startsWith('46')) return 'Sweden'
  if (c.startsWith('47')) return 'Norway'
  if (c.startsWith('48')) return 'Poland'
  if (c.startsWith('380')) return 'Ukraine'
  if (c.startsWith('90')) return 'Turkey'
  return 'Unknown'
}

export function getFlag(phone: string): string {
  const c = phone.replace(/[^\d]/g, '')
  if (c.startsWith('1')) return '🇺🇸'
  if (c.startsWith('44')) return '🇬🇧'
  if (c.startsWith('49')) return '🇩🇪'
  if (c.startsWith('33')) return '🇫🇷'
  if (c.startsWith('7')) return '🇷🇺'
  if (c.startsWith('91')) return '🇮🇳'
  if (c.startsWith('86')) return '🇨🇳'
  if (c.startsWith('81')) return '🇯🇵'
  if (c.startsWith('55')) return '🇧🇷'
  if (c.startsWith('52')) return '🇲🇽'
  if (c.startsWith('34')) return '🇪🇸'
  if (c.startsWith('39')) return '🇮🇹'
  if (c.startsWith('31')) return '🇳🇱'
  if (c.startsWith('46')) return '🇸🇪'
  if (c.startsWith('47')) return '🇳🇴'
  if (c.startsWith('48')) return '🇵🇱'
  if (c.startsWith('380')) return '🇺🇦'
  if (c.startsWith('90')) return '🇹🇷'
  return '🌍'
}

export function extractOTP(body: string): string | null {
  const patterns = [
    /\b(\d{6})\b/,
    /code[:\s]+(\d{4,8})/i,
    /OTP[:\s]+(\d{4,8})/i,
    /is[:\s]+(\d{6})/i,
    /verification[:\s]+(\d{4,8})/i,
    /\b(\d{4,8})\b/,
  ]
  for (const p of patterns) {
    const m = body.match(p)
    if (m?.[1] && m[1].length >= 4) return m[1]
  }
  return null
}

export function detectService(body: string): string {
  if (/google/i.test(body)) return 'Google'
  if (/whatsapp/i.test(body)) return 'WhatsApp'
  if (/telegram/i.test(body)) return 'Telegram'
  if (/facebook|meta/i.test(body)) return 'Facebook'
  if (/instagram/i.test(body)) return 'Instagram'
  if (/twitter|x\.com/i.test(body)) return 'Twitter'
  if (/amazon/i.test(body)) return 'Amazon'
  if (/microsoft|msn/i.test(body)) return 'Microsoft'
  if (/apple|icloud/i.test(body)) return 'Apple'
  if (/paypal/i.test(body)) return 'PayPal'
  if (/uber/i.test(body)) return 'Uber'
  if (/netflix/i.test(body)) return 'Netflix'
  return 'Unknown'
}
