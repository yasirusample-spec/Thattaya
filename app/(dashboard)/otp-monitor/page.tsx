'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const SVC_COLORS: Record<string, string> = {
  Google: '#4285f4', WhatsApp: '#25d366', Telegram: '#229ed9',
  Facebook: '#1877f2', Twitter: '#1da1f2', Amazon: '#ff9900',
  Microsoft: '#00a4ef', Apple: '#555', PayPal: '#003087',
  Netflix: '#e50914', TikTok: '#ff0050', Discord: '#5865f2',
  LinkedIn: '#0a66c2', Crypto: '#f7931a', Unknown: '#6a6a8a',
}

export default function OTPMonitorPage() {
  const [otps,      setOtps]      = useState<any[]>([])
  const [numbers,   setNumbers]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [watching,  setWatching]  = useState(false)
  const [copied,    setCopied]    = useState<string | null>(null)
  const [filter,    setFilter]    = useState({ service: '', numberId: '' })
  const [newOtp,    setNewOtp]    = useState<any>(null)
  const pollRef = useRef<any>(null)
  const lastSeen = useRef<string>(new Date().toISOString())

  const loadOtps = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' })
    if (filter.service)  params.set('service', filter.service)
    if (filter.numberId) params.set('numberId', filter.numberId)
    try {
      const r = await fetch(`/api/otp/latest?${params}`)
      if (r.ok) {
        const d = await r.json()
        setOtps(d.otps || [])
      }
    } catch {}
    setLoading(false)
  }, [filter])

  const loadNumbers = useCallback(async () => {
    try {
      const r = await fetch('/api/ivasms/numbers')
      if (r.ok) {
        const d = await r.json()
        setNumbers(d.numbers || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadOtps()
    loadNumbers()
  }, [loadOtps, loadNumbers])

  // Live watch
  useEffect(() => {
    if (!watching) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({ since: lastSeen.current })
        if (filter.service)  params.set('service', filter.service)
        if (filter.numberId) params.set('numberId', filter.numberId)
        const r = await fetch(`/api/otp/watch?${params}`)
        if (r.ok) {
          const d = await r.json()
          if (d.found && d.latest) {
            setNewOtp(d.latest)
            lastSeen.current = new Date().toISOString()
            loadOtps()
            setTimeout(() => setNewOtp(null), 15000)
          }
        }
      } catch {}
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [watching, filter, loadOtps])

  const copyOtp = (otp: string, id: string) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const fmtTime = (ts: string) => {
    try {
      const d    = new Date(ts)
      const diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return d.toLocaleDateString()
    } catch { return ts }
  }

  const services = [...new Set(otps.map(o => o.service).filter(Boolean))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-key-fill" style={{ color: 'var(--yellow)', fontSize: 20 }} />
            OTP Monitor
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            Real-time OTP code detection and auto-copy
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setWatching(w => !w)}
            className={watching ? 'btn-success btn-sm' : 'btn-primary btn-sm'}
            style={{ gap: 7 }}
          >
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: watching ? 'var(--green)' : '#fff',
              animation: watching ? 'livePulse 1.5s ease-in-out infinite' : 'none',
            }} />
            {watching ? 'Watching Live…' : 'Start Live Watch'}
          </button>
          <button onClick={loadOtps} className="btn-secondary btn-sm">
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />Refresh
          </button>
        </div>
      </div>

      {/* Live alert */}
      {newOtp && (
        <div style={{
          background: 'rgba(255,193,7,.1)', border: '1px solid rgba(255,193,7,.4)',
          borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
          animation: 'popIn .3s ease',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'rgba(255,193,7,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className="bi bi-key-fill" style={{ color: 'var(--yellow)', fontSize: 24 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>
              🔔 New OTP Received!
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
              From: <strong>{newOtp.sender}</strong> · {newOtp.phone_number} · {newOtp.service}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="otp-display" style={{ fontSize: 28 }}>{newOtp.otp}</div>
              <button onClick={() => copyOtp(newOtp.otp, 'new')} className="btn-primary btn-sm">
                <i className={`bi ${copied === 'new' ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} />
                {copied === 'new' ? 'Copied!' : 'Copy OTP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select value={filter.service} onChange={e => setFilter(f => ({ ...f, service: e.target.value }))} style={{ flex: '0 0 160px' }}>
          <option value="">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.numberId} onChange={e => setFilter(f => ({ ...f, numberId: e.target.value }))} style={{ flex: '0 0 200px' }}>
          <option value="">All Numbers</option>
          {numbers.map((n: any) => <option key={n.id} value={n.id}>{n.phone}</option>)}
        </select>
        {(filter.service || filter.numberId) && (
          <button className="btn-ghost btn-sm" onClick={() => setFilter({ service: '', numberId: '' })}>
            <i className="bi bi-x" style={{ fontSize: 15 }} />Clear
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 12 }}>
          <i className="bi bi-key-fill" style={{ color: 'var(--yellow)' }} />
          {otps.length} OTPs found
        </div>
      </div>

      {/* OTP grid */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 28, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text3)' }}>Loading OTPs…</p>
        </div>
      ) : otps.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <i className="bi bi-key-fill" style={{ fontSize: 44, opacity: .2, display: 'block', marginBottom: 16, color: 'var(--yellow)' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No OTPs yet</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Sync iVASMS to load SMS messages. OTPs will be detected automatically.
          </p>
          <a href="/numbers" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }} className="btn-primary">
            <i className="bi bi-arrow-repeat" style={{ fontSize: 15 }} />Go to Numbers & Sync
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {otps.map((otp: any) => {
            const svcColor = SVC_COLORS[otp.service] || 'var(--accent)'
            return (
              <div key={otp.id} className="card card-sm" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: svcColor, borderRadius: '3px 0 0 3px' }} />
                <div style={{ paddingLeft: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: svcColor, background: `${svcColor}18`, border: `1px solid ${svcColor}33`, padding: '2px 8px', borderRadius: 5 }}>
                        {otp.service}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{otp.phone_number}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtTime(otp.received_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div className="otp-display">{otp.otp}</div>
                    <button onClick={() => copyOtp(otp.otp, otp.id)} className={copied === otp.id ? 'btn-success btn-sm' : 'btn-secondary btn-sm'}>
                      <i className={`bi ${copied === otp.id ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 13 }} />
                      {copied === otp.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 6 }}>
                    <i className="bi bi-person-fill" style={{ marginRight: 5, color: 'var(--text3)', fontSize: 10 }} />
                    {otp.sender}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
                    {(otp.body || '').slice(0, 120)}{(otp.body || '').length > 120 ? '…' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Watch mode guide */}
      {!watching && (
        <div className="alert alert-info">
          <i className="bi bi-lightbulb-fill" />
          <div>
            <strong>Live Watch Mode:</strong> Click <strong>Start Live Watch</strong> to poll for new OTPs every 3 seconds.
            The OTP will be highlighted with a flash alert and auto-copy notification when received.
            Pair with <strong>auto-sync</strong> in Settings for fully automatic OTP capture.
          </div>
        </div>
      )}
    </div>
  )
}
