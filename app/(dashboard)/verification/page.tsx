'use client'
import { useState, useEffect, useCallback } from 'react'

export default function VerificationPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [numbers, setNumbers] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ phoneNumber: '', service: '', numberId: '' })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const r = await fetch('/api/verification')
      if (r.ok) {
        const { sessions: s } = await r.json()
        setSessions(s || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchSessions()
    fetch('/api/ivasms/numbers').then(r => r.json()).then(d => setNumbers(d.numbers || [])).catch(() => {})
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phoneNumber) return
    setCreating(true)
    try {
      const r = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        setShowModal(false)
        setForm({ phoneNumber: '', service: '', numberId: '' })
        fetchSessions()
      }
    } catch {}
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/verification?id=${id}`, { method: 'DELETE' })
      fetchSessions()
    } catch {}
  }

  const copyOTP = (otp: string, id: string) => {
    navigator.clipboard.writeText(otp).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const statusConfig: Record<string, { badge: string; label: string; icon: string }> = {
    waiting: { badge: 'badge-orange', label: 'Waiting', icon: '⌛' },
    received: { badge: 'badge-green', label: 'OTP Received', icon: '✅' },
    expired: { badge: 'badge-red', label: 'Expired', icon: '❌' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>✅ Verification</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Monitor OTP codes in real-time</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
          + New Verification Session
        </button>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>No active sessions</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Create a new session to start monitoring OTPs</p>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 20px' }}>
            + New Session
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {sessions.map((s: any) => {
            const cfg = statusConfig[s.status] || statusConfig.waiting
            const isWaiting = s.status === 'waiting'
            const hasOTP = s.status === 'received' && s.otp

            return (
              <div key={s.id} className="card" style={{
                border: hasOTP ? '1px solid rgba(0,200,83,.4)' : isWaiting ? '1px solid rgba(255,152,0,.3)' : '1px solid var(--border)',
                transition: 'all .3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Number</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{s.phone_number}</div>
                  </div>
                  <span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Service</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{s.service || 'Unknown'}</div>
                  </div>
                  {isWaiting && s.expires_at && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Expires in</div>
                      <div style={{ fontSize: 13, color: '#ff9800', fontWeight: 600, fontFamily: 'monospace' }}>
                        {getTimeRemaining(s.expires_at)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Created</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleTimeString() : '-'}
                    </div>
                  </div>
                </div>

                {/* Waiting animation */}
                {isWaiting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,152,0,.08)', borderRadius: 8, marginBottom: 12 }}>
                    <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: 14 }}>⟳</span>
                    <span style={{ fontSize: 12, color: '#ff9800' }}>Waiting for SMS OTP... polling every 5s</span>
                  </div>
                )}

                {/* OTP display */}
                {hasOTP && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="otp-display" style={{ marginBottom: 10 }}>{s.otp}</div>
                    <button
                      onClick={() => copyOTP(s.otp, s.id)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: copiedId === s.id ? 'rgba(0,200,83,.15)' : 'rgba(229,9,20,.1)',
                        border: `1px solid ${copiedId === s.id ? 'rgba(0,200,83,.4)' : 'rgba(229,9,20,.3)'}`,
                        color: copiedId === s.id ? 'var(--green)' : 'var(--accent)',
                        cursor: 'pointer', transition: 'all .2s',
                      }}
                    >
                      {copiedId === s.id ? '✓ Copied!' : '📋 Copy OTP'}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleDelete(s.id)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 6, fontSize: 12,
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text3)', cursor: 'pointer', transition: 'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(229,9,20,.4)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
                >
                  🗑 Delete Session
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div
            className="card"
            style={{ width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              + New Verification Session
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>PICK NUMBER</label>
                <select value={form.numberId} onChange={e => {
                  const num = numbers.find((n: any) => n.id === e.target.value)
                  setForm(p => ({ ...p, numberId: e.target.value, phoneNumber: num?.phone || '' }))
                }}>
                  <option value="">Select a number...</option>
                  {numbers.map((n: any) => (
                    <option key={n.id} value={n.id}>{n.flag} {n.phone} ({n.country})</option>
                  ))}
                </select>
              </div>
              {!form.numberId && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>OR ENTER NUMBER MANUALLY</label>
                  <input type="tel" value={form.phoneNumber} placeholder="+1 555 847 2910"
                    onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>SERVICE</label>
                <input type="text" value={form.service} placeholder="Google, WhatsApp, Telegram..."
                  onChange={e => setForm(p => ({ ...p, service: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || (!form.phoneNumber && !form.numberId)} className="btn-primary" style={{ flex: 1 }}>
                  {creating ? '⟳ Creating...' : '▶ Start Waiting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
