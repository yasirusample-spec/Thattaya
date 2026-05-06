'use client'
import { useState, useEffect, useCallback } from 'react'

export default function BulkSMSPage() {
  const [numbers,   setNumbers]   = useState<any[]>([])
  const [history,   setHistory]   = useState<any[]>([])
  const [selected,  setSelected]  = useState<string[]>([])
  const [message,   setMessage]   = useState('')
  const [channel,   setChannel]   = useState('telegram')
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState<any>(null)
  const [tab,       setTab]       = useState<'compose'|'history'>('compose')
  const [customNums,setCustomNums]= useState('')

  const load = useCallback(async () => {
    try {
      const [nr, hr] = await Promise.all([
        fetch('/api/ivasms/numbers').then(r => r.json()),
        fetch('/api/bulk/history').then(r => r.json()),
      ])
      setNumbers(nr.numbers || [])
      setHistory(hr.history || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const toggleNum = (phone: string) => {
    setSelected(s => s.includes(phone) ? s.filter(p => p !== phone) : [...s, phone])
  }

  const selectAll = () => setSelected(numbers.map(n => n.phone))
  const clearSel  = () => setSelected([])

  const send = async () => {
    const targets = [
      ...selected,
      ...customNums.split('\n').map(s => s.trim()).filter(Boolean),
    ]
    if (targets.length === 0) { setResult({ error: 'Select at least one number or enter custom numbers' }); return }
    if (!message.trim()) { setResult({ error: 'Message is required' }); return }
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/bulk/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: targets, message: message.trim(), channel }),
      })
      const d = await r.json()
      setResult(d)
      if (d.ok) { setMessage(''); setSelected([]); setCustomNums(''); load() }
    } catch (e: any) {
      setResult({ error: e.message || 'Network error' })
    }
    setSending(false)
  }

  const fmtTime = (ts: string) => {
    try { return new Date(ts).toLocaleString() } catch { return ts }
  }

  const charCount = message.length
  const smsCount  = Math.ceil(charCount / 160) || 0
  const totalNums = selected.length + customNums.split('\n').filter(s => s.trim()).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-send-fill" style={{ color: 'var(--accent)', fontSize: 20 }} />
          Bulk Message
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
          Send messages to multiple numbers via Telegram or simulated channel
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-item ${tab === 'compose' ? 'active' : ''}`} onClick={() => setTab('compose')}>
          <i className="bi bi-pencil-fill" style={{ marginRight: 6, fontSize: 12 }} />Compose
        </button>
        <button className={`tab-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <i className="bi bi-clock-history" style={{ marginRight: 6, fontSize: 12 }} />History
          {history.length > 0 && <span style={{ marginLeft: 6, background: 'var(--border)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{history.length}</span>}
        </button>
      </div>

      {tab === 'compose' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Left: Recipients */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="bi bi-people-fill" style={{ color: 'var(--blue)', fontSize: 14 }} />
                  iVASMS Numbers ({numbers.length})
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAll} className="btn-ghost btn-sm" style={{ fontSize: 11 }}>All</button>
                  <button onClick={clearSel}  className="btn-ghost btn-sm" style={{ fontSize: 11 }}>None</button>
                </div>
              </div>
              {numbers.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>
                  No numbers. Sync iVASMS first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflowY: 'auto' }}>
                  {numbers.map((n: any) => (
                    <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: selected.includes(n.phone) ? 'rgba(229,9,20,.08)' : 'var(--bg2)', border: `1px solid ${selected.includes(n.phone) ? 'rgba(229,9,20,.3)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .15s' }}>
                      <input type="checkbox" checked={selected.includes(n.phone)} onChange={() => toggleNum(n.phone)} style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{n.phone}</span>
                      <span style={{ fontSize: 10, color: n.status === 'active' ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>
                        {n.status === 'active' ? '● Active' : '○ Inactive'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-plus-circle-fill" style={{ color: 'var(--green)', fontSize: 13 }} />
                Custom Numbers
              </h3>
              <textarea
                value={customNums}
                onChange={e => setCustomNums(e.target.value)}
                placeholder={`+1234567890\n+9876543210\nOne number per line`}
                style={{ minHeight: 100, fontFamily: 'monospace', fontSize: 12 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                {customNums.split('\n').filter(s => s.trim()).length} custom number(s)
              </p>
            </div>
          </div>

          {/* Right: Compose */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-chat-square-text-fill" style={{ color: 'var(--accent)', fontSize: 14 }} />
                Message
              </h3>

              {/* Channel selector */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Send Via</label>
                <select value={channel} onChange={e => setChannel(e.target.value)}>
                  <option value="telegram">Telegram Bot</option>
                  <option value="simulated">Simulated (Demo)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Message Body</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here…"
                  style={{ minHeight: 140 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'var(--text3)' }}>
                  <span>{charCount} characters</span>
                  <span>{smsCount} SMS segment{smsCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recipients:</span>
                    <strong style={{ color: 'var(--text)' }}>{totalNums}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Channel:</span>
                    <strong style={{ color: 'var(--text)' }}>{channel}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SMS segments:</span>
                    <strong style={{ color: 'var(--text)' }}>{smsCount}</strong>
                  </div>
                </div>
              </div>

              <button onClick={send} disabled={sending || totalNums === 0 || !message.trim()} className="btn-primary" style={{ width: '100%' }}>
                <i className="bi bi-send-fill" style={{ fontSize: 14 }} />
                {sending ? 'Sending…' : `Send to ${totalNums} recipient${totalNums !== 1 ? 's' : ''}`}
              </button>

              {result && (
                <div className={`alert ${result.error ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 12 }}>
                  <i className={`bi ${result.error ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`} />
                  {result.error || `Sent to ${result.sent} recipients`}
                </div>
              )}
            </div>

            {channel === 'telegram' && (
              <div className="alert alert-info">
                <i className="bi bi-telegram" />
                <div>
                  Telegram channel requires a configured bot token and chat ID. Go to{' '}
                  <a href="/settings" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Settings → Telegram Bot</a>{' '}
                  to configure.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {history.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
              <i className="bi bi-clock-history" style={{ fontSize: 40, display: 'block', marginBottom: 14, opacity: .2 }} />
              <p>No bulk sends yet. Compose a message to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Channel</th>
                  <th>Recipients</th>
                  <th>Sent</th>
                  <th>Message Preview</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtTime(h.ts)}</td>
                    <td>
                      <span className={`badge ${h.channel === 'telegram' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        <i className={`bi ${h.channel === 'telegram' ? 'bi-telegram' : 'bi-cpu'}`} style={{ marginRight: 4 }} />
                        {h.channel}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text)' }}>{h.count}</td>
                    <td>
                      <span style={{ color: 'var(--green)', fontWeight: 700 }}>{h.success}</span>
                      <span style={{ color: 'var(--text3)', fontSize: 11 }}> / {h.count}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
