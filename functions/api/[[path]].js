// Cloudflare Pages Functions - Full API handler v3
// DL SMS Client — Team Death Legion
// WebCrypto JWT · KV/in-memory store · iVASMS live scraper · 40+ endpoints

// ─── Tiny JWT (HS256 via WebCrypto) ────────────────────────────────────────
async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')
  const body   = btoa(JSON.stringify(payload)).replace(/=/g, '')
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${body}.${sigB64}`
}

async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = token.split('.')
    if (!h || !b || !s) return null
    const key    = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const pad    = s.replace(/-/g, '+').replace(/_/g, '/')
    const padded = pad + '=='.slice(0, (4 - pad.length % 4) % 4)
    const sigBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(`${h}.${b}`))
    if (!valid) return null
    const bPad    = b + '=='.slice(0, (4 - b.length % 4) % 4)
    const payload = JSON.parse(atob(bPad))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password + 'dl-sms-salt-2025')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

async function checkPassword(password, hash) {
  return (await hashPassword(password)) === hash
}

// ─── KV / in-memory data store ──────────────────────────────────────────────
const CACHE = new Map()

async function kvGet(kv, key, fallback) {
  if (kv) {
    try {
      const v = await kv.get(key, 'json')
      return (v !== null && v !== undefined) ? v : fallback
    } catch { return fallback }
  }
  return CACHE.has(key) ? CACHE.get(key) : fallback
}

async function kvSet(kv, key, value) {
  if (kv) {
    try { await kv.put(key, JSON.stringify(value)) } catch {}
  } else {
    CACHE.set(key, value)
  }
}

function uuid() { return crypto.randomUUID() }

// ─── Bootstrap default admin ──────────────────────────────────────────────
async function ensureAdmin(kv) {
  let users = await kvGet(kv, 'users', null)
  if (!users) {
    const pwHash = await hashPassword('admin123')
    users = [{
      id: 'admin',
      name: 'Admin',
      email: 'admin@dlsms.com',
      password_hash: pwHash,
      role: 'admin',
      ivasms_email: '',
      ivasms_password: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
      mobile_token: 'dl_' + uuid().replace(/-/g, ''),
      has_whatsapp: 0,
      whatsapp_number: '',
      api_key: 'dlk_' + uuid().replace(/-/g, ''),
      auto_sync: false,
      auto_sync_interval: 300,
      notify_otp: true,
      notify_sms: false,
      notify_sync: true,
      theme: 'dark',
      pin_vault_hash: '',
      webhook_url: '',
      webhook_events: [],
      created_at: new Date().toISOString(),
    }]
    await kvSet(kv, 'users', users)
  }
  return users
}

// ─── Auth helpers ──────────────────────────────────────────────────────────
const JWT_SECRET = 'dl-sms-jwt-secret-death-legion-2025'

async function getAuthUser(request, kv) {
  const cookie      = request.headers.get('Cookie') || ''
  const tokenMatch  = cookie.match(/dl_token=([^;]+)/)
  const authHeader  = request.headers.get('Authorization') || ''
  const xApiKey     = request.headers.get('X-API-Key') || ''
  const token       = tokenMatch?.[1] || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null)

  if (xApiKey) {
    const users = await kvGet(kv, 'users', [])
    const arr   = Array.isArray(users) ? users : []
    return arr.find(u => u.api_key === xApiKey) || null
  }

  if (!token) return null
  const payload = await verifyJWT(token, JWT_SECRET)
  if (!payload?.userId) return null
  const users = await kvGet(kv, 'users', [])
  return (Array.isArray(users) ? users : []).find(u => u.id === payload.userId) || null
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      ...extraHeaders
    },
  })
}

function unauthorized() { return json({ error: 'Unauthorized' }, 401) }

// ─── Telegram notification helper ──────────────────────────────────────────
async function sendTelegramNotification(user, message) {
  if (!user.telegram_bot_token || !user.telegram_chat_id) return false
  try {
    const r = await fetch(`https://api.telegram.org/bot${user.telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    })
    const d = await r.json()
    return d.ok
  } catch { return false }
}

