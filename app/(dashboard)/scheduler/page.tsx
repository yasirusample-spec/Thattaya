'use client'
import { useState, useEffect, useCallback } from 'react'

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [form,      setForm]      = useState({ name: '', type: 'sync', interval: 300, enabled: true })
  const [msg,       setMsg]       = useState<{ok:boolean;text:string}|null>(null)
  const [history,   setHistory]   = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      const [sr, hr] = await Promise.all([
        fetch('/api/scheduler').then(r => r.json()),
        fetch('/api/ivasms/sync-history').then(r => r.json()),
      ])
      setSchedules(sr.schedules || [])
      setHistory(hr.history || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.name.trim()) return
    setCreating(true); setMsg(null)
    try {
      const r = await fetch('/api/scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (d.ok) { setMsg({ ok: true, text: 'Schedule created!' }); load(); setForm({ name: '', type: 'sync', interval: 300, enabled: true }) }
      else setMsg({ ok: false, text: d.error || 'Failed' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) } finally { setCreating(false) }
  }

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/scheduler/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !enabled }) })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this schedule?')) return
    await fetch(`/api/scheduler/${id}`, { method: 'DELETE' })
    load()
  }

  const runNow = async (type: string) => {
    setMsg({ ok: true, text: 'Running…' })
    try {
      if (type === 'sync') {
        const r = await fetch('/api/ivasms/sync', { method: 'POST' })
        const d = await r.json()
        if (d.success) { setMsg({ ok: true, text: `Done! ${d.count} numbers, ${d.smsAdded} SMS` }); load() }
        else setMsg({ ok: false, text: d.error || 'Failed' })
      } else {
        setMsg({ ok: true, text: 'Action triggered!' })
      }
    } catch { setMsg({ ok: false, text: 'Error' }) }
  }

  const fmtInterval = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s/60)}m` : `${Math.round(s/3600)}h`
  const fmtTime = (ts: string) => { try { return new Date(ts).toLocaleString() } catch { return ts } }

  const TYPES = [
    { value: 'sync',       label: 'Auto Sync',      icon: 'bi-arrow-repeat',        desc: 'Sync iVASMS numbers and SMS' },
    { value: 'otp-check',  label: 'OTP Check',      icon: 'bi-key',                 desc: 'Check for new OTPs' },
    { value: 'export',     label: 'Auto Export',    icon: 'bi-download',            desc: 'Export SMS data periodically' },
    { value: 'notify',     label: 'Notification',   icon: 'bi-bell',                desc: 'Send scheduled notifications' },
  ]

  const INTERVALS = [
    { value: 60,    label: '1 minute'   },
    { value: 300,   label: '5 minutes'  },
    { value: 600,   label: '10 minutes' },
    { value: 1800,  label: '30 minutes' },
    { value: 3600,  label: '1 hour'     },
    { value: 7200,  label: '2 hours'    },
    { value: 21600, label: '6 hours'    },
    { value: 86400, label: '24 hours'   },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}><i className="bi bi-clock-fill" style={{ marginRight: 10, color: 'var(--accent)' }} />Scheduler</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Automate sync, exports, and notifications</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
        {/* Create Schedule */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-plus-circle-fill" style={{ color: 'var(--accent)' }} />New Schedule
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Schedule name…" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm(f => ({...f, type: t.value}))}
                    style={{
                      padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${form.type === t.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.type === t.value ? 'rgba(229,9,20,.12)' : 'var(--bg)', cursor: 'pointer',
                      textAlign: 'left', transition: 'all .15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`bi ${t.icon}`} style={{ fontSize: 13, color: form.type === t.value ? 'var(--accent)' : 'var(--text3)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: form.type === t.value ? 'var(--accent)' : 'var(--text2)' }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--text3)', marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>Interval</label>
              <select value={form.interval} onChange={e => setForm(f => ({...f, interval: Number(e.target.value)}))} className="input" style={{ width: '100%' }}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="sch-enabled" checked={form.enabled} onChange={e => setForm(f => ({...f, enabled: e.target.checked}))} />
              <label htmlFor="sch-enabled" style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>Enable immediately</label>
            </div>
            {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}
            <button onClick={create} disabled={creating || !form.name.trim()} className="btn-primary" style={{ width: '100%' }}>
              <i className="bi bi-plus-lg" style={{ marginRight: 8 }} />
              {creating ? 'Creating…' : 'Create Schedule'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-lightning-fill" style={{ color: '#f59e0b' }} />Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => runNow(t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                  cursor: 'pointer', transition: 'border-color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(229,9,20,.12)', border: '1px solid rgba(229,9,20,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`bi ${t.icon}`} style={{ fontSize: 15, color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{t.desc}</div>
                </div>
                <i className="bi bi-play-fill" style={{ color: 'var(--green)', fontSize: 16 }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedules list */}
      <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-list-check" style={{ color: 'var(--accent)' }} />Schedules ({schedules.length})
          </h3>
          <button onClick={load} className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>
            <i className="bi bi-arrow-clockwise" style={{ marginRight: 4 }} />Refresh
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 20 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />)}</div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <i className="bi bi-clock" style={{ fontSize: 40, color: 'var(--text3)', display: 'block', marginBottom: 10 }} />
            <p style={{ color: 'var(--text3)', margin: 0 }}>No schedules yet. Create one above.</p>
          </div>
        ) : (
          <div>
            {schedules.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: s.enabled ? 'rgba(0,230,118,.1)' : 'var(--bg)', border: `1px solid ${s.enabled ? 'rgba(0,230,118,.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi bi-clock${s.enabled ? '-fill' : ''}`} style={{ fontSize: 15, color: s.enabled ? 'var(--green)' : 'var(--text3)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                    <span><i className="bi bi-lightning-charge" style={{ marginRight: 3 }} />{s.type}</span>
                    <span><i className="bi bi-clock" style={{ marginRight: 3 }} />{fmtInterval(s.interval)}</span>
                    {s.lastRun && <span><i className="bi bi-check2-circle" style={{ marginRight: 3 }} />Last: {fmtTime(s.lastRun)}</span>}
                    {s.nextRun && <span><i className="bi bi-hourglass-split" style={{ marginRight: 3 }} />Next: {fmtTime(s.nextRun)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggle(s.id, s.enabled)} className={s.enabled ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 11, padding: '5px 10px' }}>
                    <i className={`bi bi-${s.enabled ? 'pause-fill' : 'play-fill'}`} style={{ marginRight: 4 }} />
                    {s.enabled ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => del(s.id)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 8px', color: 'var(--accent)' }}>
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync History */}
      <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-journal-text" style={{ color: 'var(--accent)' }} />Sync History (last {Math.min(history.length, 20)})
          </h3>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No sync history yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Time','Numbers','SMS Added','Status'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {history.slice(0, 20).map((h: any) => (
                  <tr key={h.id || h.ts} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text2)' }}>{fmtTime(h.ts)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>{h.count}</td>
                    <td style={{ padding: '10px 16px' }}><span style={{ color: h.smsAdded > 0 ? 'var(--green)' : 'var(--text3)', fontWeight: 700 }}>+{h.smsAdded || 0}</span></td>
                    <td style={{ padding: '10px 16px' }}><span className={`badge ${h.success ? 'badge-green' : 'badge-red'}`}>{h.success ? 'Success' : 'Error'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
