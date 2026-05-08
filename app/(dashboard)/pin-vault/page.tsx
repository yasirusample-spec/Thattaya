'use client'
import { useState, useEffect, useCallback } from 'react'

export default function PinVaultPage() {
  const [locked,   setLocked]   = useState(true)
  const [pin,      setPin]      = useState('')
  const [entries,  setEntries]  = useState<any[]>([])
  const [hasPin,   setHasPin]   = useState(false)
  const [newPin,   setNewPin]   = useState('')
  const [form,     setForm]     = useState({ label: '', service: '', phone: '', otp: '', note: '' })
  const [msg,      setMsg]      = useState<{ok:boolean;text:string}|null>(null)
  const [loading,  setLoading]  = useState(false)
  const [reveal,   setReveal]   = useState<Record<string,boolean>>({})
  const [copying,  setCopying]  = useState<string|null>(null)
  const [search,   setSearch]   = useState('')

  // Check if pin is set
  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d => setHasPin(!!d.user?.pin_vault_hash)).catch(()=>{})
  }, [])

  const unlock = async () => {
    if (!pin.trim()) return
    setLoading(true); setMsg(null)
    try {
      const r = await fetch(`/api/vault?pin=${encodeURIComponent(pin)}`)
      if (r.ok) {
        const d = await r.json()
        setEntries(d.entries || [])
        setLocked(false)
        setMsg(null)
      } else {
        const d = await r.json()
        setMsg({ ok: false, text: d.error || 'Invalid PIN' })
      }
    } catch { setMsg({ ok: false, text: 'Failed to unlock' }) }
    setLoading(false)
  }

  const setVaultPin = async () => {
    if (newPin.length < 4) { setMsg({ ok: false, text: 'PIN must be at least 4 digits' }); return }
    try {
      const r = await fetch('/api/vault/set-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: newPin }) })
      const d = await r.json()
      if (d.ok) { setHasPin(true); setPin(newPin); setMsg({ ok: true, text: 'PIN set! Tap Unlock.' }) }
      else setMsg({ ok: false, text: d.error || 'Failed' })
    } catch { setMsg({ ok: false, text: 'Error' }) }
  }

  const add = async () => {
    if (!form.label.trim() && !form.otp.trim()) { setMsg({ ok: false, text: 'Label or OTP required' }); return }
    setMsg(null)
    try {
      const r = await fetch('/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, pin }) })
      const d = await r.json()
      if (d.ok) { setEntries(e => [d.entry, ...e]); setForm({ label:'', service:'', phone:'', otp:'', note:'' }); setMsg({ ok: true, text: 'Saved to vault!' }) }
      else setMsg({ ok: false, text: d.error || 'Failed' })
    } catch (e:any) { setMsg({ ok: false, text: e.message }) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/vault/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
    setEntries(e => e.filter(x => x.id !== id))
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopying(id); setTimeout(() => setCopying(null), 1500)
  }

  const toggleReveal = (id: string) => setReveal(r => ({ ...r, [id]: !r[id] }))

  const filtered = entries.filter(e => !search || (e.label+e.service+e.phone+e.otp+e.note).toLowerCase().includes(search.toLowerCase()))

  if (!hasPin || locked) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            <i className="bi bi-safe-fill" style={{ marginRight: 10, color: '#8b5cf6' }} />PIN Vault
          </h1>
        </div>
        <div style={{ maxWidth: 400, margin: '60px auto' }}>
          <div className="card" style={{ padding: '32px 36px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(139,92,246,.15)', border: '2px solid rgba(139,92,246,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <i className="bi bi-safe2-fill" style={{ fontSize: 36, color: '#8b5cf6' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 8px' }}>Secure OTP Vault</h2>
            <p style={{ color: 'var(--text3)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
              Your vault is protected by a PIN. All OTPs stored here are encrypted and private.
            </p>

            {!hasPin ? (
              <>
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <label className="label">Set a new PIN (4+ digits)</label>
                  <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter PIN" type="password" inputMode="numeric" maxLength={8}
                    className="input" style={{ width: '100%', fontSize: 20, letterSpacing: 8, textAlign: 'center' }}
                    onKeyDown={e => e.key === 'Enter' && setVaultPin()} />
                </div>
                {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 12 }}>{msg.text}</div>}
                <button onClick={setVaultPin} className="btn-primary" style={{ width: '100%' }}>
                  <i className="bi bi-lock-fill" style={{ marginRight: 8 }} />Set PIN & Enable Vault
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <label className="label">Enter PIN to unlock</label>
                  <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••" type="password" inputMode="numeric" maxLength={8}
                    className="input" style={{ width: '100%', fontSize: 24, letterSpacing: 12, textAlign: 'center' }}
                    onKeyDown={e => e.key === 'Enter' && unlock()} autoFocus />
                </div>
                {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 12 }}>{msg.text}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                    <button key={i} onClick={() => {
                      if (k === '⌫') setPin(p => p.slice(0,-1))
                      else if (k !== '') setPin(p => p.length < 8 ? p + k : p)
                    }}
                      style={{ height: 52, borderRadius: 12, fontSize: k === '⌫' ? 18 : 20, fontWeight: 700, background: k === '' ? 'transparent' : 'var(--bg)', border: k === '' ? 'none' : '1px solid var(--border)', color: 'var(--text)', cursor: k === '' ? 'default' : 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => { if (k !== '') (e.currentTarget.style.background = 'var(--card2)') }}
                      onMouseLeave={e => { if (k !== '') (e.currentTarget.style.background = 'var(--bg)') }}>
                      {k}
                    </button>
                  ))}
                </div>
                <button onClick={unlock} disabled={loading || pin.length < 4} className="btn-primary" style={{ width: '100%' }}>
                  <i className={`bi bi-${loading ? 'hourglass-split' : 'unlock-fill'}`} style={{ marginRight: 8 }} />
                  {loading ? 'Unlocking…' : 'Unlock Vault'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            <i className="bi bi-safe-fill" style={{ marginRight: 10, color: '#8b5cf6' }} />PIN Vault
            <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'rgba(0,230,118,.1)', border: '1px solid rgba(0,230,118,.2)', borderRadius: 6, padding: '3px 8px', verticalAlign: 'middle' }}>
              <i className="bi bi-unlock-fill" style={{ marginRight: 4 }} />Unlocked
            </span>
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Secure OTP & credentials storage · {entries.length} entries</p>
        </div>
        <button onClick={() => { setLocked(true); setPin(''); setEntries([]) }} className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px', color: 'var(--accent)' }}>
          <i className="bi bi-lock-fill" style={{ marginRight: 6 }} />Lock Vault
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
        {/* Add form */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-plus-circle-fill" style={{ color: '#8b5cf6' }} />Store New Entry
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'label',   ph: 'Label / Description',  icon: 'bi-tag-fill' },
              { key: 'service', ph: 'Service (Google, etc)', icon: 'bi-app' },
              { key: 'phone',   ph: 'Phone number',          icon: 'bi-phone-fill' },
              { key: 'otp',     ph: '🔐 OTP / Code',         icon: 'bi-key-fill' },
              { key: 'note',    ph: 'Note (optional)',        icon: 'bi-sticky-fill' },
            ].map(f => (
              <div key={f.key} style={{ position: 'relative' }}>
                <i className={`bi ${f.icon}`} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: f.key === 'otp' ? '#8b5cf6' : 'var(--text3)', fontSize: 13, pointerEvents: 'none' }} />
                <input value={(form as any)[f.key]} onChange={e => setForm(x => ({...x, [f.key]: e.target.value}))}
                  placeholder={f.ph} className="input" style={{ width: '100%', paddingLeft: 32 }} />
              </div>
            ))}
            {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}
            <button onClick={add} className="btn-primary" style={{ width: '100%' }}>
              <i className="bi bi-safe2" style={{ marginRight: 8 }} />Store in Vault
            </button>
          </div>
        </div>

        {/* Entries */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <i className="bi bi-search" style={{ color: 'var(--text3)', fontSize: 13 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vault…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13 }} />
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{filtered.length} entries</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <i className="bi bi-safe2" style={{ fontSize: 48, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
              <p style={{ color: 'var(--text3)', margin: 0 }}>{entries.length === 0 ? 'Vault is empty. Store your first OTP!' : 'No results.'}</p>
            </div>
          ) : (
            filtered.map(e => (
              <div key={e.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-key-fill" style={{ fontSize: 15, color: '#8b5cf6' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{e.label || e.service || 'Entry'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {e.service && <span className="badge badge-blue" style={{ fontSize: 9.5 }}>{e.service}</span>}
                      {e.phone   && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{e.phone}</span>}
                    </div>
                    {e.otp && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ padding: '6px 12px', background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.25)', borderRadius: 8, fontFamily: 'monospace', fontSize: reveal[e.id] ? 18 : 14, fontWeight: 900, color: '#8b5cf6', letterSpacing: reveal[e.id] ? 4 : 0 }}>
                          {reveal[e.id] ? e.otp : '••••••'}
                        </div>
                        <button onClick={() => toggleReveal(e.id)} className="btn-ghost" style={{ padding: '5px 8px', fontSize: 12 }} title={reveal[e.id] ? 'Hide' : 'Reveal'}>
                          <i className={`bi bi-eye${reveal[e.id] ? '-slash' : ''}-fill`} />
                        </button>
                        <button onClick={() => copy(e.otp, e.id)} className={copying === e.id ? 'btn-primary' : 'btn-ghost'} style={{ padding: '5px 8px', fontSize: 12 }} title="Copy OTP">
                          <i className={`bi bi-${copying === e.id ? 'check-lg' : 'clipboard-fill'}`} />
                        </button>
                      </div>
                    )}
                    {e.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, fontStyle: 'italic' }}>{e.note}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <div style={{ fontSize: 9.5, color: 'var(--text3)', textAlign: 'right' }}>{new Date(e.created_at).toLocaleDateString()}</div>
                    <button onClick={() => del(e.id)} className="btn-ghost" style={{ padding: '4px 7px', color: 'var(--accent)', fontSize: 12 }}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
