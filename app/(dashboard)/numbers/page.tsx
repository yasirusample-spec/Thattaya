'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const REFRESH = 30000

function Flag({ code }: { code: string }) {
  try {
    const c = (code || 'US').toUpperCase().slice(0, 2)
    return <span style={{ fontSize: 20, lineHeight: 1 }}>{c.split('').map(x => String.fromCodePoint(x.charCodeAt(0) + 127397)).join('')}</span>
  } catch { return <span style={{ fontSize: 11, color: 'var(--text3)' }}>{code}</span> }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return (
    <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span className="dot dot-green dot-pulse" style={{ width: 6, height: 6, boxShadow: 'none' }} />Active
    </span>
  )
  if (status === 'expired') return (
    <span className="badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 9 }} />Expired
    </span>
  )
  return (
    <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span className="dot dot-gray" style={{ width: 6, height: 6 }} />Inactive
    </span>
  )
}

const SVC_COLORS: Record<string, string> = {
  Google: '#4285f4', WhatsApp: '#25d366', Telegram: '#229ed9', Facebook: '#1877f2',
  Amazon: '#ff9900', Microsoft: '#00a4ef', Apple: '#555', Twitter: '#1da1f2',
  Netflix: '#e50914', TikTok: '#ff0050', Discord: '#5865f2', LinkedIn: '#0a66c2',
  Binance: '#f3ba2f', PayPal: '#003087', Coinbase: '#0052ff', Instagram: '#e1306c',
  Snapchat: '#fffc00', Uber: '#000', Airbnb: '#ff5a5f', Shopify: '#96bf48',
}

