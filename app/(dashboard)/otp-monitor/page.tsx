'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const SVC_COLORS: Record<string, string> = {
  Google: '#4285f4', WhatsApp: '#25d366', Telegram: '#229ed9', Facebook: '#1877f2',
  Twitter: '#1da1f2', Amazon: '#ff9900', Microsoft: '#00a4ef', Apple: '#777',
  PayPal: '#003087', Netflix: '#e50914', TikTok: '#ff0050', Discord: '#5865f2',
  LinkedIn: '#0a66c2', Binance: '#f3ba2f', Coinbase: '#0052ff', Instagram: '#e1306c',
  Snapchat: '#f7c948', Uber: '#555', Shopify: '#96bf48', Unknown: '#6a6a8a',
}

const SVC_ICONS: Record<string, string> = {
  Google: 'bi-google', WhatsApp: 'bi-whatsapp', Telegram: 'bi-telegram',
  Facebook: 'bi-facebook', Twitter: 'bi-twitter-x', Amazon: 'bi-amazon',
  Microsoft: 'bi-microsoft', Apple: 'bi-apple', LinkedIn: 'bi-linkedin',
  Discord: 'bi-discord', TikTok: 'bi-tiktok', Instagram: 'bi-instagram',
  Snapchat: 'bi-snapchat', YouTube: 'bi-youtube',
}

