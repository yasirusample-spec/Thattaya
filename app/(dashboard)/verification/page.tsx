'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

export default function VerificationPage() {
  const [numbers, setNumbers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedNum, setSelectedNum] = useState('')
  const [service, setService] = useState('Google')
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState<Record<string, boolean>>({})
  const pollTimers = useRef<Record<string, any>>({})

  useEffect(() => {
    fetch('/api/ivasms/numbers').then(r=>r.json()).then(d=>setNumbers(d.numbers||[])).catch(()=>{})
    fetchSessions()
    const t = setInterval(fetchSessions, 5000)
    return () => { clearInterval(t); Object.values(pollTimers.current).forEach(clearInterval) }
  }, [])

  const fetchSessions = async () => {
    try {
      const r = await fetch('/api/verification')
      if (r.ok) { const d = await r.json(); setSessions(d.sessions || []) }
    } catch {}
  }

  const startVerification = async () => {
    if (!selectedNum) return
    setLoading(true)
    try {
      const r = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberId: selectedNum, service }),
      })
      const d = await r.json()
      if (d.session) {
        setSessions(p => [d.session, ...p])
        startPolling(d.session.id)
      }
    } catch {}
    setLoading(false)
  }

  const startPolling = (sessionId: string) => {
    setPolling(p => ({ ...p, [sessionId]: true }))
    let tries = 0
    pollTimers.current[sessionId] = setInterval(async () => {
      tries++
      try {
        const r = await fetch('/api/verification', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const d = await r.json()
        if (d.session) {
          setSessions(p => p.map(s => s.id === sessionId ? d.session : s))
          if (d.session.status === 'received' || d.session.status === 'expired' || tries > 60) {
            clearInterval(pollTimers.current[sessionId])
            setPolling(p => { const n = { ...p }; delete n[sessionId]; return n })
          }
        }
      } catch {}
    }, 3000)
  }

  const stopPolling = (sessionId: string) => {
    if (pollTimers.current[sessionId]) { clearInterval(pollTimers.current[sessionId]); delete pollTimers.current[sessionId] }
    setPolling(p => { const n = { ...p }; delete n[sessionId]; return n })
  }

  const copyOtp = (otp: string) => { navigator.clipboard.writeText(otp).catch(() => {}) }

  const services = ['Google', 'WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'Twitter', 'Amazon', 'Microsoft', 'Apple', 'TikTok', 'Other']

  const activeNum = numbers.find(n => n.id === selectedNum)

  const fmtTime = (t: string) => { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return t } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>OTP Verification</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>Start a verification session and receive OTPs live</p>
      </div>

      <div className="two-col">
        {/* New Session */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-shield-check" style={{ fontSize: 17, color: 'var(--accent)' }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>New Verification Session</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label"><i className="bi bi-phone-fill" style={{ marginRight: 5 }} />Select Number</label>
              <select value={selectedNum} onChange={e => setSelectedNum(e.target.value)}>
                <option value="">— Choose a number —</option>
                {numbers.filter(n => n.status === 'active').map(n => (
                  <option key={n.id} value={n.id}>{n.flag} {n.phone} ({n.country})</option>
                ))}
              </select>
              {numbers.filter(n => n.status === 'active').length === 0 && (
                <p className="form-hint"><i className="bi bi-info-circle-fill" style={{ marginRight: 4 }} />Sync iVASMS first to load active numbers</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label"><i className="bi bi-app-indicator" style={{ marginRight: 5 }} />Service / Platform</label>
              <select value={service} onChange={e => setService(e.target.value)}>
                {services.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {activeNum && (
              <div style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Selected Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{activeNum.flag}</span>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{activeNum.phone}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{activeNum.country} · {activeNum.sms_count || 0} SMS received</div>
                  </div>
                  <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
                    <i className="bi bi-circle-fill" style={{ fontSize: 7 }} />Active
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={startVerification}
              disabled={!selectedNum || loading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <i className="bi bi-shield-check" style={{ fontSize: 16 }} />
              {loading ? 'Starting…' : `Start ${service} Verification`}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(41,121,255,.1)', border: '1px solid rgba(41,121,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-info-circle-fill" style={{ fontSize: 17, color: 'var(--blue)' }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>How It Works</h3>
          </div>
          {[
            { n: '1', icon: 'bi-phone-fill', color: 'var(--accent)', title: 'Select Number', desc: 'Choose an active phone number from your iVASMS account' },
            { n: '2', icon: 'bi-app-indicator', color: 'var(--blue)', title: 'Choose Service', desc: 'Select the platform you want to verify with (Google, WhatsApp, etc.)' },
            { n: '3', icon: 'bi-shield-check', color: 'var(--orange)', title: 'Enter Number on Platform', desc: 'Use the selected phone number on the service you want to register' },
            { n: '4', icon: 'bi-key-fill', color: 'var(--green)', title: 'OTP Auto-Detected', desc: 'The system polls iVASMS every 3s and shows the OTP instantly' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: `${s.color}18`, border: `1px solid ${s.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`bi ${s.icon}`} style={{ fontSize: 14, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-shield-check" style={{ color: 'var(--accent)', fontSize: 15 }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Verification Sessions</span>
            <span className="badge badge-gray">{sessions.length}</span>
            {Object.keys(polling).length > 0 && <span className="live-badge" style={{ marginLeft: 'auto' }}><span className="live-dot" />Polling for OTP</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sessions.map((s: any) => (
              <div key={s.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(28,28,46,.5)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{s.phone_number}</span>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{s.service}</span>
                    {s.status === 'waiting' && polling[s.id] && (
                      <span className="live-badge" style={{ fontSize: 10 }}><span className="live-dot" />Waiting for OTP</span>
                    )}
                    {s.status === 'received' && (
                      <span className="badge badge-green"><i className="bi bi-check-circle-fill" style={{ fontSize: 9 }} />Received</span>
                    )}
                    {s.status === 'expired' && (
                      <span className="badge badge-gray"><i className="bi bi-clock-fill" style={{ fontSize: 9 }} />Expired</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    <i className="bi bi-clock-fill" style={{ marginRight: 4 }} />Started {fmtTime(s.created_at)}
                    {s.expires_at && ` · Expires ${fmtTime(s.expires_at)}`}
                  </div>
                </div>
                {s.otp ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="otp-display" style={{ fontSize: 28, padding: '10px 20px', letterSpacing: 8 }}>{s.otp}</div>
                    <button onClick={() => copyOtp(s.otp)} className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="bi bi-clipboard-fill" style={{ fontSize: 12 }} />Copy
                    </button>
                  </div>
                ) : s.status === 'waiting' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 18, color: 'var(--orange)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text3)' }}>
                      {polling[s.id] ? 'Waiting for OTP…' : 'No OTP yet'}
                    </span>
                    {!polling[s.id] && (
                      <button onClick={() => startPolling(s.id)} className="btn-secondary btn-xs">Resume Poll</button>
                    )}
                  </div>
                ) : null}
                {polling[s.id] && (
                  <button onClick={() => stopPolling(s.id)} className="btn-danger btn-xs" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="bi bi-x" style={{ fontSize: 13 }} />Stop
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
