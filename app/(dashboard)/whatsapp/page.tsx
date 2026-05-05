'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'

export default function WhatsAppPage() {
  const [status, setStatus] = useState<any>(null)
  const [numbers, setNumbers] = useState<any[]>([])
  const [selectedNumber, setSelectedNumber] = useState('')
  const [creating, setCreating] = useState(false)
  const [creationStep, setCreationStep] = useState(0)
  const [creationStepName, setCreationStepName] = useState('')
  const [creationError, setCreationError] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<any>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/whatsapp/status')
      if (r.ok) {
        const d = await r.json()
        setStatus(d)
        if (d.token && !qrDataUrl) {
          const appUrl = window.location.origin
          const qrContent = `dlchat://connect?token=${d.token}&url=${appUrl}`
          QRCode.toDataURL(qrContent, {
            color: { dark: '#e50914', light: '#14141e' },
            width: 200, margin: 2,
          }).then(url => setQrDataUrl(url)).catch(() => {})
        }
      }
    } catch {}
  }, [qrDataUrl])

  useEffect(() => {
    fetchStatus()
    fetch('/api/ivasms/numbers').then(r => r.json()).then(d => setNumbers((d.numbers || []).filter((n: any) => n.status === 'active'))).catch(() => {})
  }, [fetchStatus])

  const handleCreate = async () => {
    if (!selectedNumber) return
    setCreating(true)
    setCreationError('')
    setCreationStep(1)
    setCreationStepName('Number selected')

    // Poll creation status
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/whatsapp/status')
        const d = await r.json()
        if (d.creationStatus) {
          setCreationStep(d.creationStatus.step)
          setCreationStepName(d.creationStatus.stepName)
          if (d.creationStatus.status === 'done') {
            clearInterval(pollRef.current)
            setCreating(false)
            fetchStatus()
          } else if (d.creationStatus.status === 'error') {
            clearInterval(pollRef.current)
            setCreationError(d.creationStatus.error || 'Creation failed')
            setCreating(false)
          }
        }
        if (d.hasWhatsApp) {
          clearInterval(pollRef.current)
          setCreating(false)
          fetchStatus()
        }
      } catch {}
    }, 3000)

    try {
      const r = await fetch('/api/whatsapp/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: selectedNumber }),
      })
      const d = await r.json()
      clearInterval(pollRef.current)
      if (r.ok && d.success) {
        setCreationStep(5)
        setCreationStepName('Account created!')
        setCreating(false)
        fetchStatus()
      } else {
        setCreationError(d.error || 'Creation failed')
        setCreating(false)
      }
    } catch (err: any) {
      clearInterval(pollRef.current)
      setCreationError(err.message)
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete your WhatsApp account? This cannot be undone.')) return
    try {
      await fetch('/api/whatsapp/status', { method: 'DELETE' })
      setStatus(null)
      setQrDataUrl('')
      fetchStatus()
    } catch {}
  }

  const copyToken = () => {
    if (status?.token) {
      navigator.clipboard.writeText(status.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const steps = [
    { n: 1, label: 'Number selected' },
    { n: 2, label: 'Requesting verification code...' },
    { n: 3, label: 'Waiting for SMS OTP from iVASMS...' },
    { n: 4, label: 'Verifying account...' },
    { n: 5, label: 'Account created!' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>💬 WhatsApp</h2>
        <span className="badge badge-red">BETA</span>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: -16 }}>
        Create and manage WhatsApp accounts using your iVASMS numbers
      </p>

      {!status?.hasWhatsApp ? (
        /* No WhatsApp account */
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Create Your WhatsApp Account
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 6, lineHeight: 1.6 }}>
              Use one of your active iVASMS numbers to create a real WhatsApp account.
            </p>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 24 }}>
              Limited to 1 account per user during beta.
            </p>

            {!creating ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <select value={selectedNumber} onChange={e => setSelectedNumber(e.target.value)}
                  style={{ textAlign: 'left' }}>
                  <option value="">Select a number...</option>
                  {numbers.map((n: any) => (
                    <option key={n.id} value={n.phone}>{n.flag} {n.phone} ({n.country})</option>
                  ))}
                </select>

                {creationError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, fontSize: 13,
                    background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)',
                    color: 'var(--accent)', textAlign: 'left',
                  }}>⚠️ {creationError}</div>
                )}

                <button onClick={handleCreate} disabled={!selectedNumber} className="btn-primary"
                  style={{ padding: '14px', fontSize: 14 }}>
                  💬 Create WhatsApp Account
                </button>

                {numbers.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                    No active numbers found. <a href="/numbers" style={{ color: 'var(--accent)' }}>Sync from iVASMS →</a>
                  </p>
                )}
              </div>
            ) : (
              /* Progress steps */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                {steps.map(step => {
                  const done = creationStep > step.n
                  const active = creationStep === step.n
                  return (
                    <div key={step.n} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8,
                      background: active ? 'rgba(229,9,20,.08)' : done ? 'rgba(0,200,83,.05)' : 'var(--bg2)',
                      border: `1px solid ${active ? 'rgba(229,9,20,.3)' : done ? 'rgba(0,200,83,.2)' : 'var(--border)'}`,
                      transition: 'all .3s',
                    }}>
                      <span style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>
                        {done ? '✅' : active ? <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>⟳</span> : '⌛'}
                      </span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)' }}>
                          Step {step.n}
                        </div>
                        <div style={{ fontSize: 13, color: active ? 'var(--text)' : done ? 'var(--green)' : 'var(--text3)' }}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Has WhatsApp account */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Account Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Your WhatsApp Account</h3>
              <span className="badge badge-green">● Online</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #25d366, #128c7e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                }}>💬</div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>PHONE NUMBER</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    {status.phone}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>● Active WhatsApp Account</div>
                </div>
              </div>

              {status.waData && (
                <div style={{ padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)' }}>
                  <div>Login: <span style={{ color: 'var(--text2)' }}>{status.waData.login || 'Connected'}</span></div>
                  {status.waData.expiration && <div>Expires: <span style={{ color: 'var(--text2)' }}>{new Date(status.waData.expiration * 1000).toLocaleDateString()}</span></div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={fetchStatus} className="btn-secondary" style={{ flex: 1, fontSize: 12 }}>🔄 Reconnect</button>
                <button onClick={handleDelete} style={{
                  flex: 1, fontSize: 12, padding: '10px', borderRadius: 8,
                  background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)',
                  color: 'var(--accent)', cursor: 'pointer',
                }}>🗑 Delete Account</button>
              </div>
            </div>
          </div>

          {/* DLChat Connection Card */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              📱 Connect DLChat Mobile App
            </h3>

            {qrDataUrl ? (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={qrDataUrl} alt="QR Code" style={{ borderRadius: 8, border: '2px solid var(--border)', width: 200, height: 200 }} />
              </div>
            ) : (
              <div style={{ width: 200, height: 200, background: 'var(--bg2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text3)', fontSize: 12 }}>
                Loading QR...
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>YOUR TOKEN</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={status.token || ''} style={{ fontSize: 11, flex: 1, fontFamily: 'monospace' }} />
                <button onClick={copyToken} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap',
                  background: copied ? 'rgba(0,200,83,.15)' : 'rgba(229,9,20,.1)',
                  border: `1px solid ${copied ? 'rgba(0,200,83,.4)' : 'rgba(229,9,20,.3)'}`,
                  color: copied ? 'var(--green)' : 'var(--accent)', cursor: 'pointer',
                }}>
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              Scan QR with DLChat app or enter token manually.
              <a href="/mobile" style={{ color: 'var(--accent)', marginLeft: 4 }}>Open DLChat →</a>
            </p>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div style={{ padding: '14px 18px', background: 'rgba(33,150,243,.06)', border: '1px solid rgba(33,150,243,.2)', borderRadius: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600, marginBottom: 4 }}>ℹ️ How it works</div>
        <ol style={{ fontSize: 12, color: 'var(--text2)', paddingLeft: 18, lineHeight: 2, margin: 0 }}>
          <li>Select an active iVASMS number</li>
          <li>App requests WA verification SMS to that number</li>
          <li>OTP is auto-read from iVASMS</li>
          <li>WhatsApp account is registered & stored</li>
          <li>Connect via DLChat mobile app using your token</li>
        </ol>
      </div>
    </div>
  )
}
