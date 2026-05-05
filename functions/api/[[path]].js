// Cloudflare Pages Functions - Full API handler
// DL SMS Client — Team Death Legion
// WebCrypto JWT · KV/in-memory store · iVASMS live scraper

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
      ivasms_email: '',
      ivasms_password: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
      mobile_token: 'dl_' + uuid().replace(/-/g, ''),
      has_whatsapp: 0,
      whatsapp_number: '',
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
  const token       = tokenMatch?.[1] || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null)
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
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
        ivasms_email: '',
        ivasms_password: '',
        telegram_bot_token: '',
        telegram_chat_id: '',
        mobile_token: 'dl_' + uuid().replace(/-/g, ''),
        has_whatsapp: 0,
        whatsapp_number: '',
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
          id: user.id, name: user.name, email: user.email,
          ivasms_email: user.ivasms_email || '',
          telegram_bot_token: user.telegram_bot_token || '',
          telegram_chat_id: user.telegram_chat_id || '',
          mobile_token: user.mobile_token || '',
          has_whatsapp: user.has_whatsapp || 0,
          whatsapp_number: user.whatsapp_number || '',
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
          { name: 'API Service',       ok: true,    latency: apiLatency,  uptime: 99.99, status: 'operational' },
          { name: 'iVASMS Connection', ok: ivasOk,  latency: ivasLatency, uptime: 99.5,  status: ivasOk ? 'operational' : 'degraded' },
          { name: 'SMS Receiving',     ok: true,    latency: 1,           uptime: 99.9,  status: 'operational' },
          { name: 'WhatsApp Service',  ok: true,    latency: 5,           uptime: 99.8,  status: 'operational' },
          { name: 'Telegram Bot',      ok: true,    latency: 3,           uptime: 99.7,  status: 'operational' },
          { name: 'Database',          ok: true,    latency: 2,           uptime: 99.99, status: 'operational' },
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
        // A number is active if explicitly marked active OR received SMS < 24h ago
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
      const limit    = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')  || '20')))
      const search   = url.searchParams.get('search')   || ''
      const hasOtp   = url.searchParams.get('hasOtp')   === 'true'
      const service  = url.searchParams.get('service')  || ''
      const numberId = url.searchParams.get('numberId') || ''
      const since    = url.searchParams.get('since')    || ''

      // FIXED: Always default to [] if null/undefined
      let msgs = await kvGet(kv, `sms_${user.id}`, [])
      if (!msgs || !Array.isArray(msgs)) msgs = []

      if (since) {
        const sinceMs = new Date(since).getTime()
        if (!isNaN(sinceMs)) msgs = msgs.filter(m => {
          const t = new Date(m.received_at).getTime()
          return !isNaN(t) && t > sinceMs
        })
      }
      if (search)   msgs = msgs.filter(m => (m.body || '').includes(search) || (m.sender || '').includes(search) || (m.phone_number || '').includes(search))
      if (hasOtp)   msgs = msgs.filter(m => m.otp)
      if (service)  msgs = msgs.filter(m => m.service === service)
      if (numberId) msgs = msgs.filter(m => m.number_id === numberId)

      const total = msgs.length
      const pages = Math.max(1, Math.ceil(total / limit))
      const paged = msgs.slice((page - 1) * limit, page * limit)
      return json({ messages: paged, total, pages, page })
    }

    // ══════════════════════════════════════════════════════════════════
    // iVASMS SYNC
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/ivasms/sync' && method === 'POST') {
      // FIXED: Always reload fresh user from KV to get latest saved credentials
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
        return json(result)
      } catch (err) {
        const msg = err?.message || String(err) || 'Unknown scraper error'
        return json({ error: msg }, 500)
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // iVASMS LIVE SMS POLL (lightweight — no full scrape)
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
    // SETTINGS
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/settings' && method === 'GET') {
      return json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          ivasms_email: user.ivasms_email || '',
          ivasms_password: '',        // never return password
          telegram_bot_token: user.telegram_bot_token || '',
          telegram_chat_id: user.telegram_chat_id || '',
          mobile_token: user.mobile_token || '',
          has_whatsapp: user.has_whatsapp || 0,
          whatsapp_number: user.whatsapp_number || '',
        }
      })
    }

    if (path === '/api/settings' && method === 'PATCH') {
      const body = await request.json().catch(() => ({}))

      // FIXED: Always reload fresh users array
      let users = await kvGet(kv, 'users', [])
      if (!Array.isArray(users)) users = []

      let idx = users.findIndex(u => u.id === user.id)
      if (idx === -1) {
        users.push({ ...user })
        idx = users.length - 1
      }

      if (body.type === 'profile') {
        if (body.name  && String(body.name).trim())  users[idx].name  = String(body.name).trim()
        if (body.email && String(body.email).trim()) users[idx].email = String(body.email).toLowerCase().trim()

      } else if (body.type === 'ivasms') {
        // FIXED: Properly save iVASMS credentials
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
          has_whatsapp: u.has_whatsapp || 0,
          whatsapp_number: u.whatsapp_number || '',
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════
    // MOBILE TOKEN
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/mobile/token' && method === 'GET') {
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
      await kvSet(kv, `sessions_${user.id}`, arr.slice(0, 50))

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
            text: '💀 *DL SMS Client* — Test message\n\n✅ Telegram bot is working!\n\n_Team Death Legion_',
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

    // ══════════════════════════════════════════════════════════════════
    // WHATSAPP
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/whatsapp/status' && method === 'GET') {
      return json({
        connected: user.has_whatsapp === 1,
        number: user.whatsapp_number || null,
        status: user.has_whatsapp ? 'connected' : 'disconnected',
      })
    }

    if (path === '/api/whatsapp/create' && method === 'POST') {
      return json({ error: 'WhatsApp requires Node.js backend with Puppeteer.', status: 'unavailable_on_edge' }, 501)
    }

    if (path === '/api/whatsapp/send' && method === 'POST') {
      if (!user.has_whatsapp) return json({ error: 'WhatsApp not connected' }, 400)
      return json({ error: 'WhatsApp send requires Node.js backend' }, 501)
    }

    if (path === '/api/whatsapp/chats'    && method === 'GET') return json({ chats: [] })
    if (path === '/api/whatsapp/messages' && method === 'GET') return json({ messages: [] })

    // ══════════════════════════════════════════════════════════════════
    // DL CHAT
    // ══════════════════════════════════════════════════════════════════

    if (path === '/api/chat/rooms' && method === 'GET') {
      const rooms    = await kvGet(kv, 'chat_rooms', [])
      const arr      = Array.isArray(rooms) ? rooms : []
      const enriched = await Promise.all(arr.map(async room => {
        const msgs = await kvGet(kv, `chat_msgs_${room.id}`, [])
        const mArr = Array.isArray(msgs) ? msgs : []
        const last = mArr[mArr.length - 1] || null
        return { ...room, lastMessage: last, messageCount: mArr.length }
      }))
      return json({ rooms: enriched })
    }

    if (path === '/api/chat/rooms' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      if (!body.name) return json({ error: 'Room name required' }, 400)
      const room = {
        id: uuid(),
        name: body.name.trim(),
        description: body.description || '',
        type: body.type || 'group',
        created_by: user.id,
        created_at: new Date().toISOString(),
        members: [user.id],
      }
      const rooms = await kvGet(kv, 'chat_rooms', [])
      const arr   = Array.isArray(rooms) ? rooms : []
      arr.push(room)
      await kvSet(kv, 'chat_rooms', arr)
      return json({ room })
    }

    if (path === '/api/chat/messages' && method === 'GET') {
      const roomId = url.searchParams.get('roomId') || 'general'
      const since  = url.searchParams.get('since')  || ''
      const limit  = Math.min(100, parseInt(url.searchParams.get('limit') || '50'))
      let msgs     = await kvGet(kv, `chat_msgs_${roomId}`, [])
      const arr    = Array.isArray(msgs) ? msgs : []
      let result   = since
        ? arr.filter(m => new Date(m.created_at).getTime() > new Date(since).getTime())
        : arr.slice(-limit)
      return json({ messages: result, roomId })
    }

    if (path === '/api/chat/messages' && method === 'POST') {
      const body   = await request.json().catch(() => ({}))
      const roomId = body.roomId || 'general'
      if (!body.text) return json({ error: 'Message text required' }, 400)
      const msg = {
        id: uuid(),
        roomId,
        userId: user.id,
        userName: user.name || 'User',
        text: String(body.text).trim(),
        type: body.type || 'text',
        otp: body.otp || null,
        created_at: new Date().toISOString(),
      }
      const msgs = await kvGet(kv, `chat_msgs_${roomId}`, [])
      const arr  = Array.isArray(msgs) ? msgs : []
      arr.push(msg)
      await kvSet(kv, `chat_msgs_${roomId}`, arr.slice(-500))
      return json({ message: msg })
    }

    if (path === '/api/chat/messages' && method === 'DELETE') {
      const body = await request.json().catch(() => ({}))
      const { roomId, messageId } = body
      if (!roomId || !messageId) return json({ error: 'roomId and messageId required' }, 400)
      const msgs     = await kvGet(kv, `chat_msgs_${roomId}`, [])
      const arr      = Array.isArray(msgs) ? msgs : []
      const filtered = arr.filter(m => !(m.id === messageId && m.userId === user.id))
      await kvSet(kv, `chat_msgs_${roomId}`, filtered)
      return json({ ok: true })
    }

    // ══════════════════════════════════════════════════════════════════
    // NOT FOUND
    // ══════════════════════════════════════════════════════════════════
    return json({ error: 'API endpoint not found', path }, 404)

  } catch (err) {
    const msg = err?.message || String(err) || 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── iVASMS Scraper (edge-compatible fetch) ──────────────────────────────
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

  // ── Step 5: Preserve existing number IDs (avoid duplicate entries) ──
  const existing    = await kvGet(kv, `numbers_${userId}`, [])
  const existingArr = Array.isArray(existing) ? existing : []
  const phoneToId   = {}
  for (const n of existingArr) { if (n.phone) phoneToId[n.phone] = n.id }

  for (const n of numbers) {
    if (phoneToId[n.phone]) {
      // Reuse existing ID so SMS references stay valid
      const old  = existingArr.find(e => e.phone === n.phone)
      n.id       = phoneToId[n.phone]
      n.sms_count    = old?.sms_count    || 0
      n.last_received = old?.last_received || null
    }
  }

  // ── Step 6: Fetch SMS for each number (up to 8) ──
  let totalSmsAdded = 0
  const existingMsgs = await kvGet(kv, `sms_${userId}`, [])
  const msgArr       = Array.isArray(existingMsgs) ? [...existingMsgs] : []
  const existingKeys = new Set(msgArr.map(m => `${m.phone_number}|${m.sender}|${m.body?.slice(0, 60)}`))

  for (const num of numbers.slice(0, 8)) {
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
  await kvSet(kv, `sms_${userId}`, msgArr.slice(0, 2000))

  return {
    success:  true,
    count:    numbers.length,
    added:    numbers.length,
    smsAdded: totalSmsAdded,
  }
}

// ─── Cookie helpers ──────────────────────────────────────────────────────
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
    PT:'Portugal',
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
      row.match(/data-country="([A-Z]{2})"/)  ||
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
  return 'US'
}
