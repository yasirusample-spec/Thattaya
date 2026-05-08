'use client'
import { useState, useEffect, useCallback } from 'react'

export default function WebhooksPage() {
  const [config,   setConfig]   = useState({ url: '', events: [] as string[] })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [msg,      setMsg]      = useState<{ok:boolean;text:string}|null>(null)
  const [logs,     setLogs]     = useState<any[]>([])

  const EVENTS = [
    { id: 'sms.received',    label: 'SMS Received',    icon: 'bi-chat-dots-fill',     desc: 'When new SMS arrives' },
    { id: 'otp.received',    label: 'OTP Received',    icon: 'bi-key-fill',           desc: 'When OTP message is detected' },
    { id: 'sync.complete',   label: 'Sync Complete',   icon: 'bi-arrow-repeat',       desc: 'After every iVASMS sync' },
    { id: 'whatsapp.linked', label: 'WhatsApp Linked', icon: 'bi-whatsapp',           desc: 'When WhatsApp number is linked' },
    { id: 'number.added',    label: 'Number Added',    icon: 'bi-phone-fill',         desc: 'When a new number is synced' },
    { id: 'bulk.sent',       label: 'Bulk Sent',       icon: 'bi-send-fill',          desc: 'After bulk send completes' },
  ]

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/webhooks')
      if (r.ok) {
        const d = await r.json()
        setConfig({ url: d.current?.url || '', events: d.current?.events || [] })
        setLogs(d.webhooks || [])
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      const r = await fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
      const d = await r.json()
      if (d.ok) setMsg({ ok: true, text: 'Webhook configuration saved!' })
      else setMsg({ ok: false, text: d.error || 'Failed to save' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  const test = async () => {
    setTesting(true); setMsg(null)
    try {
      const r = await fetch('/api/webhooks/test', { method: 'POST' })
      const d = await r.json()
      if (d.ok) setMsg({ ok: true, text: `Test successful! Status: ${d.status}` })
      else setMsg({ ok: false, text: d.error || 'Test failed' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    setTesting(false)
  }

  const toggleEvent = (id: string) => {
    setConfig(c => ({
      ...c,
      events: c.events.includes(id) ? c.events.filter(e => e !== id) : [...c.events, id]
    }))
  }

  const selectAll = () => setConfig(c => ({ ...c, events: EVENTS.map(e => e.id) }))
  const clearAll  = () => setConfig(c => ({ ...c, events: [] }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            <i className="bi bi-globe-americas" style={{ marginRight: 10, color: 'var(--accent)' }} />Webhooks
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Receive real-time HTTP notifications on events</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {config.url && (
            <button onClick={test} disabled={testing} className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>
              <i className={`bi bi-${testing ? 'hourglass-split' : 'send'}`} style={{ marginRight: 6 }} />
              {testing ? 'Testing…' : 'Send Test'}
            </button>
          )}
          <button onClick={save} disabled={saving} className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>
            <i className="bi bi-floppy-fill" style={{ marginRight: 6 }} />{saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>

      {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20 }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-link-45deg" style={{ color: 'var(--accent)' }} />Endpoint URL
            </h3>
            <input
              value={config.url}
              onChange={e => setConfig(c => ({...c, url: e.target.value}))}
              placeholder="https://your-server.com/webhook"
              className="input" style={{ width: '100%', marginBottom: 10 }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
              <i className="bi bi-info-circle" style={{ marginRight: 5 }} />
              Your server must respond with <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, color: 'var(--green)' }}>2xx</code> status.
              Leave empty to disable webhooks.
            </p>
          </div>

          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-lightning-charge-fill" style={{ color: '#f59e0b' }} />Events to Send
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={selectAll} className="btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }}>All</button>
                <button onClick={clearAll}  className="btn-ghost" style={{ fontSize: 10, padding: '4px 8px' }}>None</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EVENTS.map(ev => (
                <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${config.events.includes(ev.id) ? 'var(--accent)' : 'var(--border)'}`, background: config.events.includes(ev.id) ? 'rgba(229,9,20,.06)' : 'var(--bg)', transition: 'all .15s' }}>
                  <input type="checkbox" checked={config.events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} style={{ flexShrink: 0 }} />
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: config.events.includes(ev.id) ? 'rgba(229,9,20,.15)' : 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`bi ${ev.icon}`} style={{ fontSize: 14, color: config.events.includes(ev.id) ? 'var(--accent)' : 'var(--text3)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ev.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{ev.desc}</div>
                  </div>
                  <code style={{ marginLeft: 'auto', fontSize: 9.5, background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{ev.id}</code>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '12px 0 0' }}>
              <i className="bi bi-info-circle" style={{ marginRight: 5 }} />
              If no events selected, all events will be sent.
            </p>
          </div>
        </div>

        {/* Payload info + logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-code-slash" style={{ color: '#3b82f6' }} />Payload Format
            </h3>
            <pre style={{ background: 'var(--bg)', padding: '14px 16px', borderRadius: 8, fontSize: 11, color: 'var(--green)', overflow: 'auto', lineHeight: 1.7, border: '1px solid var(--border)', margin: 0 }}>
{`{
  "event": "otp.received",
  "payload": {
    "count": 1,
    "otps": 1
  },
  "ts": "2026-05-06T12:00:00.000Z"
}`}
            </pre>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Headers sent</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['Content-Type', 'application/json'],
                  ['X-DL-Event', 'event.name'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                    <code style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{k}</code>
                    <code style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, color: 'var(--text3)' }}>{v}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-journal-text" style={{ color: 'var(--accent)' }} />Registered Webhooks ({logs.length})
              </h3>
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                <i className="bi bi-globe2" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                No webhooks registered yet.
              </div>
            ) : (
              logs.map((l: any) => (
                <div key={l.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.active ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{l.events?.length ? l.events.join(', ') : 'All events'}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{new Date(l.created_at).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>

          {/* Guide */}
          <div className="card" style={{ padding: '18px 20px', background: 'rgba(59,130,246,.05)', borderColor: 'rgba(59,130,246,.2)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-lightbulb-fill" />Quick Guide
            </h3>
            <ol style={{ fontSize: 12, color: 'var(--text2)', margin: 0, paddingLeft: 18, lineHeight: 2 }}>
              <li>Enter your server URL above</li>
              <li>Select which events to receive</li>
              <li>Click <strong>Save Config</strong></li>
              <li>Use <strong>Send Test</strong> to verify</li>
              <li>Check your server for the payload</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
