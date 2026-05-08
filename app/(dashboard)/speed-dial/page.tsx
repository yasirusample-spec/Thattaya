'use client'
import { useState, useEffect, useCallback } from 'react'

export default function SpeedDialPage() {
  const [entries,  setEntries]  = useState<any[]>([])
  const [numbers,  setNumbers]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState({ name: '', phone: '', service: '', note: '', shortcut: 1 })
  const [msg,      setMsg]      = useState<{ok:boolean;text:string}|null>(null)
  const [copying,  setCopying]  = useState<string|null>(null)

  const load = useCallback(async () => {
    try {
      const [er, nr] = await Promise.all([
        fetch('/api/speed-dial').then(r => r.json()),
        fetch('/api/ivasms/numbers').then(r => r.json()),
      ])
      setEntries(er.entries || [])
      setNumbers(nr.numbers || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.phone.trim()) { setMsg({ ok: false, text: 'Phone required' }); return }
    setMsg(null)
    try {
      const r = await fetch('/api/speed-dial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, shortcut: entries.length + 1 }) })
      const d = await r.json()
      if (d.ok) { setMsg({ ok: true, text: 'Added to speed dial!' }); setForm({ name: '', phone: '', service: '', note: '', shortcut: 1 }); load() }
      else setMsg({ ok: false, text: d.error || 'Failed' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
  }

  const del = async (id: string) => {
    await fetch(`/api/speed-dial/${id}`, { method: 'DELETE' }); load()
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopying(id)
    setTimeout(() => setCopying(null), 1500)
  }

  const prefill = (n: any) => setForm(f => ({ ...f, phone: n.phone, name: f.name || n.country_name || n.country }))

  const SVC_COLORS: Record<string, string> = {
    Google: '#3b82f6', WhatsApp: '#25d366', Telegram: '#0088cc',
    Facebook: '#1877f2', Twitter: '#1da1f2', Amazon: '#f59e0b',
    Microsoft: '#0078d4', Apple: '#888', Unknown: 'var(--text3)',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            <i className="bi bi-lightning-charge-fill" style={{ marginRight: 10, color: '#f59e0b' }} />Speed Dial
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Quick access to frequently used numbers</p>
        </div>
        <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>
          <i className="bi bi-phone-fill" style={{ marginRight: 6 }} />{entries.length} / 20 entries
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Add form */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-plus-circle-fill" style={{ color: '#f59e0b' }} />Add Entry
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {numbers.length > 0 && (
              <div>
                <label className="label">Quick-fill from iVASMS</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 80, overflowY: 'auto' }}>
                  {numbers.slice(0, 12).map(n => (
                    <button key={n.id} onClick={() => prefill(n)} className="btn-ghost"
                      style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6 }}>
                      {n.phone}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Label / Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. US OTP Number" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+1234567890" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Service</label>
              <input value={form.service} onChange={e => setForm(f => ({...f, service: e.target.value}))} placeholder="Google, WhatsApp…" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Note</label>
              <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Optional note" className="input" style={{ width: '100%' }} />
            </div>
            {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}
            <button onClick={add} disabled={entries.length >= 20} className="btn-primary" style={{ width: '100%' }}>
              <i className="bi bi-lightning-charge" style={{ marginRight: 8 }} />
              {entries.length >= 20 ? 'Max 20 entries reached' : 'Add to Speed Dial'}
            </button>
          </div>
        </div>

        {/* Speed Dial Grid */}
        <div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 12 }} />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <i className="bi bi-lightning-charge" style={{ fontSize: 48, color: '#f59e0b', display: 'block', marginBottom: 12 }} />
              <p style={{ color: 'var(--text3)', margin: 0 }}>No speed dial entries yet. Add your first number!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {entries.map((e, i) => {
                const svcColor = SVC_COLORS[e.service] || 'var(--accent)'
                return (
                  <div key={e.id} className="card" style={{ padding: '16px', position: 'relative', transition: 'transform .15s, border-color .15s', cursor: 'default' }}
                    onMouseEnter={ev => { (ev.currentTarget as any).style.transform='translateY(-2px)'; (ev.currentTarget as any).style.borderColor='var(--accent)' }}
                    onMouseLeave={ev => { (ev.currentTarget as any).style.transform=''; (ev.currentTarget as any).style.borderColor='' }}>
                    {/* Shortcut badge */}
                    <div style={{ position: 'absolute', top: 10, left: 10, width: 22, height: 22, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>
                      {i + 1}
                    </div>
                    <button onClick={() => del(e.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 4, fontSize: 12 }}>
                      <i className="bi bi-x" />
                    </button>
                    <div style={{ textAlign: 'center', paddingTop: 10 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${svcColor}18`, border: `1.5px solid ${svcColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <i className="bi bi-phone-fill" style={{ fontSize: 22, color: svcColor }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{e.name || 'Number'}</div>
                      {e.service && <div style={{ fontSize: 10, fontWeight: 700, color: svcColor, marginBottom: 4 }}>{e.service}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, fontFamily: 'monospace' }}>{e.phone}</div>
                      {e.note && <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, fontStyle: 'italic' }}>{e.note}</div>}
                      <button onClick={() => copy(e.phone, e.id)} className={copying === e.id ? 'btn-primary' : 'btn-ghost'} style={{ width: '100%', fontSize: 11, padding: '6px' }}>
                        <i className={`bi bi-${copying === e.id ? 'check-lg' : 'clipboard'}`} style={{ marginRight: 5 }} />
                        {copying === e.id ? 'Copied!' : 'Copy Number'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {/* Empty slots */}
              {Array(Math.max(0, 6 - entries.length)).fill(0).map((_, i) => (
                <div key={`empty-${i}`} style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 130, opacity: .4 }}>
                  <i className="bi bi-plus-lg" style={{ fontSize: 24, color: 'var(--text3)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