// ─── Webhook fire helper ────────────────────────────────────────────────────
async function fireWebhook(user, event, payload) {
  if (!user.webhook_url) return
  const events = user.webhook_events || []
  if (events.length > 0 && !events.includes(event)) return
  try {
    await fetch(user.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DL-Event': event },
      body: JSON.stringify({ event, payload, ts: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {}
}

// ─── Push notification store helper ────────────────────────────────────────
async function pushNotif(kv, userId, type, title, message, meta = {}) {
  const notifs = await kvGet(kv, `notifs_${userId}`, [])
  const arr    = Array.isArray(notifs) ? notifs : []
  arr.unshift({ id: uuid(), type, title, message, read: false, ts: new Date().toISOString(), ...meta })
  await kvSet(kv, `notifs_${userId}`, arr.slice(0, 300))
}

// ─── Main router ──────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context
  const url    = new URL(request.url)
  const path   = url.pathname.replace(/\/$/, '')
  const method = request.method

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-API-Key',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }

  const kv = env.DLSMS_KV || null

  try {

    // ══════════════════════════════════════════════════════════════════
    // AUTH ROUTES
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/auth/login' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { email, password } = body
      if (!email || !password) return json({ error: 'Email and password required' }, 400)
      const users = await ensureAdmin(kv)
      const user  = users.find(u => u.email === email.toLowerCase().trim())
      if (!user || !(await checkPassword(password, user.password_hash)))
        return json({ error: 'Invalid email or password' }, 401)
      const token     = await signJWT(
        { userId: user.id, exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
        JWT_SECRET
      )
      const cookieStr = `dl_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}`
      const activity = await kvGet(kv, `activity_${user.id}`, [])
      const actArr   = Array.isArray(activity) ? activity : []
      actArr.unshift({ type: 'login', ts: new Date().toISOString(), ip: request.headers.get('CF-Connecting-IP') || 'unknown', ua: (request.headers.get('User-Agent') || '').slice(0, 80) })
      await kvSet(kv, `activity_${user.id}`, actArr.slice(0, 200))
      return new Response(JSON.stringify({ ok: true, user: { id: user.id, name: user.name, email: user.email } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': cookieStr,
        },
      })
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { name, email, password } = body
      if (!name || !email || !password) return json({ error: 'All fields required' }, 400)
      if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)
      const users = await ensureAdmin(kv)
      if (users.find(u => u.email === email.toLowerCase().trim()))
        return json({ error: 'Email already registered' }, 409)
      const newUser = {
        id: uuid(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: await hashPassword(password),
        role: 'user',
        ivasms_email: '',
        ivasms_password: '',
        telegram_bot_token: '',
        telegram_chat_id: '',
        mobile_token: 'dl_' + uuid().replace(/-/g, ''),
        api_key: 'dlk_' + uuid().replace(/-/g, ''),
        has_whatsapp: 0,
        whatsapp_number: '',
        auto_sync: false,
        auto_sync_interval: 300,
        notify_otp: true,
        notify_sms: false,
        notify_sync: true,
        theme: 'dark',
        pin_vault_hash: '',
        webhook_url: '',
        webhook_events: [],
        created_at: new Date().toISOString(),
      }
      users.push(newUser)
      await kvSet(kv, 'users', users)
      const token     = await signJWT(
        { userId: newUser.id, exp: Math.floor(Date.now() / 1000) + 7 * 86400 },
        JWT_SECRET
      )
      const cookieStr = `dl_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}`
      return new Response(JSON.stringify({ ok: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': cookieStr,
        },
      })
    }

    if (path === '/api/auth/me' && method === 'GET') {
      await ensureAdmin(kv)
      const user = await getAuthUser(request, kv)
      if (!user) return unauthorized()
      return json({
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role || 'user',
          ivasms_email: user.ivasms_email || '',
          telegram_bot_token: user.telegram_bot_token || '',
          telegram_chat_id: user.telegram_chat_id || '',
          mobile_token: user.mobile_token || '',
          api_key: user.api_key || '',
          has_whatsapp: user.has_whatsapp || 0,
          whatsapp_number: user.whatsapp_number || '',
          auto_sync: user.auto_sync || false,
          auto_sync_interval: user.auto_sync_interval || 300,
          notify_otp: user.notify_otp !== false,
          notify_sms: user.notify_sms || false,
          notify_sync: user.notify_sync !== false,
          theme: user.theme || 'dark',
          webhook_url: user.webhook_url || '',
          webhook_events: user.webhook_events || [],
          created_at: user.created_at || '',
          last_sync: user.last_sync || null,
          sync_count: user.sync_count || 0,
        }
      })
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': 'dl_token=; Max-Age=0; Path=/; SameSite=Lax',
        },
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // STATUS (public)
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/status' && method === 'GET') {
      const start = Date.now()
      let ivasOk = false, ivasLatency = 0
      try {
        const s = Date.now()
        const r = await fetch('https://www.ivasms.com', { signal: AbortSignal.timeout(5000) })
        ivasOk      = r.ok || r.status < 500
        ivasLatency = Date.now() - s
      } catch {}
      const apiLatency = Date.now() - start
      return json({
        overall: 'operational',
        components: [
          { name: 'API Service',         ok: true,    latency: apiLatency,  uptime: 99.99, status: 'operational' },
          { name: 'iVASMS Connection',   ok: ivasOk,  latency: ivasLatency, uptime: 99.5,  status: ivasOk ? 'operational' : 'degraded' },
          { name: 'SMS Receiving',       ok: true,    latency: 1,           uptime: 99.9,  status: 'operational' },
          { name: 'WhatsApp Service',    ok: true,    latency: 5,           uptime: 99.8,  status: 'operational' },
          { name: 'Telegram Bot',        ok: true,    latency: 3,           uptime: 99.7,  status: 'operational' },
          { name: 'Database',            ok: true,    latency: 2,           uptime: 99.99, status: 'operational' },
          { name: 'Auto Sync',           ok: true,    latency: 0,           uptime: 99.5,  status: 'operational' },
          { name: 'Notifications',       ok: true,    latency: 1,           uptime: 99.9,  status: 'operational' },
          { name: 'OTP Monitor',         ok: true,    latency: 1,           uptime: 99.9,  status: 'operational' },
          { name: 'Webhook Delivery',    ok: true,    latency: 2,           uptime: 99.8,  status: 'operational' },
          { name: 'Export Engine',       ok: true,    latency: 0,           uptime: 99.99, status: 'operational' },
          { name: 'Bulk Sender',         ok: true,    latency: 2,           uptime: 99.7,  status: 'operational' },
        ],
        updatedAt: new Date().toISOString(),
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // ALL REMAINING ENDPOINTS REQUIRE AUTH
    // ══════════════════════════════════════════════════════════════════
    await ensureAdmin(kv)
    const user = await getAuthUser(request, kv)
    if (!user) return unauthorized()

    // ══════════════════════════════════════════════════════════════════
    // iVASMS NUMBERS
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/ivasms/numbers' && method === 'GET') {
      const numbers  = await kvGet(kv, `numbers_${user.id}`, [])
      const now      = Date.now()
      const enriched = (Array.isArray(numbers) ? numbers : []).map(n => {
        const lastMs     = n.last_received ? new Date(n.last_received).getTime() : 0
        const hoursSince = lastMs ? (now - lastMs) / 3600000 : Infinity
        const isActive   = n.status === 'active' || hoursSince < 24
        return { ...n, status: isActive ? 'active' : 'inactive' }
      })
      return json({ numbers: enriched })
    }

    // ══════════════════════════════════════════════════════════════════
    // iVASMS SMS
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/ivasms/sms' && method === 'GET') {
      const page     = Math.max(1, parseInt(url.searchParams.get('page')   || '1'))
      const limit    = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit')  || '20')))
      const search   = url.searchParams.get('search')   || ''
      const hasOtp   = url.searchParams.get('hasOtp')   === 'true'
      const service  = url.searchParams.get('service')  || ''
      const numberId = url.searchParams.get('numberId') || ''
      const since    = url.searchParams.get('since')    || ''
      const country  = url.searchParams.get('country')  || ''
      const dateFrom = url.searchParams.get('dateFrom') || ''
      const dateTo   = url.searchParams.get('dateTo')   || ''
      const tag      = url.searchParams.get('tag')      || ''
      const starred  = url.searchParams.get('starred')  === 'true'

      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!msgs || !Array.isArray(msgs)) msgs = []

      if (since) {
        const sinceMs = new Date(since).getTime()
        if (!isNaN(sinceMs)) msgs = msgs.filter(m => {
          const t = new Date(m.received_at).getTime()
          return !isNaN(t) && t > sinceMs
        })
      }
      if (dateFrom) { const f = new Date(dateFrom).getTime(); if (!isNaN(f)) msgs = msgs.filter(m => new Date(m.received_at).getTime() >= f) }
      if (dateTo)   { const t = new Date(dateTo).getTime() + 86399999; if (!isNaN(t)) msgs = msgs.filter(m => new Date(m.received_at).getTime() <= t) }
      if (search)   msgs = msgs.filter(m => (m.body || '').toLowerCase().includes(search.toLowerCase()) || (m.sender || '').toLowerCase().includes(search.toLowerCase()) || (m.phone_number || '').includes(search))
      if (hasOtp)   msgs = msgs.filter(m => m.otp)
      if (service)  msgs = msgs.filter(m => m.service === service)
      if (numberId) msgs = msgs.filter(m => m.number_id === numberId)
      if (starred)  msgs = msgs.filter(m => m.starred)
      if (tag)      msgs = msgs.filter(m => (m.tags || []).includes(tag))
      if (country) {
        const nums = await kvGet(kv, `numbers_${user.id}`, [])
        const numIds = (Array.isArray(nums) ? nums : []).filter(n => n.country === country.toUpperCase()).map(n => n.id)
        msgs = msgs.filter(m => numIds.includes(m.number_id))
      }

      const total = msgs.length
      const pages = Math.max(1, Math.ceil(total / limit))
      const paged = msgs.slice((page - 1) * limit, page * limit)
      return json({ messages: paged, total, pages, page })
    }

    if (path === '/api/ivasms/sms' && method === 'DELETE') {
      const body = await request.json().catch(() => ({}))
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      if (body.id) {
        msgs = msgs.filter(m => m.id !== body.id)
      } else if (body.clearAll) {
        msgs = []
      }
      await kvSet(kv, `sms_${user.id}`, msgs)
      return json({ ok: true, remaining: msgs.length })
    }

    // STAR/TAG SMS
    if (path === '/api/ivasms/sms/star' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const idx = msgs.findIndex(m => m.id === body.id)
      if (idx !== -1) msgs[idx].starred = body.starred !== false
      await kvSet(kv, `sms_${user.id}`, msgs)
      return json({ ok: true })
    }

    if (path === '/api/ivasms/sms/tag' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const idx = msgs.findIndex(m => m.id === body.id)
      if (idx !== -1) {
        const tags = new Set(msgs[idx].tags || [])
        if (body.action === 'remove') tags.delete(body.tag)
        else tags.add(body.tag)
        msgs[idx].tags = [...tags]
      }
      await kvSet(kv, `sms_${user.id}`, msgs)
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // iVASMS SYNC
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/ivasms/sync' && method === 'POST') {
      const freshUsers  = await kvGet(kv, 'users', [])
      const allUsers    = Array.isArray(freshUsers) ? freshUsers : []
      const freshUser   = allUsers.find(u => u.id === user.id) || user

      const ivasEmail   = (freshUser.ivasms_email    || '').trim()
      const ivasPass    = (freshUser.ivasms_password || '').trim()

      if (!ivasEmail || !ivasPass) {
        return json({
          error: 'iVASMS credentials not configured. Go to Settings → iVASMS Credentials and enter your email and password, then Save & Test.'
        }, 400)
      }

      try {
        const result = await scrapeIVASMS(ivasEmail, ivasPass, freshUser.id, kv)
        const users2 = await kvGet(kv, 'users', [])
        const arr2   = Array.isArray(users2) ? users2 : []
        const idx2   = arr2.findIndex(u => u.id === user.id)
        if (idx2 !== -1) {
          arr2[idx2].last_sync = new Date().toISOString()
          arr2[idx2].sync_count = (arr2[idx2].sync_count || 0) + 1
          await kvSet(kv, 'users', arr2)
        }

        // Telegram + webhook notifications for new OTPs
        if (result.smsAdded > 0) {
          const msgs2  = await kvGet(kv, `sms_${user.id}`, [])
          const latest = (Array.isArray(msgs2) ? msgs2 : []).slice(0, result.smsAdded)
          const otps   = latest.filter(m => m.otp)

          if (freshUser.telegram_bot_token && freshUser.notify_otp !== false) {
            for (const msg of otps.slice(0, 3)) {
              await sendTelegramNotification(freshUser,
                `🔑 *New OTP Received*\n\n📱 *Number:* \`${msg.phone_number}\`\n👤 *From:* ${msg.sender}\n🔐 *OTP:* \`${msg.otp}\`\n💬 *Message:* ${(msg.body || '').slice(0, 100)}\n\n_Team Death Legion_`
              )
            }
          }

          // Push notifications
          for (const msg of otps.slice(0, 5)) {
            await pushNotif(kv, user.id, 'otp', '🔑 New OTP', `OTP ${msg.otp} from ${msg.service}`, { otp: msg.otp, service: msg.service, phone: msg.phone_number })
          }

          // Webhook
          if (freshUser.webhook_url) {
            await fireWebhook(freshUser, 'sms.received', { count: result.smsAdded, otps: otps.length })
          }
        }

        if (freshUser.notify_sync !== false && result.smsAdded > 0) {
          await pushNotif(kv, user.id, 'sync', '🔄 Sync Complete', `${result.count} numbers · ${result.smsAdded} new SMS`)
        }

        const syncHist = await kvGet(kv, `sync_history_${user.id}`, [])
        const histArr  = Array.isArray(syncHist) ? syncHist : []
        histArr.unshift({ id: uuid(), ts: new Date().toISOString(), ...result })
        await kvSet(kv, `sync_history_${user.id}`, histArr.slice(0, 100))
        return json(result)
      } catch (err) {
        const msg = err?.message || String(err) || 'Unknown scraper error'
        return json({ error: msg }, 500)
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // iVASMS LIVE SMS POLL
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/ivasms/live' && method === 'GET') {
      const since = url.searchParams.get('since') || ''
      let msgs    = await kvGet(kv, `sms_${user.id}`, [])
      if (!msgs || !Array.isArray(msgs)) msgs = []

      if (since) {
        const sinceMs = new Date(since).getTime()
        if (!isNaN(sinceMs)) {
          msgs = msgs.filter(m => {
            const t = new Date(m.received_at).getTime()
            return !isNaN(t) && t > sinceMs
          })
        }
      } else {
        msgs = msgs.slice(0, 20)
      }

      const numbers = await kvGet(kv, `numbers_${user.id}`, [])
      const numArr  = Array.isArray(numbers) ? numbers : []
      const active  = numArr.filter(n => n.status === 'active').length

      return json({ messages: msgs, activeNumbers: active, total: msgs.length })
    }

    // ══════════════════════════════════════════════════════════════════
    // SYNC HISTORY
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/ivasms/sync-history' && method === 'GET') {
      const history = await kvGet(kv, `sync_history_${user.id}`, [])
      return json({ history: Array.isArray(history) ? history : [] })
    }

    // ══════════════════════════════════════════════════════════════════
    // COUNTRIES
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/countries' && method === 'GET') {
      const nums = await kvGet(kv, `numbers_${user.id}`, [])
      const msgs = await kvGet(kv, `sms_${user.id}`, [])
      const numArr = Array.isArray(nums) ? nums : []
      const msgArr = Array.isArray(msgs) ? msgs : []

      const countryMap = {}
      for (const n of numArr) {
        const c = n.country || 'US'
        if (!countryMap[c]) countryMap[c] = { code: c, name: n.country_name || c, numbers: 0, sms: 0, active: 0 }
        countryMap[c].numbers++
        countryMap[c].sms += n.sms_count || 0
        if (n.status === 'active') countryMap[c].active++
      }

      const countries = Object.values(countryMap).sort((a, b) => b.numbers - a.numbers)
      return json({ countries })
    }

    // ══════════════════════════════════════════════════════════════════
    // NUMBER GROUPS
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/groups' && method === 'GET') {
      const groups = await kvGet(kv, `groups_${user.id}`, [])
      return json({ groups: Array.isArray(groups) ? groups : [] })
    }

    if (path === '/api/groups' && method === 'POST') {
      const body   = await request.json().catch(() => ({}))
      const groups = await kvGet(kv, `groups_${user.id}`, [])
      const arr    = Array.isArray(groups) ? groups : []
      const group  = {
        id: uuid(),
        name: body.name || 'Group',
        color: body.color || '#e50914',
        description: body.description || '',
        numberIds: body.numberIds || [],
        created_at: new Date().toISOString(),
      }
      arr.push(group)
      await kvSet(kv, `groups_${user.id}`, arr)
      return json({ ok: true, group })
    }

    if (path.startsWith('/api/groups/') && method === 'PATCH') {
      const gid    = path.split('/')[3]
      const body   = await request.json().catch(() => ({}))
      const groups = await kvGet(kv, `groups_${user.id}`, [])
      const arr    = Array.isArray(groups) ? groups : []
      const idx    = arr.findIndex(g => g.id === gid)
      if (idx === -1) return json({ error: 'Group not found' }, 404)
      if (body.name)       arr[idx].name       = body.name
      if (body.color)      arr[idx].color      = body.color
      if (body.description !== undefined) arr[idx].description = body.description
      if (body.numberIds)  arr[idx].numberIds  = body.numberIds
      await kvSet(kv, `groups_${user.id}`, arr)
      return json({ ok: true, group: arr[idx] })
    }

    if (path.startsWith('/api/groups/') && method === 'DELETE') {
      const gid    = path.split('/')[3]
      const groups = await kvGet(kv, `groups_${user.id}`, [])
      const arr    = Array.isArray(groups) ? groups : []
      await kvSet(kv, `groups_${user.id}`, arr.filter(g => g.id !== gid))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // BLACKLIST
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/blacklist' && method === 'GET') {
      const bl = await kvGet(kv, `blacklist_${user.id}`, [])
      return json({ blacklist: Array.isArray(bl) ? bl : [] })
    }

    if (path === '/api/blacklist' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const bl   = await kvGet(kv, `blacklist_${user.id}`, [])
      const arr  = Array.isArray(bl) ? bl : []
      if (arr.find(b => b.value === body.value)) return json({ error: 'Already blacklisted' }, 409)
      const entry = {
        id: uuid(),
        type: body.type || 'sender',    // sender | keyword | service
        value: body.value || '',
        reason: body.reason || '',
        created_at: new Date().toISOString(),
      }
      arr.push(entry)
      await kvSet(kv, `blacklist_${user.id}`, arr)
      return json({ ok: true, entry })
    }

    if (path.startsWith('/api/blacklist/') && method === 'DELETE') {
      const bid = path.split('/')[3]
      const bl  = await kvGet(kv, `blacklist_${user.id}`, [])
      const arr = Array.isArray(bl) ? bl : []
      await kvSet(kv, `blacklist_${user.id}`, arr.filter(b => b.id !== bid))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // SCHEDULER (auto-sync schedules)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/scheduler' && method === 'GET') {
      const schedules = await kvGet(kv, `schedules_${user.id}`, [])
      return json({ schedules: Array.isArray(schedules) ? schedules : [] })
    }

    if (path === '/api/scheduler' && method === 'POST') {
      const body      = await request.json().catch(() => ({}))
      const schedules = await kvGet(kv, `schedules_${user.id}`, [])
      const arr       = Array.isArray(schedules) ? schedules : []
      const schedule  = {
        id: uuid(),
        name: body.name || 'Auto Sync',
        type: body.type || 'sync',         // sync | otp-check | export | notify
        interval: body.interval || 300,    // seconds
        enabled: body.enabled !== false,
        lastRun: null,
        nextRun: new Date(Date.now() + (body.interval || 300) * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
      arr.push(schedule)
      await kvSet(kv, `schedules_${user.id}`, arr)
      return json({ ok: true, schedule })
    }

    if (path.startsWith('/api/scheduler/') && method === 'PATCH') {
      const sid   = path.split('/')[3]
      const body  = await request.json().catch(() => ({}))
      const scheds = await kvGet(kv, `schedules_${user.id}`, [])
      const arr    = Array.isArray(scheds) ? scheds : []
      const idx    = arr.findIndex(s => s.id === sid)
      if (idx === -1) return json({ error: 'Schedule not found' }, 404)
      if (body.enabled !== undefined) arr[idx].enabled  = !!body.enabled
      if (body.interval)              arr[idx].interval = Number(body.interval)
      if (body.name)                  arr[idx].name     = body.name
      await kvSet(kv, `schedules_${user.id}`, arr)
      return json({ ok: true, schedule: arr[idx] })
    }

    if (path.startsWith('/api/scheduler/') && method === 'DELETE') {
      const sid   = path.split('/')[3]
      const scheds = await kvGet(kv, `schedules_${user.id}`, [])
      const arr    = Array.isArray(scheds) ? scheds : []
      await kvSet(kv, `schedules_${user.id}`, arr.filter(s => s.id !== sid))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // WEBHOOKS
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/webhooks' && method === 'GET') {
      const hooks = await kvGet(kv, `webhooks_${user.id}`, [])
      return json({ webhooks: Array.isArray(hooks) ? hooks : [], current: { url: user.webhook_url || '', events: user.webhook_events || [] } })
    }

    if (path === '/api/webhooks' && method === 'POST') {
      const body  = await request.json().catch(() => ({}))
      const users2 = await kvGet(kv, 'users', [])
      const arr2   = Array.isArray(users2) ? users2 : []
      const uidx   = arr2.findIndex(u => u.id === user.id)
      if (uidx !== -1) {
        arr2[uidx].webhook_url    = body.url    || ''
        arr2[uidx].webhook_events = body.events || []
        await kvSet(kv, 'users', arr2)
      }
      // Store webhook delivery log
      if (body.url) {
        const hooks = await kvGet(kv, `webhooks_${user.id}`, [])
        const hArr  = Array.isArray(hooks) ? hooks : []
        hArr.push({ id: uuid(), url: body.url, events: body.events || [], active: true, created_at: new Date().toISOString() })
        await kvSet(kv, `webhooks_${user.id}`, hArr.slice(0, 10))
      }
      return json({ ok: true })
    }

    if (path === '/api/webhooks/test' && method === 'POST') {
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (!freshUser.webhook_url) return json({ error: 'Webhook URL not set' }, 400)
      try {
        const r = await fetch(freshUser.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-DL-Event': 'webhook.test' },
          body: JSON.stringify({ event: 'webhook.test', payload: { message: 'DL SMS Client test webhook', ts: new Date().toISOString() } }),
          signal: AbortSignal.timeout(10000),
        })
        return json({ ok: true, status: r.status, statusText: r.statusText })
      } catch (e) {
        return json({ error: e.message }, 500)
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // SPEED DIAL (quick numbers)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/speed-dial' && method === 'GET') {
      const sd = await kvGet(kv, `speed_dial_${user.id}`, [])
      return json({ entries: Array.isArray(sd) ? sd : [] })
    }

    if (path === '/api/speed-dial' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const sd   = await kvGet(kv, `speed_dial_${user.id}`, [])
      const arr  = Array.isArray(sd) ? sd : []
      const entry = {
        id: uuid(),
        name: body.name || '',
        phone: body.phone || '',
        service: body.service || '',
        note: body.note || '',
        shortcut: body.shortcut || (arr.length + 1),
        created_at: new Date().toISOString(),
      }
      arr.push(entry)
      await kvSet(kv, `speed_dial_${user.id}`, arr.slice(0, 20))
      return json({ ok: true, entry })
    }

    if (path.startsWith('/api/speed-dial/') && method === 'DELETE') {
      const sid = path.split('/')[3]
      const sd  = await kvGet(kv, `speed_dial_${user.id}`, [])
      const arr = Array.isArray(sd) ? sd : []
      await kvSet(kv, `speed_dial_${user.id}`, arr.filter(e => e.id !== sid))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // PIN VAULT
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/vault' && method === 'GET') {
      const pin = url.searchParams.get('pin') || ''
      if (!pin) return json({ error: 'PIN required' }, 400)
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (freshUser.pin_vault_hash && !(await checkPassword(pin, freshUser.pin_vault_hash)))
        return json({ error: 'Invalid PIN' }, 401)
      const vault = await kvGet(kv, `vault_${user.id}`, [])
      return json({ entries: Array.isArray(vault) ? vault : [] })
    }

    if (path === '/api/vault' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (freshUser.pin_vault_hash && !(await checkPassword(body.pin || '', freshUser.pin_vault_hash)))
        return json({ error: 'Invalid PIN' }, 401)
      const vault = await kvGet(kv, `vault_${user.id}`, [])
      const arr   = Array.isArray(vault) ? vault : []
      const entry = {
        id: uuid(),
        label: body.label || '',
        service: body.service || '',
        phone: body.phone || '',
        otp: body.otp || '',
        note: body.note || '',
        created_at: new Date().toISOString(),
      }
      arr.unshift(entry)
      await kvSet(kv, `vault_${user.id}`, arr.slice(0, 500))
      return json({ ok: true, entry })
    }

    if (path === '/api/vault/set-pin' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      if (!body.pin || String(body.pin).length < 4) return json({ error: 'PIN must be at least 4 digits' }, 400)
      const users2 = await kvGet(kv, 'users', [])
      const arr2   = Array.isArray(users2) ? users2 : []
      const uidx   = arr2.findIndex(u => u.id === user.id)
      if (uidx !== -1) {
        arr2[uidx].pin_vault_hash = await hashPassword(String(body.pin))
        await kvSet(kv, 'users', arr2)
      }
      return json({ ok: true })
    }

    if (path.startsWith('/api/vault/') && method === 'DELETE') {
      const vid  = path.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (freshUser.pin_vault_hash && !(await checkPassword(body.pin || '', freshUser.pin_vault_hash)))
        return json({ error: 'Invalid PIN' }, 401)
      const vault = await kvGet(kv, `vault_${user.id}`, [])
      const arr   = Array.isArray(vault) ? vault : []
      await kvSet(kv, `vault_${user.id}`, arr.filter(e => e.id !== vid))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/analytics' && method === 'GET') {
      const msgs    = await kvGet(kv, `sms_${user.id}`, [])
      const nums    = await kvGet(kv, `numbers_${user.id}`, [])
      const msgArr  = Array.isArray(msgs) ? msgs : []
      const numArr  = Array.isArray(nums) ? nums : []
      const now     = Date.now()

      const smsPerDay = {}
      for (let i = 29; i >= 0; i--) {
        const d   = new Date(now - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        smsPerDay[key] = 0
      }
      for (const m of msgArr) {
        const d = (m.received_at || '').slice(0, 10)
        if (d in smsPerDay) smsPerDay[d]++
      }

      const svcCount = {}
      for (const m of msgArr) {
        const s = m.service || 'Unknown'
        svcCount[s] = (svcCount[s] || 0) + 1
      }
      const topServices = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count }))

      const countryCount = {}
      for (const n of numArr) {
        const c = n.country || 'US'
        countryCount[c] = (countryCount[c] || 0) + (n.sms_count || 0)
      }
      const topCountries = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([country, sms]) => ({ country, sms }))

      const otpMsgs = msgArr.filter(m => m.otp)
      const last24h = msgArr.filter(m => new Date(m.received_at).getTime() > now - 86400000)
      const last7d  = msgArr.filter(m => new Date(m.received_at).getTime() > now - 7 * 86400000)
      const last30d = msgArr.filter(m => new Date(m.received_at).getTime() > now - 30 * 86400000)

      const hourly = Array(24).fill(0)
      for (const m of msgArr.slice(0, 1000)) {
        try { hourly[new Date(m.received_at).getHours()]++ } catch {}
      }

      // Weekly heatmap (last 7 days × 24 hours)
      const heatmap = Array(7).fill(null).map(() => Array(24).fill(0))
      for (const m of last7d) {
        try {
          const d = new Date(m.received_at)
          heatmap[d.getDay()][d.getHours()]++
        } catch {}
      }

      // OTP services breakdown
      const otpSvcCount = {}
      for (const m of otpMsgs) {
        const s = m.service || 'Unknown'
        otpSvcCount[s] = (otpSvcCount[s] || 0) + 1
      }
      const otpByService = Object.entries(otpSvcCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))

      return json({
        totals: {
          numbers: numArr.length,
          active: numArr.filter(n => n.status === 'active').length,
          sms: msgArr.length,
          otps: otpMsgs.length,
          last24h: last24h.length,
          last7d: last7d.length,
          last30d: last30d.length,
          starred: msgArr.filter(m => m.starred).length,
        },
        smsPerDay: Object.entries(smsPerDay).map(([date, count]) => ({ date, count })),
        topServices,
        topCountries,
        hourlyDistribution: hourly.map((count, hour) => ({ hour, count })),
        weeklyHeatmap: heatmap,
        otpByService,
        otpRate: msgArr.length > 0 ? Math.round(otpMsgs.length / msgArr.length * 100) : 0,
        avgDailyOtps: last30d.length > 0 ? Math.round(last30d.filter(m => m.otp).length / 30) : 0,
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/notifications' && method === 'GET') {
      const notifs = await kvGet(kv, `notifs_${user.id}`, [])
      const arr    = Array.isArray(notifs) ? notifs : []
      const unread = arr.filter(n => !n.read).length
      return json({ notifications: arr, unread })
    }

    if (path === '/api/notifications' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      await pushNotif(kv, user.id, body.type || 'info', body.title || 'Notification', body.message || '', body.meta || {})
      return json({ ok: true })
    }

    if (path === '/api/notifications/read' && method === 'POST') {
      const body   = await request.json().catch(() => ({}))
      const notifs = await kvGet(kv, `notifs_${user.id}`, [])
      const arr    = Array.isArray(notifs) ? notifs : []
      if (body.id) {
        const n = arr.find(n => n.id === body.id)
        if (n) n.read = true
      } else if (body.readAll) {
        arr.forEach(n => n.read = true)
      }
      await kvSet(kv, `notifs_${user.id}`, arr)
      return json({ ok: true })
    }

    if (path === '/api/notifications' && method === 'DELETE') {
      const body = await request.json().catch(() => ({}))
      if (body.id) {
        const notifs = await kvGet(kv, `notifs_${user.id}`, [])
        const arr    = Array.isArray(notifs) ? notifs : []
        await kvSet(kv, `notifs_${user.id}`, arr.filter(n => n.id !== body.id))
      } else {
        await kvSet(kv, `notifs_${user.id}`, [])
      }
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // BULK SMS SEND
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/bulk/send' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { numbers: targets, message, channel } = body
      if (!targets || !Array.isArray(targets) || targets.length === 0)
        return json({ error: 'targets array required' }, 400)
      if (!message) return json({ error: 'message required' }, 400)

      const results = []
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user

      if (channel === 'telegram') {
        if (!freshUser.telegram_bot_token) return json({ error: 'Telegram not configured' }, 400)
        for (const num of targets.slice(0, 50)) {
          try {
            const r = await fetch(`https://api.telegram.org/bot${freshUser.telegram_bot_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: freshUser.telegram_chat_id, text: `📨 To: ${num}\n\n${message}` }),
            })
            const d = await r.json()
            results.push({ number: num, ok: d.ok, error: d.description || null })
          } catch (e) {
            results.push({ number: num, ok: false, error: e.message })
          }
        }
      } else {
        for (const num of targets.slice(0, 200)) {
          results.push({ number: num, ok: true, simulated: true })
        }
      }

      const bulkHistory = await kvGet(kv, `bulk_history_${user.id}`, [])
      const bulkArr     = Array.isArray(bulkHistory) ? bulkHistory : []
      const record = {
        id: uuid(),
        ts: new Date().toISOString(),
        count: targets.length,
        channel: channel || 'simulated',
        success: results.filter(r => r.ok).length,
        message: message.slice(0, 200),
        targets: targets.slice(0, 10),
      }
      bulkArr.unshift(record)
      await kvSet(kv, `bulk_history_${user.id}`, bulkArr.slice(0, 200))

      await pushNotif(kv, user.id, 'bulk', '📨 Bulk Send Complete', `${record.success}/${targets.length} sent via ${channel || 'simulated'}`)

      return json({ ok: true, results, sent: record.success, record })
    }

    if (path === '/api/bulk/history' && method === 'GET') {
      const history = await kvGet(kv, `bulk_history_${user.id}`, [])
      return json({ history: Array.isArray(history) ? history : [] })
    }

    // ══════════════════════════════════════════════════════════════════
    // OTP MONITOR
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/otp/latest' && method === 'GET') {
      const limit   = Math.min(100, parseInt(url.searchParams.get('limit') || '20'))
      const service = url.searchParams.get('service') || ''
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      let otps = msgs.filter(m => m.otp)
      if (service) otps = otps.filter(m => m.service === service)
      return json({ otps: otps.slice(0, limit), total: otps.length })
    }

    if (path === '/api/otp/watch' && method === 'GET') {
      const service  = url.searchParams.get('service')  || ''
      const numberId = url.searchParams.get('numberId') || ''
      const since    = url.searchParams.get('since')    || new Date(Date.now() - 5 * 60000).toISOString()
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const sinceMs = new Date(since).getTime()
      let otps = msgs.filter(m => m.otp && new Date(m.received_at).getTime() > sinceMs)
      if (service)  otps = otps.filter(m => m.service === service)
      if (numberId) otps = otps.filter(m => m.number_id === numberId)
      return json({ otps, found: otps.length > 0, latest: otps[0] || null })
    }

    // ══════════════════════════════════════════════════════════════════
    // API KEYS
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/apikeys' && method === 'GET') {
      return json({ key: user.api_key || '', note: 'Use X-API-Key header or Bearer token to authenticate' })
    }

    if (path === '/api/apikeys/regenerate' && method === 'POST') {
      const users2 = await kvGet(kv, 'users', [])
      const arr2   = Array.isArray(users2) ? users2 : []
      const idx2   = arr2.findIndex(u => u.id === user.id)
      if (idx2 !== -1) {
        arr2[idx2].api_key = 'dlk_' + uuid().replace(/-/g, '')
        await kvSet(kv, 'users', arr2)
        return json({ ok: true, key: arr2[idx2].api_key })
      }
      return json({ error: 'User not found' }, 404)
    }

    // ══════════════════════════════════════════════════════════════════
    // EXPORT
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/export/sms' && method === 'GET') {
      const fmt  = url.searchParams.get('format') || 'json'
      let msgs   = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []

      if (fmt === 'csv') {
        const header = 'id,phone_number,sender,service,otp,body,received_at,starred\n'
        const rows   = msgs.map(m =>
          `"${m.id}","${m.phone_number}","${m.sender}","${m.service}","${m.otp || ''}","${(m.body || '').replace(/"/g, '""')}","${m.received_at}","${m.starred ? 'yes' : ''}"`
        ).join('\n')
        return new Response(header + rows, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="dl-sms-export-${Date.now()}.csv"`,
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      if (fmt === 'txt') {
        const lines = msgs.map(m => `[${m.received_at}] ${m.phone_number} | ${m.sender} | ${m.service} | OTP: ${m.otp || 'N/A'}\n${m.body}\n${'─'.repeat(60)}`).join('\n')
        return new Response(lines, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="dl-sms-export-${Date.now()}.txt"`,
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      return json({ messages: msgs, exported: msgs.length, timestamp: new Date().toISOString() })
    }

    if (path === '/api/export/numbers' && method === 'GET') {
      const fmt  = url.searchParams.get('format') || 'json'
      let nums   = await kvGet(kv, `numbers_${user.id}`, [])
      if (!Array.isArray(nums)) nums = []

      if (fmt === 'csv') {
        const header = 'id,phone,country,country_name,status,sms_count,last_received\n'
        const rows   = nums.map(n =>
          `"${n.id}","${n.phone}","${n.country}","${n.country_name || ''}","${n.status}","${n.sms_count || 0}","${n.last_received || ''}"`
        ).join('\n')
        return new Response(header + rows, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="dl-numbers-export-${Date.now()}.csv"`,
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      return json({ numbers: nums, exported: nums.length, timestamp: new Date().toISOString() })
    }

    if (path === '/api/export/otps' && method === 'GET') {
      const fmt  = url.searchParams.get('format') || 'json'
      let msgs   = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const otps = msgs.filter(m => m.otp)

      if (fmt === 'csv') {
        const header = 'id,phone_number,sender,service,otp,body,received_at\n'
        const rows   = otps.map(m =>
          `"${m.id}","${m.phone_number}","${m.sender}","${m.service}","${m.otp}","${(m.body || '').replace(/"/g, '""')}","${m.received_at}"`
        ).join('\n')
        return new Response(header + rows, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="dl-otps-export-${Date.now()}.csv"`,
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      return json({ otps, exported: otps.length, timestamp: new Date().toISOString() })
    }

    // ══════════════════════════════════════════════════════════════════
    // ACTIVITY LOG
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/activity' && method === 'GET') {
      const activity = await kvGet(kv, `activity_${user.id}`, [])
      return json({ activity: Array.isArray(activity) ? activity : [] })
    }

    if (path === '/api/activity' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const activity = await kvGet(kv, `activity_${user.id}`, [])
      const arr      = Array.isArray(activity) ? activity : []
      arr.unshift({ id: uuid(), type: body.type || 'action', description: body.description || '', ts: new Date().toISOString(), ip: request.headers.get('CF-Connecting-IP') || 'unknown' })
      await kvSet(kv, `activity_${user.id}`, arr.slice(0, 500))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // TAGS
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/tags' && method === 'GET') {
      const tags = await kvGet(kv, `tags_${user.id}`, [])
      return json({ tags: Array.isArray(tags) ? tags : [] })
    }

    if (path === '/api/tags' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const tags = await kvGet(kv, `tags_${user.id}`, [])
      const arr  = Array.isArray(tags) ? tags : []
      const tag  = { id: uuid(), name: body.name || 'Tag', color: body.color || '#e50914', created_at: new Date().toISOString() }
      arr.push(tag)
      await kvSet(kv, `tags_${user.id}`, arr)
      return json({ ok: true, tag })
    }

    if (path.startsWith('/api/tags/') && method === 'DELETE') {
      const tid  = path.split('/')[3]
      const tags = await kvGet(kv, `tags_${user.id}`, [])
      const arr  = Array.isArray(tags) ? tags : []
      await kvSet(kv, `tags_${user.id}`, arr.filter(t => t.id !== tid))
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // PHONE LOOKUP
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/lookup' && method === 'GET') {
      const phone = url.searchParams.get('phone') || ''
      if (!phone) return json({ error: 'phone parameter required' }, 400)
      const msgs   = await kvGet(kv, `sms_${user.id}`, [])
      const arr    = Array.isArray(msgs) ? msgs : []
      const related = arr.filter(m => m.phone_number === phone || m.sender === phone)
      const nums   = await kvGet(kv, `numbers_${user.id}`, [])
      const numArr = Array.isArray(nums) ? nums : []
      const numInfo = numArr.find(n => n.phone === phone) || null
      return json({
        phone,
        number: numInfo,
        country: numInfo ? numInfo.country : detectCountry(phone),
        smsCount: related.length,
        otpCount: related.filter(m => m.otp).length,
        recentSMS: related.slice(0, 10),
        services: [...new Set(related.map(m => m.service))],
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // SETTINGS
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/settings' && method === 'GET') {
      return json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          ivasms_email: user.ivasms_email || '',
          ivasms_password: '',
          telegram_bot_token: user.telegram_bot_token || '',
          telegram_chat_id: user.telegram_chat_id || '',
          mobile_token: user.mobile_token || '',
          api_key: user.api_key || '',
          has_whatsapp: user.has_whatsapp || 0,
          whatsapp_number: user.whatsapp_number || '',
          auto_sync: user.auto_sync || false,
          auto_sync_interval: user.auto_sync_interval || 300,
          notify_otp: user.notify_otp !== false,
          notify_sms: user.notify_sms || false,
          notify_sync: user.notify_sync !== false,
          theme: user.theme || 'dark',
          webhook_url: user.webhook_url || '',
          webhook_events: user.webhook_events || [],
          has_pin_vault: !!user.pin_vault_hash,
          last_sync: user.last_sync || null,
          sync_count: user.sync_count || 0,
          created_at: user.created_at || '',
        }
      })
    }

    if (path === '/api/settings' && method === 'PATCH') {
      const body = await request.json().catch(() => ({}))

      let users = await kvGet(kv, 'users', [])
      if (!Array.isArray(users)) users = []

      let idx = users.findIndex(u => u.id === user.id)
      if (idx === -1) { users.push({ ...user }); idx = users.length - 1 }

      if (body.type === 'profile') {
        if (body.name  && String(body.name).trim())  users[idx].name  = String(body.name).trim()
        if (body.email && String(body.email).trim()) users[idx].email = String(body.email).toLowerCase().trim()
        if (body.theme)                              users[idx].theme = body.theme

      } else if (body.type === 'ivasms') {
        users[idx].ivasms_email    = String(body.email    || '').trim()
        users[idx].ivasms_password = String(body.password || '').trim()

      } else if (body.type === 'telegram') {
        users[idx].telegram_bot_token = String(body.botToken || '')
        users[idx].telegram_chat_id   = String(body.chatId   || '')

      } else if (body.type === 'password') {
        if (!body.new || String(body.new).length < 6)
          return json({ error: 'New password must be at least 6 characters' }, 400)
        if (!(await checkPassword(String(body.old || ''), users[idx].password_hash)))
          return json({ error: 'Current password is incorrect' }, 400)
        users[idx].password_hash = await hashPassword(String(body.new))

      } else if (body.type === 'regenerate_token') {
        users[idx].mobile_token = 'dl_' + uuid().replace(/-/g, '')

      } else if (body.type === 'preferences') {
        if (body.auto_sync          !== undefined) users[idx].auto_sync          = !!body.auto_sync
        if (body.auto_sync_interval !== undefined) users[idx].auto_sync_interval = Number(body.auto_sync_interval) || 300
        if (body.notify_otp         !== undefined) users[idx].notify_otp         = !!body.notify_otp
        if (body.notify_sms         !== undefined) users[idx].notify_sms         = !!body.notify_sms
        if (body.notify_sync        !== undefined) users[idx].notify_sync        = !!body.notify_sync
        if (body.theme)                            users[idx].theme              = body.theme

      } else if (body.type === 'webhook') {
        users[idx].webhook_url    = body.url    || ''
        users[idx].webhook_events = body.events || []

      } else {
        return json({ error: 'Unknown settings type: ' + body.type }, 400)
      }

      await kvSet(kv, 'users', users)
      const u = users[idx]
      return json({
        ok: true,
        user: {
          id: u.id, name: u.name, email: u.email,
          ivasms_email: u.ivasms_email || '',
          telegram_bot_token: u.telegram_bot_token || '',
          telegram_chat_id: u.telegram_chat_id || '',
          mobile_token: u.mobile_token || '',
          api_key: u.api_key || '',
          has_whatsapp: u.has_whatsapp || 0,
          whatsapp_number: u.whatsapp_number || '',
          auto_sync: u.auto_sync || false,
          auto_sync_interval: u.auto_sync_interval || 300,
          notify_otp: u.notify_otp !== false,
          notify_sms: u.notify_sms || false,
          notify_sync: u.notify_sync !== false,
          theme: u.theme || 'dark',
          webhook_url: u.webhook_url || '',
          webhook_events: u.webhook_events || [],
          last_sync: u.last_sync || null,
          sync_count: u.sync_count || 0,
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // MOBILE TOKEN
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/mobile/token' && method === 'GET') {
      const tokenParam = url.searchParams.get('token')
      if (tokenParam) {
        const users2 = await kvGet(kv, 'users', [])
        const arr2   = Array.isArray(users2) ? users2 : []
        const found  = arr2.find(u => u.mobile_token === tokenParam)
        if (!found) return json({ error: 'Invalid token' }, 401)
        return json({ ok: true, user: { id: found.id, name: found.name, email: found.email } })
      }
      return json({ token: user.mobile_token || '', url: url.origin })
    }

    // ══════════════════════════════════════════════════════════════════
    // VERIFICATION
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/verification' && method === 'GET') {
      const sessions = await kvGet(kv, `sessions_${user.id}`, [])
      return json({ sessions: Array.isArray(sessions) ? sessions : [] })
    }

    if (path === '/api/verification' && method === 'POST') {
      const body    = await request.json().catch(() => ({}))
      const numbers = await kvGet(kv, `numbers_${user.id}`, [])
      const num     = Array.isArray(numbers) ? numbers.find(n => n.id === body.numberId) : null

      const session = {
        id: uuid(),
        user_id: user.id,
        number_id: body.numberId || '',
        phone_number: num?.phone || body.phone || '',
        service: body.service || 'Unknown',
        status: 'waiting',
        otp: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }

      const sessions = await kvGet(kv, `sessions_${user.id}`, [])
      const arr      = Array.isArray(sessions) ? sessions : []
      arr.unshift(session)
      await kvSet(kv, `sessions_${user.id}`, arr.slice(0, 100))

      const msgs    = await kvGet(kv, `sms_${user.id}`, [])
      const msgArr  = Array.isArray(msgs) ? msgs : []
      const recent  = msgArr.find(m =>
        m.number_id === session.number_id && m.otp &&
        new Date(m.received_at) > new Date(Date.now() - 5 * 60 * 1000)
      )
      if (recent) { session.otp = recent.otp; session.status = 'received' }

      return json({ session })
    }

    if (path === '/api/verification' && method === 'PATCH') {
      const body     = await request.json().catch(() => ({}))
      const sessions = await kvGet(kv, `sessions_${user.id}`, [])
      const arr      = Array.isArray(sessions) ? sessions : []
      const sess     = arr.find(s => s.id === body.sessionId)
      if (!sess) return json({ error: 'Session not found' }, 404)

      const msgs    = await kvGet(kv, `sms_${user.id}`, [])
      const msgArr  = Array.isArray(msgs) ? msgs : []
      const recent  = msgArr.find(m =>
        m.number_id === sess.number_id && m.otp &&
        new Date(m.received_at) > new Date(sess.created_at)
      )
      if (recent && !sess.otp) {
        sess.otp    = recent.otp
        sess.status = 'received'
        await kvSet(kv, `sessions_${user.id}`, arr)
      }
      return json({ session: sess })
    }

    // ══════════════════════════════════════════════════════════════════
    // TELEGRAM
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/telegram/setup' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      if (!body.botToken) return json({ error: 'Bot token required' }, 400)
      try {
        const r = await fetch(`https://api.telegram.org/bot${body.botToken}/getMe`)
        const d = await r.json()
        if (!d.ok) return json({ error: 'Invalid bot token: ' + (d.description || 'Unknown') }, 400)

        const users = await kvGet(kv, 'users', [])
        const arr   = Array.isArray(users) ? users : []
        let idx     = arr.findIndex(u => u.id === user.id)
        if (idx === -1) { arr.push({ ...user }); idx = arr.length - 1 }
        arr[idx].telegram_bot_token = body.botToken
        arr[idx].telegram_chat_id   = body.chatId || ''
        await kvSet(kv, 'users', arr)
        return json({ ok: true, bot: { username: d.result.username, first_name: d.result.first_name } })
      } catch {
        return json({ error: 'Failed to validate bot token' }, 500)
      }
    }

    if (path === '/api/telegram/test' && method === 'POST') {
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (!freshUser.telegram_bot_token || !freshUser.telegram_chat_id)
        return json({ error: 'Telegram not configured. Set bot token and chat ID in Settings.' }, 400)
      try {
        const r = await fetch(`https://api.telegram.org/bot${freshUser.telegram_bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: freshUser.telegram_chat_id,
            text: '💀 *DL SMS Client* — Test message\n\n✅ Telegram bot is working!\n\nOTP notifications are *enabled*.\n\n_Team Death Legion_',
            parse_mode: 'Markdown',
          }),
        })
        const d = await r.json()
        if (!d.ok) return json({ error: d.description || 'Send failed' }, 400)
        return json({ ok: true })
      } catch {
        return json({ error: 'Failed to send message' }, 500)
      }
    }

    if (path === '/api/telegram/notify' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (!freshUser.telegram_bot_token || !freshUser.telegram_chat_id)
        return json({ error: 'Telegram not configured' }, 400)
      try {
        await sendTelegramNotification(freshUser, body.message || 'DL SMS Client notification')
        return json({ ok: true })
      } catch {
        return json({ error: 'Failed to send' }, 500)
      }
    }

    // Get Telegram updates (to find chat_id)
    if (path === '/api/telegram/updates' && method === 'GET') {
      const freshUsers = await kvGet(kv, 'users', [])
      const freshUser  = (Array.isArray(freshUsers) ? freshUsers : []).find(u => u.id === user.id) || user
      if (!freshUser.telegram_bot_token) return json({ error: 'Bot token not set' }, 400)
      try {
        const r = await fetch(`https://api.telegram.org/bot${freshUser.telegram_bot_token}/getUpdates?limit=10`)
        const d = await r.json()
        if (!d.ok) return json({ error: d.description || 'Failed to get updates' }, 400)
        const updates = (d.result || []).map(u => ({
          id: u.update_id,
          chatId: u.message?.chat?.id || u.channel_post?.chat?.id || null,
          from: u.message?.from?.username || u.message?.from?.first_name || 'Unknown',
          text: u.message?.text || '',
          date: u.message?.date ? new Date(u.message.date * 1000).toISOString() : null,
        }))
        return json({ ok: true, updates })
      } catch (e) {
        return json({ error: e.message }, 500)
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // WHATSAPP
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/whatsapp/status' && method === 'GET') {
      const waData = await kvGet(kv, `whatsapp_${user.id}`, null)
      return json({
        connected: user.has_whatsapp === 1,
        number: user.whatsapp_number || null,
        status: user.has_whatsapp ? 'connected' : 'disconnected',
        data: waData,
        linkedAt: waData?.linkedAt || null,
      })
    }

    if (path === '/api/whatsapp/link' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { numberId, numberPhone } = body
      if (!numberId) return json({ error: 'numberId required' }, 400)

      const nums   = await kvGet(kv, `numbers_${user.id}`, [])
      const numArr = Array.isArray(nums) ? nums : []
      const num    = numArr.find(n => n.id === numberId)
      if (!num) return json({ error: 'Number not found' }, 404)

      const idx = numArr.findIndex(n => n.id === numberId)
      numArr[idx].whatsapp_created   = 1
      numArr[idx].whatsapp_linked_at = new Date().toISOString()
      await kvSet(kv, `numbers_${user.id}`, numArr)

      const users2 = await kvGet(kv, 'users', [])
      const arr2   = Array.isArray(users2) ? users2 : []
      const uidx   = arr2.findIndex(u => u.id === user.id)
      if (uidx !== -1) {
        arr2[uidx].has_whatsapp    = 1
        arr2[uidx].whatsapp_number = num.phone
        await kvSet(kv, 'users', arr2)
      }

      const waToken = 'WA_' + uuid().replace(/-/g, '').toUpperCase().slice(0, 20)
      const waData  = {
        token: waToken,
        phone: num.phone,
        numberId: num.id,
        linkedAt: new Date().toISOString(),
        status: 'active',
        country: num.country,
      }
      await kvSet(kv, `whatsapp_${user.id}`, waData)

      await pushNotif(kv, user.id, 'whatsapp', '📱 WhatsApp Linked', `Number ${num.phone} linked to WhatsApp`)

      return json({
        ok: true,
        token: waToken,
        phone: num.phone,
        data: waData,
        message: 'WhatsApp number linked successfully via DL SMS Client',
      })
    }

    if (path === '/api/whatsapp/unlink' && method === 'POST') {
      const users2 = await kvGet(kv, 'users', [])
      const arr2   = Array.isArray(users2) ? users2 : []
      const uidx   = arr2.findIndex(u => u.id === user.id)
      if (uidx !== -1) {
        arr2[uidx].has_whatsapp    = 0
        arr2[uidx].whatsapp_number = ''
        await kvSet(kv, 'users', arr2)
      }
      await kvSet(kv, `whatsapp_${user.id}`, null)

      const nums2   = await kvGet(kv, `numbers_${user.id}`, [])
      const numArr2 = Array.isArray(nums2) ? nums2 : []
      numArr2.forEach(n => { n.whatsapp_created = 0 })
      await kvSet(kv, `numbers_${user.id}`, numArr2)

      return json({ ok: true, message: 'WhatsApp unlinked' })
    }

    if (path === '/api/whatsapp/messages' && method === 'GET') {
      const waData = await kvGet(kv, `whatsapp_${user.id}`, null)
      if (!waData) return json({ messages: [], phone: null })
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const waMsgs = msgs.filter(m => m.phone_number === waData.phone).slice(0, 50)
      // Also include outbox
      const outbox = await kvGet(kv, `wa_outbox_${user.id}`, [])
      return json({ messages: waMsgs, outbox: Array.isArray(outbox) ? outbox.slice(0, 30) : [], phone: waData.phone })
    }

    if (path === '/api/whatsapp/send' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      if (!user.has_whatsapp) return json({ error: 'WhatsApp not linked. Link a number first.' }, 400)
      const outbox = await kvGet(kv, `wa_outbox_${user.id}`, [])
      const arr    = Array.isArray(outbox) ? outbox : []
      const msg    = {
        id: uuid(),
        to: body.to || '',
        body: body.message || '',
        sent_at: new Date().toISOString(),
        status: 'sent',
        simulated: true,
      }
      arr.unshift(msg)
      await kvSet(kv, `wa_outbox_${user.id}`, arr.slice(0, 500))
      return json({ ok: true, message: msg })
    }

    if (path === '/api/whatsapp/chats' && method === 'GET') {
      const waData = await kvGet(kv, `whatsapp_${user.id}`, null)
      if (!waData) return json({ chats: [] })
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const waMsgs = msgs.filter(m => m.phone_number === waData.phone)
      // Group by sender
      const chatMap = {}
      for (const m of waMsgs) {
        const s = m.sender
        if (!chatMap[s]) chatMap[s] = { name: s, lastMsg: m.body, lastTs: m.received_at, count: 0, unread: 0 }
        chatMap[s].count++
        if (!m.read_wa) chatMap[s].unread++
        if (m.received_at > chatMap[s].lastTs) { chatMap[s].lastMsg = m.body; chatMap[s].lastTs = m.received_at }
      }
      return json({ chats: Object.values(chatMap).sort((a, b) => b.lastTs.localeCompare(a.lastTs)) })
    }

    // ══════════════════════════════════════════════════════════════════
    // HEARTBEAT / ALWAYS-CONNECTED (1s polling endpoint)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/heartbeat' && method === 'GET') {
      const since = url.searchParams.get('since') || ''
      const [nums, msgs, notifs, syncHist] = await Promise.all([
        kvGet(kv, `numbers_${user.id}`, []),
        kvGet(kv, `sms_${user.id}`,     []),
        kvGet(kv, `notifs_${user.id}`,  []),
        kvGet(kv, `sync_history_${user.id}`, []),
      ])
      const numArr  = Array.isArray(nums)  ? nums  : []
      const msgArr  = Array.isArray(msgs)  ? msgs  : []
      const notArr  = Array.isArray(notifs) ? notifs : []
      const histArr = Array.isArray(syncHist) ? syncHist : []
      const now     = Date.now()

      let newMsgs = []
      if (since) {
        const sinceMs = new Date(since).getTime()
        if (!isNaN(sinceMs)) newMsgs = msgArr.filter(m => new Date(m.received_at).getTime() > sinceMs)
      }

      const freshUsers2 = await kvGet(kv, 'users', [])
      const freshUser2  = (Array.isArray(freshUsers2) ? freshUsers2 : []).find(u => u.id === user.id) || user

      return json({
        ts:          new Date().toISOString(),
        connected:   true,
        numbers:     numArr.length,
        active:      numArr.filter(n => { const l = n.last_received ? new Date(n.last_received).getTime() : 0; return l ? (now - l) / 3600000 < 24 : n.status === 'active' }).length,
        sms:         msgArr.length,
        otps:        msgArr.filter(m => m.otp).length,
        unreadNotif: notArr.filter(n => !n.read).length,
        newMsgs,
        newCount:    newMsgs.length,
        lastSync:    histArr[0]?.ts || null,
        autoSync:    freshUser2.auto_sync || false,
        ivasOk:      !!(freshUser2.ivasms_email && freshUser2.ivasms_password),
        whatsapp:    freshUser2.has_whatsapp || 0,
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // MOBILE SMS RECEIVER (receives SMS from Android/iOS app)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/mobile/sms' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { token, sender, smsBody, body: bodyAlt } = body
      const msgBody = smsBody || bodyAlt || body.message || ''
      if (!token) return json({ error: 'token required' }, 400)
      const users2 = await kvGet(kv, 'users', [])
      const arr2   = Array.isArray(users2) ? users2 : []
      const owner  = arr2.find(u => u.mobile_token === token)
      if (!owner) return json({ error: 'Invalid token' }, 401)
      if (!msgBody) return json({ error: 'body required' }, 400)
      const SERVICE_PATS = [
        { p: /google|gmail|youtube/i, s: 'Google' }, { p: /whatsapp/i, s: 'WhatsApp' },
        { p: /telegram/i, s: 'Telegram' }, { p: /facebook|instagram/i, s: 'Facebook' },
        { p: /twitter|x\.com/i, s: 'Twitter' }, { p: /amazon/i, s: 'Amazon' },
        { p: /microsoft|outlook/i, s: 'Microsoft' }, { p: /apple|icloud/i, s: 'Apple' },
        { p: /paypal/i, s: 'PayPal' }, { p: /binance|crypto|bitcoin/i, s: 'Crypto' },
        { p: /netflix/i, s: 'Netflix' }, { p: /tiktok/i, s: 'TikTok' },
      ]
      let service = 'Unknown'
      for (const { p, s } of SERVICE_PATS) { if (p.test(msgBody) || p.test(sender || '')) { service = s; break } }
      const otpMatch = msgBody.match(/\b(\d{4,8})\b/)
      const otp = otpMatch ? otpMatch[1] : null
      const newMsg = {
        id: uuid(), user_id: owner.id,
        number_id: 'mobile', phone_number: body.phone || sender || 'mobile',
        sender: sender || 'Mobile', body: msgBody, otp, service,
        received_at: new Date().toISOString(), starred: false, tags: [], source: 'mobile',
      }
      const existingMsgs = await kvGet(kv, `sms_${owner.id}`, [])
      const existArr = Array.isArray(existingMsgs) ? existingMsgs : []
      existArr.unshift(newMsg)
      await kvSet(kv, `sms_${owner.id}`, existArr.slice(0, 5000))
      if (otp && owner.notify_otp !== false) {
        await pushNotif(kv, owner.id, 'otp', '🔑 Mobile OTP', `OTP ${otp} from ${service}`, { otp, service, phone: newMsg.phone_number })
        if (owner.telegram_bot_token && owner.telegram_chat_id) {
          await sendTelegramNotification(owner, `🔑 *Mobile OTP Received*\n\n📱 *From:* ${sender || 'Mobile'}\n🔐 *OTP:* \`${otp}\`\n🎯 *Service:* ${service}\n💬 ${msgBody.slice(0, 100)}\n\n_Team Death Legion_`)
        }
      }
      return json({ ok: true, message: newMsg })
    }

    // ══════════════════════════════════════════════════════════════════
    // WHATSAPP DEVICE REGISTRY
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/whatsapp/devices' && method === 'GET') {
      const devices = await kvGet(kv, `wa_devices_${user.id}`, [])
      return json({ devices: Array.isArray(devices) ? devices : [] })
    }

    if (path === '/api/whatsapp/devices' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const KNOWN_DEVICES = [
        { model: 'Samsung Galaxy S25 Ultra', os: 'Android 15', brand: 'Samsung', icon: '📱' },
        { model: 'Samsung Galaxy S25+',      os: 'Android 15', brand: 'Samsung', icon: '📱' },
        { model: 'Samsung Galaxy S24 Ultra', os: 'Android 14', brand: 'Samsung', icon: '📱' },
        { model: 'Samsung Galaxy Z Fold 6',  os: 'Android 14', brand: 'Samsung', icon: '📱' },
        { model: 'Google Pixel 9 Pro XL',    os: 'Android 15', brand: 'Google',  icon: '🔵' },
        { model: 'Google Pixel 9 Pro',       os: 'Android 15', brand: 'Google',  icon: '🔵' },
        { model: 'Google Pixel 9',           os: 'Android 15', brand: 'Google',  icon: '🔵' },
        { model: 'iPhone 16 Pro Max',        os: 'iOS 18',     brand: 'Apple',   icon: '🍎' },
        { model: 'iPhone 16 Pro',            os: 'iOS 18',     brand: 'Apple',   icon: '🍎' },
        { model: 'iPhone 16',                os: 'iOS 18',     brand: 'Apple',   icon: '🍎' },
        { model: 'OnePlus 13',               os: 'Android 15', brand: 'OnePlus', icon: '📲' },
        { model: 'Xiaomi 15 Ultra',          os: 'Android 15', brand: 'Xiaomi',  icon: '📲' },
        { model: 'Custom / Other',           os: 'Android/iOS','brand': 'Other', icon: '📲' },
      ]
      const preset = KNOWN_DEVICES.find(d => d.model === body.model)
      const device = {
        id: uuid(),
        name:       body.name       || preset?.model  || body.model || 'My Device',
        model:      body.model      || 'Unknown',
        brand:      body.brand      || preset?.brand  || 'Unknown',
        os:         body.os         || preset?.os     || 'Android',
        icon:       body.icon       || preset?.icon   || '📱',
        phone:      body.phone      || user.whatsapp_number || '',
        status:     'connected',
        batteryPct: body.batteryPct || null,
        lastSeen:   new Date().toISOString(),
        linkedAt:   new Date().toISOString(),
        ipAddress:  request.headers.get('CF-Connecting-IP') || 'unknown',
        country:    request.headers.get('CF-IPCountry') || 'unknown',
      }
      const devices = await kvGet(kv, `wa_devices_${user.id}`, [])
      const arr = Array.isArray(devices) ? devices : []
      arr.unshift(device)
      await kvSet(kv, `wa_devices_${user.id}`, arr.slice(0, 20))
      await pushNotif(kv, user.id, 'whatsapp', '📱 Device Connected', `${device.name} connected to WhatsApp`)
      return json({ ok: true, device })
    }

    if (path.startsWith('/api/whatsapp/devices/') && method === 'DELETE') {
      const did = path.split('/')[4]
      const devices = await kvGet(kv, `wa_devices_${user.id}`, [])
      const arr = Array.isArray(devices) ? devices : []
      await kvSet(kv, `wa_devices_${user.id}`, arr.filter(d => d.id !== did))
      return json({ ok: true })
    }

    if (path.startsWith('/api/whatsapp/devices/') && method === 'PATCH') {
      const did  = path.split('/')[4]
      const body = await request.json().catch(() => ({}))
      const devices = await kvGet(kv, `wa_devices_${user.id}`, [])
      const arr = Array.isArray(devices) ? devices : []
      const idx = arr.findIndex(d => d.id === did)
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...body, id: did, lastSeen: new Date().toISOString() }
        await kvSet(kv, `wa_devices_${user.id}`, arr)
      }
      return json({ ok: true, device: arr[idx] || null })
    }

    // WhatsApp QR/session code (simulated)
    if (path === '/api/whatsapp/qr' && method === 'GET') {
      const qrCode = 'DL-WA-' + uuid().replace(/-/g,'').toUpperCase().slice(0,24)
      const expiresAt = new Date(Date.now() + 60000).toISOString()
      await kvSet(kv, `wa_qr_${user.id}`, { code: qrCode, expiresAt })
      return json({ ok: true, qrCode, expiresAt, instructions: 'Open WhatsApp → Settings → Linked Devices → Link a device → scan QR' })
    }

    if (path === '/api/whatsapp/qr/confirm' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const saved = await kvGet(kv, `wa_qr_${user.id}`, null)
      if (!saved || saved.code !== body.code) return json({ error: 'Invalid or expired QR code' }, 400)
      await kvSet(kv, `wa_qr_${user.id}`, null)
      // Register device automatically
      const device = {
        id: uuid(), name: body.deviceName || 'My Phone',
        model: body.model || 'Unknown', brand: body.brand || 'Unknown',
        os: body.os || 'Android', icon: body.icon || '📱',
        phone: user.whatsapp_number || '', status: 'connected',
        lastSeen: new Date().toISOString(), linkedAt: new Date().toISOString(),
      }
      const devices = await kvGet(kv, `wa_devices_${user.id}`, [])
      const arr = Array.isArray(devices) ? devices : []
      arr.unshift(device)
      await kvSet(kv, `wa_devices_${user.id}`, arr.slice(0, 20))
      return json({ ok: true, device })
    }

    // WhatsApp broadcast
    if (path === '/api/whatsapp/broadcast' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { targets, message } = body
      if (!targets || !message) return json({ error: 'targets and message required' }, 400)
      const results = (targets || []).slice(0, 100).map((t: any) => ({ to: t, status: 'queued', ts: new Date().toISOString() }))
      const hist = await kvGet(kv, `wa_broadcast_${user.id}`, [])
      const hArr = Array.isArray(hist) ? hist : []
      hArr.unshift({ id: uuid(), ts: new Date().toISOString(), count: results.length, message: message.slice(0,200), results })
      await kvSet(kv, `wa_broadcast_${user.id}`, hArr.slice(0,100))
      return json({ ok: true, sent: results.length, results })
    }

    if (path === '/api/whatsapp/broadcast' && method === 'GET') {
      const hist = await kvGet(kv, `wa_broadcast_${user.id}`, [])
      return json({ history: Array.isArray(hist) ? hist : [] })
    }

    // WhatsApp stats
    if (path === '/api/whatsapp/stats' && method === 'GET') {
      const [devicesRaw, outboxRaw, msgsRaw] = await Promise.all([
        kvGet(kv, `wa_devices_${user.id}`, []),
        kvGet(kv, `wa_outbox_${user.id}`, []),
        kvGet(kv, `sms_${user.id}`, []),
      ])
      const devices = Array.isArray(devicesRaw) ? devicesRaw : []
      const outbox  = Array.isArray(outboxRaw)  ? outboxRaw  : []
      const msgs    = Array.isArray(msgsRaw)    ? msgsRaw    : []
      const waMsgs  = msgs.filter(m => m.phone_number === user.whatsapp_number)
      return json({
        connected:     user.has_whatsapp === 1,
        devices:       devices.length,
        activeDevices: devices.filter(d => d.status === 'connected').length,
        sent:          outbox.length,
        received:      waMsgs.length,
        otps:          waMsgs.filter(m => m.otp).length,
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // LIVE SMS STREAM (1s polling, returns only new since timestamp)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/stream/sms' && method === 'GET') {
      const since    = url.searchParams.get('since') || new Date(Date.now() - 5000).toISOString()
      const limit    = Math.min(50, parseInt(url.searchParams.get('limit') || '10'))
      let msgs       = await kvGet(kv, `sms_${user.id}`, [])
      if (!Array.isArray(msgs)) msgs = []
      const sinceMs  = new Date(since).getTime()
      const newMsgs  = isNaN(sinceMs) ? msgs.slice(0, limit) : msgs.filter(m => new Date(m.received_at).getTime() > sinceMs).slice(0, limit)
      const numbers  = await kvGet(kv, `numbers_${user.id}`, [])
      const numArr   = Array.isArray(numbers) ? numbers : []
      return json({
        messages:      newMsgs,
        count:         newMsgs.length,
        total:         msgs.length,
        activeNumbers: numArr.filter(n => n.status === 'active').length,
        ts:            new Date().toISOString(),
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // NUMBER NOTES
    // ══════════════════════════════════════════════════════════════════
    if (path.startsWith('/api/numbers/') && path.endsWith('/note') && method === 'POST') {
      const numId  = path.split('/')[3]
      const body   = await request.json().catch(() => ({}))
      const nums   = await kvGet(kv, `numbers_${user.id}`, [])
      const numArr = Array.isArray(nums) ? nums : []
      const idx    = numArr.findIndex(n => n.id === numId)
      if (idx !== -1) { numArr[idx].note = body.note || ''; await kvSet(kv, `numbers_${user.id}`, numArr) }
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // SMS STATS (per-number quick stat)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/sms/stats' && method === 'GET') {
      const msgs   = await kvGet(kv, `sms_${user.id}`, [])
      const arr    = Array.isArray(msgs) ? msgs : []
      const now    = Date.now()
      const perSvc: Record<string, number> = {}
      for (const m of arr) perSvc[m.service || 'Unknown'] = (perSvc[m.service || 'Unknown'] || 0) + 1
      return json({
        total:    arr.length,
        withOtp:  arr.filter(m => m.otp).length,
        last1h:   arr.filter(m => (now - new Date(m.received_at).getTime()) < 3600000).length,
        last24h:  arr.filter(m => (now - new Date(m.received_at).getTime()) < 86400000).length,
        starred:  arr.filter(m => m.starred).length,
        perService: Object.entries(perSvc).sort((a,b) => b[1]-a[1]).slice(0,10).map(([s,c]) => ({ service: s, count: c })),
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // AUTO-SYNC TRIGGER (called by client-side timer)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/ivasms/auto-sync' && method === 'POST') {
      const freshUsers3  = await kvGet(kv, 'users', [])
      const freshUser3   = (Array.isArray(freshUsers3) ? freshUsers3 : []).find(u => u.id === user.id) || user
      if (!freshUser3.auto_sync) return json({ skipped: true, reason: 'auto_sync disabled' })
      if (!freshUser3.ivasms_email || !freshUser3.ivasms_password) return json({ skipped: true, reason: 'no credentials' })
      const lastSync = freshUser3.last_sync ? new Date(freshUser3.last_sync).getTime() : 0
      const interval  = (freshUser3.auto_sync_interval || 300) * 1000
      if (Date.now() - lastSync < interval) return json({ skipped: true, reason: 'too_soon', nextIn: Math.round((interval - (Date.now() - lastSync)) / 1000) })
      try {
        const result = await scrapeIVASMS(freshUser3.ivasms_email, freshUser3.ivasms_password, freshUser3.id, kv)
        const users4 = await kvGet(kv, 'users', [])
        const arr4   = Array.isArray(users4) ? users4 : []
        const idx4   = arr4.findIndex(u => u.id === user.id)
        if (idx4 !== -1) { arr4[idx4].last_sync = new Date().toISOString(); arr4[idx4].sync_count = (arr4[idx4].sync_count || 0) + 1; await kvSet(kv, 'users', arr4) }
        if (result.smsAdded > 0) {
          const msgs5 = await kvGet(kv, `sms_${user.id}`, [])
          const otps5 = (Array.isArray(msgs5) ? msgs5 : []).slice(0, result.smsAdded).filter((m: any) => m.otp)
          for (const msg of otps5.slice(0, 3)) {
            await pushNotif(kv, user.id, 'otp', '🔑 Auto OTP', `OTP ${msg.otp} from ${msg.service}`, { otp: msg.otp, service: msg.service })
            if (freshUser3.telegram_bot_token && freshUser3.notify_otp !== false) {
              await sendTelegramNotification(freshUser3, `🔑 *Auto-Sync OTP*\n\n📱 *Number:* \`${msg.phone_number}\`\n🔐 *OTP:* \`${msg.otp}\`\n🎯 *Service:* ${msg.service}\n\n_Team Death Legion_`)
            }
          }
        }
        const syncHist6 = await kvGet(kv, `sync_history_${user.id}`, [])
        const h6        = Array.isArray(syncHist6) ? syncHist6 : []
        h6.unshift({ id: uuid(), ts: new Date().toISOString(), ...result, auto: true })
        await kvSet(kv, `sync_history_${user.id}`, h6.slice(0, 100))
        return json({ ...result, auto: true })
      } catch (err: any) {
        return json({ error: err?.message || 'Auto-sync failed' }, 500)
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // DL CHAT
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/chat/rooms' && method === 'GET') {
      const rooms    = await kvGet(kv, 'chat_rooms', [])
      const arr      = Array.isArray(rooms) ? rooms : []
      // Ensure general room exists
      if (!arr.find(r => r.id === 'general')) {
        arr.unshift({ id: 'general', name: 'General', description: 'Main chat room', type: 'group', created_by: 'system', created_at: new Date().toISOString() })
        await kvSet(kv, 'chat_rooms', arr)
      }
      const enriched = await Promise.all(arr.map(async room => {
        const msgs = await kvGet(kv, `chat_msgs_${room.id}`, [])
        const mArr = Array.isArray(msgs) ? msgs : []
        const last = mArr[mArr.length - 1] || null
        return { ...room, lastMessage: last, messageCount: mArr.length }
      }))
      return json({ rooms: enriched })
    }

    if (path === '/api/chat/rooms' && method === 'POST') {
      const body  = await request.json().catch(() => ({}))
      const rooms = await kvGet(kv, 'chat_rooms', [])
      const arr   = Array.isArray(rooms) ? rooms : []
      const room  = {
        id: uuid(),
        name: body.name || 'Room',
        description: body.description || '',
        type: body.type || 'group',
        created_by: user.id,
        created_at: new Date().toISOString(),
      }
      arr.push(room)
      await kvSet(kv, 'chat_rooms', arr)
      return json({ ok: true, room })
    }

    if (path === '/api/chat/messages' && method === 'GET') {
      const roomId = url.searchParams.get('room') || 'general'
      const limit  = Math.min(200, parseInt(url.searchParams.get('limit') || '50'))
      const since  = url.searchParams.get('since') || ''
      let msgs     = await kvGet(kv, `chat_msgs_${roomId}`, [])
      if (!Array.isArray(msgs)) msgs = []
      if (since) {
        const sinceMs = new Date(since).getTime()
        msgs = msgs.filter(m => new Date(m.ts).getTime() > sinceMs)
      }
      return json({ messages: msgs.slice(-limit), room: roomId })
    }

    if (path === '/api/chat/messages' && method === 'POST') {
      const body   = await request.json().catch(() => ({}))
      const roomId = body.room || 'general'
      const msgs   = await kvGet(kv, `chat_msgs_${roomId}`, [])
      const arr    = Array.isArray(msgs) ? msgs : []
      const msg    = {
        id: uuid(),
        room: roomId,
        userId: user.id,
        userName: user.name,
        body: body.body || '',
        ts: new Date().toISOString(),
        type: body.type || 'text',
        edited: false,
        reactions: {},
      }
      arr.push(msg)
      await kvSet(kv, `chat_msgs_${roomId}`, arr.slice(-500))
      return json({ ok: true, message: msg })
    }

    if (path === '/api/chat/messages' && method === 'DELETE') {
      const body   = await request.json().catch(() => ({}))
      const roomId = body.room || 'general'
      const msgs   = await kvGet(kv, `chat_msgs_${roomId}`, [])
      const arr    = Array.isArray(msgs) ? msgs : []
      const updated = arr.filter(m => !(m.id === body.id && m.userId === user.id))
      await kvSet(kv, `chat_msgs_${roomId}`, updated)
      return json({ ok: true })
    }

    if (path === '/api/chat/react' && method === 'POST') {
      const body   = await request.json().catch(() => ({}))
      const roomId = body.room || 'general'
      const msgs   = await kvGet(kv, `chat_msgs_${roomId}`, [])
      const arr    = Array.isArray(msgs) ? msgs : []
      const msg    = arr.find(m => m.id === body.messageId)
      if (msg) {
        if (!msg.reactions) msg.reactions = {}
        if (!msg.reactions[body.emoji]) msg.reactions[body.emoji] = []
        const reacts = msg.reactions[body.emoji]
        const idx    = reacts.indexOf(user.id)
        if (idx !== -1) reacts.splice(idx, 1)
        else reacts.push(user.id)
        await kvSet(kv, `chat_msgs_${roomId}`, arr)
      }
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // SEARCH (global)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/search' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase().trim()
      if (!q) return json({ results: [] })

      const msgs  = await kvGet(kv, `sms_${user.id}`, [])
      const nums  = await kvGet(kv, `numbers_${user.id}`, [])
      const msgArr = Array.isArray(msgs) ? msgs : []
      const numArr = Array.isArray(nums) ? nums : []

      const smsResults = msgArr.filter(m =>
        (m.body || '').toLowerCase().includes(q) ||
        (m.sender || '').toLowerCase().includes(q) ||
        (m.phone_number || '').includes(q) ||
        (m.otp || '').includes(q)
      ).slice(0, 20)

      const numResults = numArr.filter(n =>
        (n.phone || '').includes(q) ||
        (n.country_name || '').toLowerCase().includes(q) ||
        (n.country || '').toLowerCase().includes(q)
      ).slice(0, 10)

      return json({
        results: [
          ...smsResults.map(m => ({ type: 'sms', ...m })),
          ...numResults.map(n => ({ type: 'number', ...n })),
        ],
        total: smsResults.length + numResults.length,
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // DASHBOARD STATS (combined endpoint)
    // ══════════════════════════════════════════════════════════════════
    if (path === '/api/dashboard' && method === 'GET') {
      const [nums, msgs, syncHist, notifs] = await Promise.all([
        kvGet(kv, `numbers_${user.id}`, []),
        kvGet(kv, `sms_${user.id}`, []),
        kvGet(kv, `sync_history_${user.id}`, []),
        kvGet(kv, `notifs_${user.id}`, []),
      ])
      const numArr  = Array.isArray(nums)  ? nums  : []
      const msgArr  = Array.isArray(msgs)  ? msgs  : []
      const histArr = Array.isArray(syncHist) ? syncHist : []
      const notArr  = Array.isArray(notifs) ? notifs : []
      const now     = Date.now()

      const activeNums = numArr.filter(n => {
        const lastMs = n.last_received ? new Date(n.last_received).getTime() : 0
        return lastMs ? (now - lastMs) / 3600000 < 24 : n.status === 'active'
      })

      return json({
        numbers:     numArr.length,
        active:      activeNums.length,
        sms:         msgArr.length,
        otps:        msgArr.filter(m => m.otp).length,
        last24h:     msgArr.filter(m => new Date(m.received_at).getTime() > now - 86400000).length,
        whatsapp:    user.has_whatsapp || 0,
        unreadNotif: notArr.filter(n => !n.read).length,
        lastSync:    histArr[0]?.ts || null,
        syncCount:   user.sync_count || 0,
        recentSMS:   msgArr.slice(0, 10),
        topNumbers:  activeNums.slice(0, 5),
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // FALLBACK
    // ══════════════════════════════════════════════════════════════════
    return json({ error: `Not found: ${method} ${path}` }, 404)

  } catch (err) {
    return json({ error: err?.message || 'Internal server error' }, 500)
  }
}

// ─── iVASMS Scraper ──────────────────────────────────────────────────────────
async function scrapeIVASMS(email, password, userId, kv) {
  const BASE = 'https://www.ivasms.com'
  const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  const baseHeaders = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  }

  // ── Step 1: Load login page → get CSRF token ──
  let csrfToken  = ''
  let initCookies = ''
  try {
    const loginPageRes = await fetch(`${BASE}/login`, {
      headers: baseHeaders,
      signal: AbortSignal.timeout(15000),
    })
    const html  = await loginPageRes.text()
    const m1    = html.match(/name="_token"\s+value="([^"]+)"/)
    const m2    = html.match(/<meta[^>]+name="csrf-token"[^>]+content="([^"]+)"/)
    csrfToken   = m1?.[1] || m2?.[1] || ''
    initCookies = parseCookies(loginPageRes.headers.get('set-cookie') || '')
  } catch (e) {
    throw new Error(`Failed to load iVASMS login page: ${e.message}`)
  }

  // ── Step 2: POST login credentials ──
  let sessionCookies = ''
  try {
    const loginRes = await fetch(`${BASE}/login`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie':  initCookies,
        'Referer': `${BASE}/login`,
        'Origin':  BASE,
      },
      body: new URLSearchParams({
        email,
        password,
        _token: csrfToken,
        remember: '1',
      }).toString(),
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    })

    const loginCookies = parseCookies(loginRes.headers.get('set-cookie') || '')
    sessionCookies     = mergeCookies(initCookies, loginCookies)

    if (loginRes.status !== 302 && loginRes.status !== 200 && loginRes.status !== 301) {
      throw new Error(`Login returned HTTP ${loginRes.status}. Check your iVASMS credentials.`)
    }
  } catch (e) {
    if (e.message.includes('Login returned')) throw e
    throw new Error(`Login request failed: ${e.message}`)
  }

  // ── Step 3: Fetch numbers page ──
  let numbersHtml = ''
  try {
    const numbersRes = await fetch(`${BASE}/portal/numbers`, {
      headers: {
        ...baseHeaders,
        Cookie:  sessionCookies,
        Referer: BASE,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    if (numbersRes.url?.includes('/login')) {
      throw new Error('Authentication failed — iVASMS redirected to login. Check credentials.')
    }
    numbersHtml = await numbersRes.text()
    if (numbersHtml.match(/<title>[^<]*[Ll]ogin[^<]*<\/title>/)) {
      throw new Error('Authentication failed — wrong email or password.')
    }
  } catch (e) {
    throw new Error(e.message.includes('Authentication') ? e.message : `Failed to load numbers page: ${e.message}`)
  }

  // ── Step 4: Parse numbers ──
  const numbers = parseNumbers(numbersHtml, userId)

  // ── Step 5: Preserve existing number IDs ──
  const existing    = await kvGet(kv, `numbers_${userId}`, [])
  const existingArr = Array.isArray(existing) ? existing : []
  const phoneToId   = {}
  for (const n of existingArr) { if (n.phone) phoneToId[n.phone] = n.id }

  for (const n of numbers) {
    if (phoneToId[n.phone]) {
      const old  = existingArr.find(e => e.phone === n.phone)
      n.id       = phoneToId[n.phone]
      n.sms_count    = old?.sms_count    || 0
      n.last_received = old?.last_received || null
      n.whatsapp_created = old?.whatsapp_created || 0
    }
  }

  // ── Step 6: Fetch SMS for each number (up to 10) ──
  let totalSmsAdded = 0
  const existingMsgs = await kvGet(kv, `sms_${userId}`, [])
  const msgArr       = Array.isArray(existingMsgs) ? [...existingMsgs] : []
  const existingKeys = new Set(msgArr.map(m => `${m.phone_number}|${m.sender}|${m.body?.slice(0, 60)}`))

  for (const num of numbers.slice(0, 10)) {
    if (!num.ivasms_id) continue
    try {
      const smsRes = await fetch(`${BASE}/portal/numbers/${num.ivasms_id}/sms`, {
        headers: {
          ...baseHeaders,
          Cookie:  sessionCookies,
          Referer: `${BASE}/portal/numbers`,
        },
        signal: AbortSignal.timeout(10000),
      })
      const smsHtml = await smsRes.text()
      const newMsgs = parseMessages(smsHtml, num, userId)

      for (const msg of newMsgs) {
        const key = `${msg.phone_number}|${msg.sender}|${msg.body?.slice(0, 60)}`
        if (!existingKeys.has(key)) {
          existingKeys.add(key)
          msgArr.unshift(msg)
          totalSmsAdded++
          num.sms_count = (num.sms_count || 0) + 1
          if (!num.last_received || msg.received_at > num.last_received) {
            num.last_received = msg.received_at
          }
        }
      }
    } catch { /* skip individual number errors */ }
  }

  await kvSet(kv, `numbers_${userId}`, numbers)
  await kvSet(kv, `sms_${userId}`, msgArr.slice(0, 5000))

  return {
    success:  true,
    count:    numbers.length,
    added:    numbers.length,
    smsAdded: totalSmsAdded,
  }
}

// ─── Cookie helpers ────────────────────────────────────────────────────────
function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return ''
  return setCookieHeader
    .split(/,(?=[^;]+=[^;]+;)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

function mergeCookies(...parts) {
  const map = new Map()
  for (const part of parts) {
    if (!part) continue
    for (const c of part.split(';').map(s => s.trim()).filter(Boolean)) {
      const eq = c.indexOf('=')
      if (eq > 0) map.set(c.slice(0, eq).trim(), c.slice(eq + 1).trim())
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

// ─── HTML parsers ────────────────────────────────────────────────────────
function parseNumbers(html, userId) {
  const numbers = []
  const countryMap = {
    US:'United States', GB:'United Kingdom', UK:'United Kingdom',
    DE:'Germany',       FR:'France',         RU:'Russia',
    IN:'India',         CN:'China',          BR:'Brazil',
    CA:'Canada',        AU:'Australia',      JP:'Japan',
    KR:'South Korea',   SE:'Sweden',         NL:'Netherlands',
    PL:'Poland',        UA:'Ukraine',        IT:'Italy',
    ES:'Spain',         MX:'Mexico',         ID:'Indonesia',
    PH:'Philippines',   VN:'Vietnam',        TH:'Thailand',
    TR:'Turkey',        NG:'Nigeria',        ZA:'South Africa',
    AR:'Argentina',     CL:'Chile',          CO:'Colombia',
    PT:'Portugal',      EG:'Egypt',          SA:'Saudi Arabia',
    AE:'UAE',           PK:'Pakistan',       BD:'Bangladesh',
    MY:'Malaysia',      SG:'Singapore',      HK:'Hong Kong',
    TW:'Taiwan',        NO:'Norway',         DK:'Denmark',
    FI:'Finland',       AT:'Austria',        CH:'Switzerland',
    BE:'Belgium',       GR:'Greece',         RO:'Romania',
    HU:'Hungary',       CZ:'Czech Republic', SK:'Slovakia',
    BG:'Bulgaria',      HR:'Croatia',        SI:'Slovenia',
    LT:'Lithuania',     LV:'Latvia',         EE:'Estonia',
  }

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[0]
    if (row.includes('<th')) continue

    const phoneMatch =
      row.match(/data-phone="(\+?[\d\s\-]+)"/)     ||
      row.match(/class="[^"]*phone[^"]*"[^>]*>(\+?[\d\s\-]+)</) ||
      row.match(/>(\+?1?[\d]{9,14})<\//)            ||
      row.match(/(\+[\d]{7,15})/)
    if (!phoneMatch) continue

    const phone = phoneMatch[1].replace(/[\s\-]/g, '').trim()
    if (phone.length < 7 || !/^\+?\d+$/.test(phone)) continue

    const idMatch   = row.match(/href="[^"]*\/numbers\/(\d+)/) || row.match(/data-id="(\d+)"/)
    const ivasmsId  = idMatch?.[1] || ''

    const countryMatch =
      row.match(/data-country="([A-Z]{2})\"/)  ||
      row.match(/<td[^>]*>\s*([A-Z]{2})\s*<\/td>/)
    const countryCode  = countryMatch?.[1]?.trim().toUpperCase() || detectCountry(phone)
    const countryName  = countryMap[countryCode] || countryCode

    const isInactive = /badge-danger|badge-warning|expired|inactive/i.test(row)

    numbers.push({
      id:              uuid(),
      user_id:         userId,
      ivasms_id:       ivasmsId,
      phone,
      country:         countryCode,
      country_name:    countryName,
      status:          isInactive ? 'inactive' : 'active',
      sms_count:       0,
      last_received:   null,
      whatsapp_created:0,
      created_at:      new Date().toISOString(),
    })
  }

  return numbers
}

function parseMessages(html, num, userId) {
  const messages = []
  const SERVICE_PATTERNS = [
    { p: /google|gmail|youtube/i,      s: 'Google'    },
    { p: /whatsapp/i,                   s: 'WhatsApp'  },
    { p: /telegram/i,                   s: 'Telegram'  },
    { p: /facebook|fb\b|instagram/i,    s: 'Facebook'  },
    { p: /twitter|x\.com/i,             s: 'Twitter'   },
    { p: /amazon|aws/i,                 s: 'Amazon'    },
    { p: /microsoft|outlook|xbox/i,     s: 'Microsoft' },
    { p: /apple|icloud/i,               s: 'Apple'     },
    { p: /paypal/i,                     s: 'PayPal'    },
    { p: /\buber\b|\blyft\b/i,          s: 'Uber'      },
    { p: /netflix/i,                    s: 'Netflix'   },
    { p: /tiktok|tik.?tok/i,            s: 'TikTok'    },
    { p: /discord/i,                    s: 'Discord'   },
    { p: /linkedin/i,                   s: 'LinkedIn'  },
    { p: /binance|crypto|bitcoin|coinbase/i, s: 'Crypto' },
    { p: /shopify|ebay|etsy/i,          s: 'Shopping'  },
    { p: /uber\s*eats|doordash|grubhub|foodpanda/i, s: 'Food Delivery' },
    { p: /airbnb/i,                     s: 'Airbnb'    },
    { p: /spotify/i,                    s: 'Spotify'   },
    { p: /snapchat/i,                   s: 'Snapchat'  },
  ]
  const OTP_REGEX = /\b(\d{4,8})\b/g

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const row   = match[0]
    if (row.includes('<th')) continue

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[0])
    if (cells.length < 2) continue

    const getText = c =>
      c.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()

    const sender  = getText(cells[0] || '')
    const body    = getText(cells[1] || '')
    const timeRaw = getText(cells[2] || '')

    if (!body || body.length < 3) continue

    let service = 'Unknown'
    for (const { p, s } of SERVICE_PATTERNS) {
      if (p.test(body) || p.test(sender)) { service = s; break }
    }

    const otpMatches = [...body.matchAll(OTP_REGEX)].map(m => m[1])
    const otp        = otpMatches.find(o => o.length >= 4 && o.length <= 8) || null

    messages.push({
      id:           uuid(),
      user_id:      userId,
      number_id:    num.id,
      phone_number: num.phone,
      sender:       sender || 'Unknown',
      body,
      otp,
      service,
      received_at:  parseTime(timeRaw) || new Date().toISOString(),
      starred:      false,
      tags:         [],
    })
  }

  return messages
}

function parseTime(str) {
  if (!str) return null
  try {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return null
}

function detectCountry(phone) {
  const p = phone.replace(/^0+/, '')
  if (p.startsWith('+1')   || p.startsWith('1'))    return 'US'
  if (p.startsWith('+44')  || p.startsWith('44'))   return 'GB'
  if (p.startsWith('+49')  || p.startsWith('49'))   return 'DE'
  if (p.startsWith('+33')  || p.startsWith('33'))   return 'FR'
  if (p.startsWith('+7'))                            return 'RU'
  if (p.startsWith('+91')  || p.startsWith('91'))   return 'IN'
  if (p.startsWith('+86')  || p.startsWith('86'))   return 'CN'
  if (p.startsWith('+55')  || p.startsWith('55'))   return 'BR'
  if (p.startsWith('+61')  || p.startsWith('61'))   return 'AU'
  if (p.startsWith('+81')  || p.startsWith('81'))   return 'JP'
  if (p.startsWith('+82')  || p.startsWith('82'))   return 'KR'
  if (p.startsWith('+46')  || p.startsWith('46'))   return 'SE'
  if (p.startsWith('+31')  || p.startsWith('31'))   return 'NL'
  if (p.startsWith('+48')  || p.startsWith('48'))   return 'PL'
  if (p.startsWith('+380'))                          return 'UA'
  if (p.startsWith('+39')  || p.startsWith('39'))   return 'IT'
  if (p.startsWith('+34')  || p.startsWith('34'))   return 'ES'
  if (p.startsWith('+52')  || p.startsWith('52'))   return 'MX'
  if (p.startsWith('+62')  || p.startsWith('62'))   return 'ID'
  if (p.startsWith('+63')  || p.startsWith('63'))   return 'PH'
  if (p.startsWith('+84')  || p.startsWith('84'))   return 'VN'
  if (p.startsWith('+66')  || p.startsWith('66'))   return 'TH'
  if (p.startsWith('+90')  || p.startsWith('90'))   return 'TR'
  if (p.startsWith('+234'))                          return 'NG'
  if (p.startsWith('+27'))                           return 'ZA'
  if (p.startsWith('+60'))                           return 'MY'
  if (p.startsWith('+65'))                           return 'SG'
  if (p.startsWith('+852'))                          return 'HK'
  if (p.startsWith('+886'))                          return 'TW'
  if (p.startsWith('+92'))                           return 'PK'
  if (p.startsWith('+880'))                          return 'BD'
  if (p.startsWith('+20'))                           return 'EG'
  if (p.startsWith('+966'))                          return 'SA'
  if (p.startsWith('+971'))                          return 'AE'
  if (p.startsWith('+47'))                           return 'NO'
  if (p.startsWith('+45'))                           return 'DK'
  if (p.startsWith('+358'))                          return 'FI'
  if (p.startsWith('+43'))                           return 'AT'
  if (p.startsWith('+41'))                           return 'CH'
  return 'US'
}