export default function NumbersPage() {
  const [numbers,      setNumbers]      = useState<any[]>([])
  const [filtered,     setFiltered]     = useState<any[]>([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [countryFilter,setCountryFilter]= useState('')
  const [syncing,      setSyncing]      = useState(false)
  const [injecting,    setInjecting]    = useState(false)
  const [syncMsg,      setSyncMsg]      = useState<{ok:boolean;text:string}|null>(null)
  const [loading,      setLoading]      = useState(true)
  const [expandedId,   setExpandedId]   = useState<string|null>(null)
  const [smsMap,       setSmsMap]       = useState<Record<string,any[]>>({})
  const [smsLoad,      setSmsLoad]      = useState<Record<string,boolean>>({})
  const [countdown,    setCountdown]    = useState(REFRESH/1000)
  const [editId,       setEditId]       = useState<string|null>(null)
  const [editNote,     setEditNote]     = useState('')
  const [copiedItem,   setCopiedItem]   = useState<string|null>(null)
  const [view,         setView]         = useState<'table'|'grid'>('table')
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const liveRef  = useRef<any>(null)
  const fetchRef = useRef<any>(null)

  const fetchNums = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const r = await fetch('/api/ivasms/numbers')
      if (r.ok) {
        const d = await r.json()
        setNumbers(d.numbers || [])
      }
    } catch {}
    setLoading(false)
    setCountdown(REFRESH / 1000)
  }, [])

  useEffect(() => {
    fetchNums()
    fetchRef.current = setInterval(() => fetchNums(true), REFRESH)
    return () => clearInterval(fetchRef.current)
  }, [fetchNums])

  useEffect(() => {
    const t = setInterval(() => setCountdown(p => p <= 1 ? REFRESH/1000 : p - 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let f = [...numbers]
    if (search) f = f.filter(n =>
      (n.phone||'').includes(search) ||
      (n.country||'').toLowerCase().includes(search.toLowerCase()) ||
      (n.country_name||'').toLowerCase().includes(search.toLowerCase()) ||
      (n.note||'').toLowerCase().includes(search.toLowerCase())
    )
    if (statusFilter)  f = f.filter(n => n.status === statusFilter)
    if (countryFilter) f = f.filter(n => n.country === countryFilter)
    setFiltered(f)
  }, [search, statusFilter, countryFilter, numbers])

  // Live SMS poll when expanded
  useEffect(() => {
    if (liveRef.current) { clearInterval(liveRef.current); liveRef.current = null }
    if (!expandedId) return
    liveRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/ivasms/sms?numberId=${expandedId}&limit=20`)
        if (r.ok) { const d = await r.json(); setSmsMap(p => ({ ...p, [expandedId]: d.messages || [] })) }
      } catch {}
    }, 5000)
    return () => clearInterval(liveRef.current)
  }, [expandedId])

  const handleInject = async () => {
    setInjecting(true); setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/inject', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        setSyncMsg({ ok: true, text: `✅ Injected ${d.numbers} numbers + ${d.sms} SMS messages from iVASMS account` })
        fetchNums()
      } else {
        setSyncMsg({ ok: false, text: d.error || 'Inject failed' })
      }
    } catch { setSyncMsg({ ok: false, text: 'Network error' }) }
    setInjecting(false)
    setTimeout(() => setSyncMsg(null), 10000)
  }

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg({ ok: true, text: `✅ Synced ${d.count} numbers · ${d.smsAdded ?? 0} new SMS` })
      } else {
        setSyncMsg({ ok: false, text: `⚠️ ${d.error || 'Sync failed'}${d.count ? ` — showing ${d.count} cached numbers` : ''}` })
      }
      fetchNums()
    } catch { setSyncMsg({ ok: false, text: 'Network error' }) }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 10000)
  }

  const handleRegisterWA = async () => {
    setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/register-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ onlyActive: false }) })
      const d = await r.json()
      if (d.ok) { setSyncMsg({ ok: true, text: `✅ ${d.added} numbers added to WhatsApp contacts` }); fetchNums() }
      else setSyncMsg({ ok: false, text: d.error || 'Registration failed' })
    } catch { setSyncMsg({ ok: false, text: 'Network error' }) }
    setTimeout(() => setSyncMsg(null), 10000)
  }

  const toggleExpand = async (num: any) => {
    if (expandedId === num.id) { setExpandedId(null); return }
    setExpandedId(num.id)
    if (!smsMap[num.id]) {
      setSmsLoad(p => ({ ...p, [num.id]: true }))
      try {
        const r = await fetch(`/api/ivasms/sms?numberId=${num.id}&limit=20`)
        if (r.ok) { const d = await r.json(); setSmsMap(p => ({ ...p, [num.id]: d.messages || [] })) }
      } catch {}
      setSmsLoad(p => ({ ...p, [num.id]: false }))
    }
  }

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).catch(() => {})
    setCopiedItem(phone)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const saveNote = async (id: string) => {
    try {
      await fetch(`/api/ivasms/numbers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: editNote }) })
      setNumbers(p => p.map(n => n.id === id ? { ...n, note: editNote } : n))
    } catch {}
    setEditId(null)
  }

  const deleteNumber = async (id: string) => {
    if (!confirm('Delete this number?')) return
    try {
      await fetch(`/api/ivasms/numbers/${id}`, { method: 'DELETE' })
      setNumbers(p => p.filter(n => n.id !== id))
    } catch {}
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const fmtTime = (t: string) => {
    if (!t) return '—'
    try {
      const diff = (Date.now() - new Date(t).getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
      if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
      return new Date(t).toLocaleDateString()
    } catch { return t }
  }

  const active   = numbers.filter(n => n.status === 'active').length
  const inactive = numbers.length - active
  const countries = [...new Set(numbers.map(n => n.country).filter(Boolean))]
  const totalSMS  = numbers.reduce((a, n) => a + (n.sms_count || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-phone-fill" style={{ color: 'var(--accent)', fontSize: 20 }} />
            Phone Numbers
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            iVASMS virtual numbers ·&nbsp;
            <span className="live-badge" style={{ fontSize: 10 }}>
              <span className="live-dot" />Auto-refresh in {countdown}s
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {syncMsg && (
            <div className={`alert ${syncMsg.ok ? 'alert-success' : 'alert-error'}`} style={{ padding: '7px 12px', fontSize: 12, margin: 0, maxWidth: 340 }}>
              {syncMsg.text}
            </div>
          )}
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 8, padding: 3 }}>
            {(['table','grid'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                  background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text3)' }}>
                <i className={`bi bi-${v === 'table' ? 'list-ul' : 'grid-3x3-gap-fill'}`} />
              </button>
            ))}
          </div>
          <button onClick={() => fetchNums()} className="btn-secondary btn-sm" title="Refresh">
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} /> Refresh
          </button>
          {numbers.length > 0 && (
            <button onClick={handleRegisterWA} className="btn-secondary btn-sm"
              style={{ borderColor: '#25D366', color: '#25D366' }}>
              <i className="bi bi-whatsapp" style={{ fontSize: 14 }} /> → WhatsApp
            </button>
          )}
          <button onClick={handleInject} disabled={injecting} className="btn-secondary btn-sm"
            style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}>
            <i className="bi bi-database-fill-down" style={{ fontSize: 14, animation: injecting ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
            {injecting ? 'Injecting…' : 'Load Numbers'}
          </button>
          <button onClick={handleSync} disabled={syncing} className="btn-primary btn-sm" style={{ gap: 6 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14, animation: syncing ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
            {syncing ? 'Syncing…' : 'Sync iVASMS'}
          </button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        {[
          { icon: 'bi-phone-fill',    label: 'Total',    value: numbers.length, color: 'var(--accent)' },
          { icon: 'bi-circle-fill',   label: 'Active',   value: active,         color: 'var(--green)'  },
          { icon: 'bi-dash-circle',   label: 'Inactive', value: inactive,       color: 'var(--text3)'  },
          { icon: 'bi-globe',         label: 'Countries',value: countries.length,color: 'var(--blue)'  },
          { icon: 'bi-chat-dots-fill',label: 'Total SMS',value: totalSMS,       color: 'var(--orange)' },
        ].map(s => (
          <div key={s.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}18`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 15 }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Distribution bar ── */}
      {numbers.length > 0 && (
        <div className="card card-sm" style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <i className="bi bi-bar-chart-fill" style={{ color: 'var(--accent)', fontSize: 12 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Status Distribution</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} />
                Active: {active} ({numbers.length > 0 ? Math.round(active/numbers.length*100) : 0}%)
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--text3)', display: 'inline-block' }} />
                Inactive: {inactive} ({numbers.length > 0 ? Math.round(inactive/numbers.length*100) : 0}%)
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--border)', gap: 1 }}>
            <div style={{ flex: active || 0.01, background: 'linear-gradient(90deg, var(--green), #00e676)', transition: 'flex .5s ease' }} />
            <div style={{ flex: inactive || 0.01, background: 'var(--text3)', transition: 'flex .5s ease' }} />
          </div>
          {/* Country breakdown */}
          {countries.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {countries.slice(0, 12).map(c => {
                const cnt = numbers.filter(n => n.country === c).length
                return (
                  <button key={c} onClick={() => setCountryFilter(countryFilter === c ? '' : c)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6,
                      background: countryFilter === c ? 'var(--accent)' : 'var(--bg2)',
                      border: `1px solid ${countryFilter === c ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer', fontSize: 11, color: countryFilter === c ? '#fff' : 'var(--text2)' }}>
                    <Flag code={c} /> {c} ({cnt})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="input-group" style={{ flex: '1 1 220px' }}>
          <i className="bi bi-search input-icon" />
          <input type="text" placeholder="Search number, country, note…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', flex: '0 0 150px' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(search || statusFilter || countryFilter) && (
          <button className="btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setCountryFilter('') }}>
            <i className="bi bi-x" style={{ fontSize: 15 }} /> Clear
          </button>
        )}
        {selectedIds.size > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedIds.size} selected</span>
            <button className="btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>Deselect</button>
          </div>
        )}
        <span style={{ marginLeft: selectedIds.size > 0 ? 0 : 'auto', fontSize: 11, color: 'var(--text3)' }}>
          {filtered.length} of {numbers.length}
        </span>
      </div>

      {/* ── Empty State ── */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: '50%', background: 'rgba(229,9,20,.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 28, color: 'var(--accent)' }} />
          </div>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading numbers…</p>
        </div>
      ) : numbers.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>📱</div>
          <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>No Numbers Yet</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 20px' }}>
            Click <strong>Load Numbers</strong> to instantly populate your account with iVASMS virtual numbers from
            19 countries, complete with SMS history and OTP codes.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleInject} disabled={injecting} className="btn-primary" style={{ padding: '11px 28px', gap: 8 }}>
              <i className="bi bi-database-fill-down" style={{ fontSize: 16 }} />
              {injecting ? 'Loading…' : 'Load Numbers Now'}
            </button>
            <button onClick={handleSync} disabled={syncing} className="btn-secondary" style={{ padding: '11px 24px', gap: 8 }}>
              <i className="bi bi-arrow-repeat" style={{ fontSize: 16 }} />
              Try Live Sync
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 16 }}>
            <i className="bi bi-info-circle" style={{ marginRight: 5 }} />
            Note: Live Sync requires iVASMS to be accessible (may be blocked by CF protection)
          </p>
        </div>
      ) : view === 'grid' ? (
        /* ── GRID VIEW ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {filtered.map(n => (
            <div key={n.id} className="card card-sm" style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .2s' }}
              onClick={() => toggleExpand(n)}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                background: n.status === 'active' ? 'var(--green)' : 'var(--text3)', borderRadius: '3px 0 0 3px' }} />
              <div style={{ paddingLeft: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Flag code={n.country} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{n.phone}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{n.country_name} · #{n.ivasms_id}</div>
                  </div>
                  <StatusBadge status={n.status} />
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
                  <span><i className="bi bi-chat-dots-fill" style={{ marginRight: 4 }} />{n.sms_count || 0} SMS</span>
                  <span><i className="bi bi-clock-fill" style={{ marginRight: 4 }} />{fmtTime(n.last_received)}</span>
                  {n.whatsapp_created ? <span style={{ color: '#25d366' }}><i className="bi bi-whatsapp" style={{ marginRight: 4 }} />Linked</span> : null}
                </div>
                {n.note && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic' }}>{n.note}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={e => { e.stopPropagation(); copyPhone(n.phone) }} className="btn-ghost btn-xs" style={{ flex: 1, justifyContent: 'center' }}>
                    <i className={`bi ${copiedItem === n.phone ? 'bi-clipboard-check-fill' : 'bi-clipboard'}`} style={{ fontSize: 11 }} />
                    {copiedItem === n.phone ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setEditId(n.id); setEditNote(n.note||'') }} className="btn-ghost btn-xs" style={{ flex: 1, justifyContent: 'center' }}>
                    <i className="bi bi-pencil-fill" style={{ fontSize: 11 }} /> Note
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteNumber(n.id) }} className="btn-ghost btn-xs" style={{ color: 'var(--accent)' }}>
                    <i className="bi bi-trash-fill" style={{ fontSize: 11 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(n => n.id)) : new Set())} />
                  </th>
                  <th><i className="bi bi-phone-fill" style={{ marginRight: 6 }} />Number</th>
                  <th><i className="bi bi-globe" style={{ marginRight: 6 }} />Country</th>
                  <th><i className="bi bi-circle-fill" style={{ marginRight: 6, fontSize: 8 }} />Status</th>
                  <th><i className="bi bi-chat-dots-fill" style={{ marginRight: 6 }} />SMS</th>
                  <th><i className="bi bi-clock-fill" style={{ marginRight: 6 }} />Last SMS</th>
                  <th><i className="bi bi-whatsapp" style={{ marginRight: 6 }} />WA</th>
                  <th>Note</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <>
                    <tr key={n.id} style={{ cursor: 'pointer' }}
                      onClick={() => toggleExpand(n)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                          checked={selectedIds.has(n.id)}
                          onChange={() => toggleSelect(n.id)} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Flag code={n.country} />
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{n.phone}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>ID #{n.ivasms_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{n.country_name || n.country || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{n.country}</div>
                      </td>
                      <td><StatusBadge status={n.status} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: (n.sms_count||0) > 0 ? 'var(--text)' : 'var(--text3)' }}>{n.sms_count||0}</span>
                          {(n.sms_count||0) > 0 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>msgs</span>}
                        </div>
                      </td>
                      <td><span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtTime(n.last_received)}</span></td>
                      <td>
                        {n.whatsapp_created
                          ? <span className="badge badge-green" style={{ fontSize: 10 }}><i className="bi bi-whatsapp" style={{ fontSize: 9 }} /> Linked</span>
                          : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
                      </td>
                      <td>
                        {editId === n.id ? (
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            <input value={editNote} onChange={e => setEditNote(e.target.value)}
                              style={{ width: 120, fontSize: 11, padding: '3px 7px' }}
                              onKeyDown={e => { if (e.key === 'Enter') saveNote(n.id); if (e.key === 'Escape') setEditId(null) }}
                              autoFocus />
                            <button className="btn-primary btn-xs" onClick={() => saveNote(n.id)}>✓</button>
                            <button className="btn-ghost btn-xs" onClick={() => setEditId(null)}>✕</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: n.note ? 'var(--text2)' : 'var(--text3)', fontStyle: n.note ? 'italic' : 'normal' }}
                            onClick={e => { e.stopPropagation(); setEditId(n.id); setEditNote(n.note||'') }}>
                            {n.note || <span style={{ opacity: .4 }}>+ add note</span>}
                          </span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => copyPhone(n.phone)} className="btn-ghost btn-xs" title="Copy number">
                            <i className={`bi ${copiedItem === n.phone ? 'bi-clipboard-check-fill' : 'bi-clipboard'}`} style={{ fontSize: 11 }} />
                          </button>
                          <button onClick={() => deleteNumber(n.id)} className="btn-ghost btn-xs" title="Delete" style={{ color: 'var(--accent)' }}>
                            <i className="bi bi-trash-fill" style={{ fontSize: 11 }} />
                          </button>
                          <button onClick={() => toggleExpand(n)} className="btn-ghost btn-xs" title="View SMS">
                            <i className={`bi ${expandedId === n.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ fontSize: 11 }} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded SMS panel ── */}
                    {expandedId === n.id && (
                      <tr key={`exp-${n.id}`}>
                        <td colSpan={9} style={{ padding: 0, background: 'var(--bg)' }}>
                          <div style={{ padding: '16px 20px 20px', borderTop: '2px solid var(--accent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(229,9,20,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 14 }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>SMS for <span style={{ fontFamily: 'monospace' }}>{n.phone}</span></div>
                                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{n.country_name} · {n.status}</div>
                              </div>
                              <span className="live-badge" style={{ fontSize: 10 }}><span className="live-dot" />5s live</span>
                              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
                                {(smsMap[n.id] || []).length} message{(smsMap[n.id] || []).length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {smsLoad[n.id] ? (
                              <div style={{ color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="bi bi-arrow-repeat animate-spin" /> Loading…
                              </div>
                            ) : !smsMap[n.id] || smsMap[n.id].length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
                                <i className="bi bi-chat-dots-fill" style={{ fontSize: 32, opacity: .2, display: 'block', marginBottom: 8 }} />
                                <p style={{ fontSize: 13 }}>No SMS for this number yet.</p>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                                {smsMap[n.id].map((msg: any) => {
                                  const svcColor = SVC_COLORS[msg.service] || 'var(--accent)'
                                  return (
                                    <div key={msg.id} style={{ padding: '10px 13px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: svcColor }} />
                                      <div style={{ paddingLeft: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                          <span style={{ fontSize: 10, fontWeight: 700, color: svcColor, background: `${svcColor}18`, border: `1px solid ${svcColor}33`, padding: '1px 7px', borderRadius: 4 }}>
                                            {msg.service || 'Unknown'}
                                          </span>
                                          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                                            <i className="bi bi-clock-fill" style={{ marginRight: 3 }} />
                                            {fmtTime(msg.received_at)}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
                                          <i className="bi bi-person-fill" style={{ marginRight: 4, color: 'var(--text3)', fontSize: 10 }} />
                                          {msg.sender}
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: msg.otp ? 8 : 0 }}>
                                          {msg.body}
                                        </p>
                                        {msg.otp && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, letterSpacing: 5, color: 'var(--accent)', background: 'rgba(229,9,20,.08)', border: '1px solid rgba(229,9,20,.3)', padding: '4px 12px', borderRadius: 8 }}>
                                              {msg.otp}
                                            </div>
                                            <button
                                              onClick={() => { navigator.clipboard.writeText(msg.otp).catch(() => {}); setCopiedItem(msg.otp); setTimeout(() => setCopiedItem(null), 2000) }}
                                              className={copiedItem === msg.otp ? 'btn-success btn-xs' : 'btn-secondary btn-xs'}
                                              title="Copy OTP"
                                            >
                                              <i className={`bi ${copiedItem === msg.otp ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 11 }} />
                                              {copiedItem === msg.otp ? 'Copied!' : 'Copy'}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Info box about CF protection ── */}
      {numbers.length > 0 && (
        <div className="alert alert-info" style={{ fontSize: 12 }}>
          <i className="bi bi-shield-fill-check" style={{ color: 'var(--blue)' }} />
          <div>
            <strong>About iVASMS Sync:</strong> Numbers are loaded from your iVASMS account (<code>ohlivvy53@gmail.com</code>).
            Live Sync tries direct scraping, but iVASMS may be behind Cloudflare Bot Protection from server IPs.
            Use <strong>Load Numbers</strong> to always get your account numbers instantly.
          </div>
        </div>
      )}
    </div>
  )
}
