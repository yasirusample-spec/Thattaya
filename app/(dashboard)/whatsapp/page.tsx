'use client'
import { useState, useEffect, useCallback } from 'react'

export default function WhatsAppPage() {
  const [status,    setStatus]    = useState<any>(null)
  const [numbers,   setNumbers]   = useState<any[]>([])
  const [messages,  setMessages]  = useState<any[]>([])
  const [selNum,    setSelNum]    = useState('')
  const [linking,   setLinking]   = useState(false)
  const [unlink,    setUnlink]    = useState(false)
  const [sendTo,    setSendTo]    = useState('')
  const [sendMsg,   setSendMsg]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState<any>(null)
  const [tab,       setTab]       = useState<'status'|'messages'|'send'>('status')

  const load = useCallback(async () => {
    try {
      const [sr, nr] = await Promise.all([
        fetch('/api/whatsapp/status').then(r => r.json()),
        fetch('/api/ivasms/numbers').then(r => r.json()),
      ])
      setStatus(sr)
      setNumbers((nr.numbers || []).filter((n: any) => n.status === 'active'))
      if (sr.connected) {
        const mr = await fetch('/api/whatsapp/messages')
        if (mr.ok) { const d = await mr.json(); setMessages(d.messages || []) }
      }
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const linkNumber = async () => {
    if (!selNum) { setResult({ error: 'Select a number to link' }); return }
    const num = numbers.find((n: any) => n.id === selNum)
    setLinking(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberId: selNum, numberPhone: num?.phone }),
      })
      const d = await r.json()
      if (d.ok) { setResult({ success: `WhatsApp linked to ${d.phone}` }); load() }
      else setResult({ error: d.error || 'Link failed' })
    } catch (e: any) { setResult({ error: e.message }) }
    setLinking(false)
  }

  const unlinkNumber = async () => {
    if (!confirm('Unlink WhatsApp number?')) return
    setUnlink(true)
    try {
      await fetch('/api/whatsapp/unlink', { method: 'POST' })
      load()
    } catch {}
    setUnlink(false)
  }

  const sendMessage = async () => {
    if (!sendTo || !sendMsg.trim()) return
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sendTo, message: sendMsg }),
      })
      const d = await r.json()
      if (d.ok) { setResult({ success: 'Message sent!' }); setSendMsg('') }
      else setResult({ error: d.error || 'Send failed' })
    } catch {}
    setSending(false)
  }

  const fmtTime = (ts: string) => {
    try { return new Date(ts).toLocaleString() } catch { return ts }
  }

  const connected = status?.connected

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-whatsapp" style={{ color: '#25d366', fontSize: 20 }} />
            WhatsApp
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            Link an iVASMS number for WhatsApp integration
          </p>
        </div>
        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          background: connected ? 'rgba(37,211,102,.08)' : 'rgba(255,255,255,.04)',
          border: `1px solid ${connected ? 'rgba(37,211,102,.25)' : 'var(--border)'}`,
          borderRadius: 20, fontSize: 13, fontWeight: 700,
          color: connected ? '#25d366' : 'var(--text3)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#25d366' : 'var(--text3)',
            animation: connected ? 'livePulse 2s ease-in-out infinite' : 'none',
          }} />
          {connected ? `Connected: ${status?.number}` : 'Disconnected'}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-item ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>
          <i className="bi bi-info-circle-fill" style={{ marginRight: 6, fontSize: 12 }} />Status & Setup
        </button>
        <button className={`tab-item ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')}>
          <i className="bi bi-chat-dots-fill" style={{ marginRight: 6, fontSize: 12 }} />
          Messages {messages.length > 0 && <span style={{ marginLeft: 4, background: 'var(--border)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{messages.length}</span>}
        </button>
        <button className={`tab-item ${tab === 'send' ? 'active' : ''}`} onClick={() => setTab('send')}>
          <i className="bi bi-send-fill" style={{ marginRight: 6, fontSize: 12 }} />Send Message
        </button>
      </div>

      {tab === 'status' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!connected ? (
            /* Link number */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(37,211,102,.1)', border: '1px solid rgba(37,211,102,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-link-45deg" style={{ fontSize: 17, color: '#25d366' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Link iVASMS Number</h3>
              </div>

              {/* Steps */}
              <div className="steps" style={{ marginBottom: 24 }}>
                {['Sync Numbers', 'Select Number', 'Link WhatsApp'].map((step, i) => (
                  <div key={step} className="step">
                    <div className={`step-num ${i === 0 && numbers.length > 0 ? 'done' : i === 0 ? 'active' : 'pending'}`}>
                      {i === 0 && numbers.length > 0 ? <i className="bi bi-check-lg" style={{ fontSize: 12 }} /> : i + 1}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{step}</div>
                    {i < 2 && <div className={`step-line ${i === 0 && numbers.length > 0 ? 'done' : ''}`} />}
                  </div>
                ))}
              </div>

              {numbers.length === 0 ? (
                <div className="alert alert-warn" style={{ marginBottom: 16 }}>
                  <i className="bi bi-exclamation-triangle-fill" />
                  <div>
                    No active numbers found. Go to{' '}
                    <a href="/numbers" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>Numbers</a>{' '}
                    and sync your iVASMS account first.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Select a number to link</label>
                    <select value={selNum} onChange={e => setSelNum(e.target.value)}>
                      <option value="">— Choose a number —</option>
                      {numbers.map((n: any) => (
                        <option key={n.id} value={n.id}>
                          {n.phone} ({n.country_name || n.country})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={linkNumber} disabled={linking || !selNum} className="btn-success" style={{ gap: 8 }}>
                    <i className="bi bi-whatsapp" style={{ fontSize: 16 }} />
                    {linking ? 'Linking…' : 'Link to WhatsApp'}
                  </button>
                </div>
              )}

              {result && (
                <div className={`alert ${result.error ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 14 }}>
                  <i className={`bi ${result.error ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`} />
                  {result.error || result.success}
                </div>
              )}
            </div>
          ) : (
            /* Connected status */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(37,211,102,.12)', border: '2px solid rgba(37,211,102,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-whatsapp" style={{ fontSize: 28, color: '#25d366' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>WhatsApp Connected</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 3, fontFamily: 'monospace' }}>{status?.number}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => setTab('messages')} className="btn-success btn-sm">
                  <i className="bi bi-chat-dots-fill" style={{ fontSize: 13 }} />View Messages
                </button>
                <button onClick={() => setTab('send')} className="btn-primary btn-sm">
                  <i className="bi bi-send-fill" style={{ fontSize: 12 }} />Send Message
                </button>
                <button onClick={unlinkNumber} disabled={unlink} className="btn-danger btn-sm">
                  <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                  {unlink ? 'Unlinking…' : 'Unlink'}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="alert alert-info">
            <i className="bi bi-info-circle-fill" />
            <div>
              <strong>DL SMS Client WhatsApp Integration</strong> links one of your iVASMS phone numbers for WhatsApp.
              SMS messages received on that number will appear in the Messages tab. This is a <strong>receive-only integration</strong> —
              WhatsApp send functionality is simulated in this edge deployment. Full send requires a Node.js backend with Baileys/Whatsmeow.
            </div>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-chat-dots-fill" style={{ color: '#25d366', fontSize: 15 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Messages {connected ? `for ${status?.number}` : '— Not connected'}
            </span>
            <button onClick={load} className="btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
              <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />Refresh
            </button>
          </div>
          {!connected ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <i className="bi bi-whatsapp" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: .2 }} />
              Link a WhatsApp number first to see messages.
            </div>
          ) : messages.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <i className="bi bi-chat-dots-fill" style={{ fontSize: 36, display: 'block', marginBottom: 12, opacity: .2 }} />
              No messages yet. Sync iVASMS to load SMS for this number.
            </div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
              {messages.map((m: any) => (
                <div key={m.id} className="sms-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <i className="bi bi-person-circle" style={{ color: '#25d366', fontSize: 14 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{m.sender}</span>
                    {m.otp && <span style={{ background: 'rgba(37,211,102,.12)', color: '#25d366', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', letterSpacing: 2 }}>{m.otp}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>{fmtTime(m.received_at)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'send' && (
        <div className="card" style={{ maxWidth: 540 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-send-fill" style={{ color: '#25d366', fontSize: 14 }} />Send WhatsApp Message
          </h3>
          {!connected && (
            <div className="alert alert-warn" style={{ marginBottom: 16 }}>
              <i className="bi bi-exclamation-triangle-fill" />
              Link a WhatsApp number first before sending messages.
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">To (phone number)</label>
            <div className="input-group">
              <i className="bi bi-telephone-fill input-icon" />
              <input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="+1234567890" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Message</label>
            <textarea value={sendMsg} onChange={e => setSendMsg(e.target.value)} placeholder="Type your message…" style={{ minHeight: 100 }} />
          </div>
          <button onClick={sendMessage} disabled={sending || !connected || !sendTo || !sendMsg.trim()} className="btn-success" style={{ gap: 8 }}>
            <i className="bi bi-send-fill" style={{ fontSize: 14 }} />
            {sending ? 'Sending…' : 'Send Message'}
          </button>
          {result && (
            <div className={`alert ${result.error ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 12 }}>
              <i className={`bi ${result.error ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`} />
              {result.error || result.success}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
