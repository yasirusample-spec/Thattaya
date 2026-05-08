'use client'
import { useState, useEffect, useCallback } from 'react'

export default function BlacklistPage() {
  const [list,    setList]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ type: 'sender', value: '', reason: '' })
  const [msg,     setMsg]     = useState<{ok:boolean;text:string}|null>(null)
  const [search,  setSearch]  = useState('')

  const load = useCallback(async () => {
    try { const r = await fetch('/api/blacklist'); if (r.ok) { const d = await r.json(); setList(d.blacklist || []) } }
    catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.value.trim()) { setMsg({ ok: false, text: 'Value required' }); return }
    setMsg(null)
    try {
      const r = await fetch('/api/blacklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (d.ok) { setMsg({ ok: true, text: 'Added to blacklist!' }); setForm(f => ({...f, value:'', reason:''})); load() }
      else setMsg({ ok: false, text: d.error || 'Failed' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
  }

  const del = async (id: string) => {
    await fetch(`/api/blacklist/${id}`, { method: 'DELETE' }); load()
  }

  const filtered = list.filter(b => !search || b.value.toLowerCase().includes(search.toLowerCase()) || (b.reason||'').toLowerCase().includes(search.toLowerCase()))

  const TYPE_ICONS: Record<string, string> = { sender: 'bi-person-x-fill', keyword: 'bi-search-heart', service: 'bi-app-indicator' }
  const TYPE_COLORS: Record<string, string> = { sender: 'var(--accent)', keyword: '#f59e0b', service: '#8b5cf6' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            <i className="bi bi-slash-circle-fill" style={{ marginRight: 10, color: 'var(--accent)' }} />Blacklist
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Block senders, keywords, and services from notifications</p>
        </div>
        <div style={{ background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
          <i className="bi bi-shield-fill-x" style={{ marginRight: 6 }} />{list.length} blocked
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Add form */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-plus-circle-fill" style={{ color: 'var(--accent)' }} />Add to Blacklist
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['sender','keyword','service'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({...f, type: t}))}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      border: `1.5px solid ${form.type === t ? TYPE_COLORS[t] : 'var(--border)'}`,
                      background: form.type === t ? `${TYPE_COLORS[t]}18` : 'var(--bg)',
                      color: form.type === t ? TYPE_COLORS[t] : 'var(--text3)', cursor: 'pointer',
                    }}>
                    <i className={`bi ${TYPE_ICONS[t]}`} style={{ display: 'block', marginBottom: 2, fontSize: 14 }} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">
                {form.type === 'sender' ? 'Sender number/name' : form.type === 'keyword' ? 'Keyword to block' : 'Service name'}
              </label>
              <input value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))}
                placeholder={form.type === 'sender' ? '+1234567890' : form.type === 'keyword' ? 'e.g. spam, promo' : 'e.g. Unknown'}
                className="input" style={{ width: '100%' }} onKeyDown={e => e.key === 'Enter' && add()} />
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                placeholder="Why is this blocked?" className="input" style={{ width: '100%' }} />
            </div>
            {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}
            <button onClick={add} className="btn-primary" style={{ width: '100%' }}>
              <i className="bi bi-slash-circle" style={{ marginRight: 8 }} />Add to Blacklist
            </button>
          </div>

          {/* Stats by type */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Stats</div>
            {(['sender','keyword','service'] as const).map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <i className={`bi ${TYPE_ICONS[t]}`} style={{ color: TYPE_COLORS[t], fontSize: 14, width: 20 }} />
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, textTransform: 'capitalize' }}>{t}s</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: TYPE_COLORS[t] }}>{list.filter(b => b.type === t).length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search blacklist…"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 34, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12 }} />
            </div>
            {search && <button onClick={() => setSearch('')} className="btn-ghost" style={{ fontSize: 11, padding: '5px 8px' }}>Clear</button>}
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />)}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <i className="bi bi-slash-circle" style={{ fontSize: 48, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
              <p style={{ color: 'var(--text3)', margin: 0 }}>{list.length === 0 ? 'Blacklist is empty.' : 'No results.'}</p>
            </div>
          ) : (
            filtered.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${TYPE_COLORS[b.type] || 'var(--accent)'}18`, border: `1px solid ${TYPE_COLORS[b.type] || 'var(--accent)'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${TYPE_ICONS[b.type] || 'bi-ban'}`} style={{ fontSize: 14, color: TYPE_COLORS[b.type] || 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.value}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLORS[b.type], textTransform: 'uppercase', letterSpacing: .5 }}>{b.type}</span>
                    {b.reason && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{b.reason}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{new Date(b.created_at).toLocaleDateString()}</div>
                <button onClick={() => del(b.id)} className="btn-ghost" style={{ padding: '5px 8px', color: 'var(--accent)', flexShrink: 0 }}>
                  <i className="bi bi-trash" style={{ fontSize: 13 }} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