export default function OTPMonitorPage() {
  const [otps,      setOtps]      = useState<any[]>([])
  const [numbers,   setNumbers]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [watching,  setWatching]  = useState(false)
  const [copied,    setCopied]    = useState<string|null>(null)
  const [filter,    setFilter]    = useState({ service: '', numberId: '' })
  const [newOtp,    setNewOtp]    = useState<any>(null)
  const [alertOn,   setAlertOn]   = useState(false)
  const [count30s,  setCount30s]  = useState(30)
  const pollRef  = useRef<any>(null)
  const lastSeen = useRef<string>(new Date().toISOString())
  const audioRef = useRef<any>(null)

  const loadOtps = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' })
    if (filter.service)  params.set('service',  filter.service)
    if (filter.numberId) params.set('numberId', filter.numberId)
    try {
      const r = await fetch(`/api/otp/latest?${params}`)
      if (r.ok) { const d = await r.json(); setOtps(d.otps || []) }
    } catch {}
    setLoading(false)
  }, [filter])

  useEffect(() => {
    Promise.all([
      loadOtps(),
      fetch('/api/ivasms/numbers').then(r => r.json()).then(d => setNumbers(d.numbers || [])).catch(() => {}),
    ])
  }, [loadOtps])

  // Countdown to next auto-refresh
  useEffect(() => {
    const t = setInterval(() => {
      setCount30s(p => {
        if (p <= 1) { loadOtps(); return 30 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [loadOtps])

  // Live watch polling
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (!watching) return
    pollRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({ since: lastSeen.current })
        if (filter.service)  params.set('service',  filter.service)
        if (filter.numberId) params.set('numberId', filter.numberId)
        const r = await fetch(`/api/otp/watch?${params}`)
        if (r.ok) {
          const d = await r.json()
          if (d.found && d.latest) {
            setNewOtp(d.latest)
            lastSeen.current = new Date().toISOString()
            loadOtps()
            setTimeout(() => setNewOtp(null), 20000)
            // Play alert sound
            if (alertOn) {
              try {
                const ctx  = new AudioContext()
                const osc  = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain); gain.connect(ctx.destination)
                osc.frequency.setValueAtTime(880, ctx.currentTime)
                osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
                gain.gain.setValueAtTime(0.3, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
              } catch {}
            }
          }
        }
      } catch {}
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [watching, filter, loadOtps, alertOn])

  const copyOtp = (otp: string, id: string) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2500)
  }

  const fmtTime = (ts: string) => {
    try {
      const diff = (Date.now() - new Date(ts).getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
      if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
      return new Date(ts).toLocaleDateString()
    } catch { return ts }
  }

  const services = [...new Set(otps.map(o => o.service).filter(Boolean))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-key-fill" style={{ color: 'var(--yellow)', fontSize: 20 }} />
            OTP Monitor
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            Real-time OTP detection · {otps.length} codes · refresh in {count30s}s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setAlertOn(p => !p)} className={alertOn ? 'btn-success btn-sm' : 'btn-secondary btn-sm'} style={{ gap: 6 }}>
            <i className={`bi ${alertOn ? 'bi-bell-fill' : 'bi-bell-slash-fill'}`} style={{ fontSize: 13 }} />
            {alertOn ? 'Alert ON' : 'Alert OFF'}
          </button>
          <button onClick={() => setWatching(w => !w)} className={watching ? 'btn-success btn-sm' : 'btn-primary btn-sm'} style={{ gap: 7 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: watching ? 'var(--green)' : '#fff',
              animation: watching ? 'livePulse 1.5s ease-in-out infinite' : 'none' }} />
            {watching ? 'Watching LIVE…' : 'Start Live Watch'}
          </button>
          <button onClick={loadOtps} className="btn-secondary btn-sm" style={{ gap: 6 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />Refresh
          </button>
        </div>
      </div>

      {/* ── NEW OTP ALERT ── */}
      {newOtp && (
        <div style={{ background: 'linear-gradient(135deg, rgba(255,193,7,.15), rgba(255,152,0,.1))',
          border: '2px solid rgba(255,193,7,.5)', borderRadius: 14, padding: '18px 22px',
          display: 'flex', alignItems: 'center', gap: 18, animation: 'popIn .3s ease' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,193,7,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            animation: 'livePulse 1.5s ease-in-out infinite' }}>
            <i className="bi bi-key-fill" style={{ color: 'var(--yellow)', fontSize: 26 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .7, marginBottom: 4 }}>
              🔔 New OTP Received!
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              <strong>{newOtp.service}</strong> · {newOtp.phone_number} · from <strong>{newOtp.sender}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 36, letterSpacing: 8,
                color: 'var(--yellow)', background: 'rgba(255,193,7,.1)', border: '2px solid rgba(255,193,7,.4)',
                padding: '6px 18px', borderRadius: 10 }}>
                {newOtp.otp}
              </div>
              <button onClick={() => copyOtp(newOtp.otp, 'new')} className={copied === 'new' ? 'btn-success' : 'btn-primary'}
                style={{ padding: '10px 20px', gap: 8 }}>
                <i className={`bi ${copied === 'new' ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 15 }} />
                {copied === 'new' ? 'Copied!' : 'Copy OTP'}
              </button>
            </div>
          </div>
          <button onClick={() => setNewOtp(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, padding: 4, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* ── Stats ── */}
      {otps.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {services.slice(0, 6).map(svc => {
            const cnt = otps.filter(o => o.service === svc).length
            const c = SVC_COLORS[svc] || 'var(--accent)'
            const icon = SVC_ICONS[svc] || 'bi-shield-fill-check'
            return (
              <button key={svc} onClick={() => setFilter(f => ({ ...f, service: f.service === svc ? '' : svc }))}
                className="card card-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all .2s',
                  borderColor: filter.service === svc ? c : 'var(--border)',
                  background: filter.service === svc ? `${c}12` : 'var(--card)',
                  textAlign: 'left', border: `1px solid ${filter.service === svc ? c : 'var(--border)'}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${icon}`} style={{ color: c, fontSize: 15 }} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: c, lineHeight: 1 }}>{cnt}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{svc}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filter.service} onChange={e => setFilter(f => ({ ...f, service: e.target.value }))} style={{ flex: '0 0 160px', width: 'auto' }}>
          <option value="">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.numberId} onChange={e => setFilter(f => ({ ...f, numberId: e.target.value }))} style={{ flex: '0 0 200px', width: 'auto' }}>
          <option value="">All Numbers</option>
          {numbers.map((n: any) => <option key={n.id} value={n.id}>{n.phone}</option>)}
        </select>
        {(filter.service || filter.numberId) && (
          <button className="btn-ghost btn-sm" onClick={() => setFilter({ service: '', numberId: '' })}>
            <i className="bi bi-x" style={{ fontSize: 15 }} />Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-key-fill" style={{ color: 'var(--yellow)' }} />{otps.length} OTP codes
        </span>
      </div>

      {/* ── OTP Grid ── */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 28, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text3)' }}>Loading OTPs…</p>
        </div>
      ) : otps.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <i className="bi bi-key-fill" style={{ fontSize: 52, opacity: .15, display: 'block', marginBottom: 16, color: 'var(--yellow)' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>No OTPs Yet</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>
            OTPs are automatically extracted from SMS messages. Load your numbers first to see verification codes.
          </p>
          <a href="/numbers" className="btn-primary btn-sm" style={{ display: 'inline-flex', gap: 7 }}>
            <i className="bi bi-phone-fill" style={{ fontSize: 14 }} />Go to Numbers
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
          {otps.map((otp: any) => {
            const c = SVC_COLORS[otp.service] || 'var(--accent)'
            const icon = SVC_ICONS[otp.service] || 'bi-shield-fill-check'
            const isNew = (Date.now() - new Date(otp.received_at).getTime()) < 300000 // 5 min = "new"
            return (
              <div key={otp.id} className="card card-sm" style={{ position: 'relative', overflow: 'hidden', borderColor: isNew ? `${c}50` : 'var(--border)', transition: 'all .2s' }}>
                {isNew && (
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 800, color: c, background: `${c}18`, padding: '2px 6px', borderRadius: 4, letterSpacing: .5 }}>NEW</div>
                )}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: c, borderRadius: '3px 0 0 3px' }} />
                <div style={{ paddingLeft: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`bi ${icon}`} style={{ color: c, fontSize: 14 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{otp.service}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{otp.phone_number}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>{fmtTime(otp.received_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, letterSpacing: 6,
                      color: c, background: `${c}12`, border: `1px solid ${c}30`,
                      padding: '5px 14px', borderRadius: 10 }}>
                      {otp.otp}
                    </div>
                    <button onClick={() => copyOtp(otp.otp, otp.id)}
                      className={copied === otp.id ? 'btn-success btn-sm' : 'btn-secondary btn-sm'}
                      style={{ gap: 5 }}>
                      <i className={`bi ${copied === otp.id ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 12 }} />
                      {copied === otp.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-person-fill" style={{ fontSize: 10, color: 'var(--text3)' }} />{otp.sender}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
                    {(otp.body || '').slice(0, 100)}{(otp.body || '').length > 100 ? '…' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Guide box ── */}
      {!watching && (
        <div className="alert alert-info">
          <i className="bi bi-lightbulb-fill" />
          <div>
            <strong>Live Watch Mode:</strong> Click <strong>Start Live Watch</strong> to poll every 3 seconds for new OTPs.
            Enable <strong>Alert</strong> for an audio beep when a new code arrives.
            OTPs are auto-extracted from SMS using pattern recognition across 20+ services.
          </div>
        </div>
      )}
    </div>
  )
}
