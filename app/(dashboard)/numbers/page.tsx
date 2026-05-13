'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const REFRESH_INTERVAL = 30000 // 30 seconds

function CountryFlag({ country }: { country: string }) {
  const code = (country || 'US').toUpperCase().slice(0, 2)
  try {
    const flag = code.split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    return <span style={{ fontSize: 18, lineHeight: 1 }}>{flag}</span>
  } catch {
    return <span style={{ fontSize: 11, color: 'var(--text3)' }}>{code}</span>
  }
}

export default function NumbersPage() {
  const [numbers,       setNumbers]       = useState<any[]>([])
  const [filtered,      setFiltered]      = useState<any[]>([])
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [syncing,       setSyncing]       = useState(false)
  const [syncMsg,       setSyncMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [needsSync,     setNeedsSync]     = useState(false)
  const [regWA,         setRegWA]         = useState(false)
  const [regWAMsg,      setRegWAMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [smsMap,        setSmsMap]        = useState<Record<string, any[]>>({})
  const [smsLoading,    setSmsLoading]    = useState<Record<string, boolean>>({})
  const [countdown,     setCountdown]     = useState(REFRESH_INTERVAL / 1000)
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const liveSmsRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNumbers = useCallback(async () => {
    try {
      const r = await fetch('/api/ivasms/numbers')
      if (r.ok) {
        const d = await r.json()
        setNumbers(d.numbers || [])
        setNeedsSync(d.needsSync === true)
      }
    } catch {}
    setLoading(false)
    setCountdown(REFRESH_INTERVAL / 1000)
  }, [])

  // Initial load + 30s auto-refresh
  useEffect(() => {
    fetchNumbers()
    fetchRef.current = setInterval(fetchNumbers, REFRESH_INTERVAL)
    return () => { if (fetchRef.current) clearInterval(fetchRef.current) }
  }, [fetchNumbers])

  // Visual countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL / 1000 : prev - 1))
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  // Filter logic
  useEffect(() => {
    let f = numbers
    if (search)       f = f.filter(n =>
      (n.phone || '').includes(search) ||
      (n.country || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.country_name || '').toLowerCase().includes(search.toLowerCase())
    )
    if (statusFilter) f = f.filter(n => n.status === statusFilter)
    setFiltered(f)
  }, [search, statusFilter, numbers])

  const handleRegisterWA = async () => {
    setRegWA(true); setRegWAMsg(null)
    try {
      const r = await fetch('/api/ivasms/register-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ onlyActive: false }) })
      const d = await r.json()
      if (r.ok && d.ok) {
        setRegWAMsg({ ok: true, text: `✅ ${d.added} numbers added to WhatsApp contacts (${d.total} total)` })
        fetchNumbers()
      } else {
        setRegWAMsg({ ok: false, text: d.error || 'Registration failed' })
      }
    } catch {
      setRegWAMsg({ ok: false, text: 'Network error' })
    } finally {
      setRegWA(false)
      setTimeout(() => setRegWAMsg(null), 10000)
    }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg({ ok: true, text: `Synced ${d.count} numbers · ${d.smsAdded ?? 0} new SMS` })
        fetchNumbers()
      } else {
        setSyncMsg({ ok: false, text: d.error || 'Sync failed — check iVASMS credentials in Settings.' })
      }
    } catch {
      setSyncMsg({ ok: false, text: 'Network error — please try again.' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 8000)
    }
  }

  const toggleExpand = async (num: any) => {
    if (expandedId === num.id) {
      setExpandedId(null)
      if (liveSmsRef.current) { clearInterval(liveSmsRef.current); liveSmsRef.current = null }
      return
    }
    setExpandedId(num.id)
    if (!smsMap[num.id]) {
      setSmsLoading(p => ({ ...p, [num.id]: true }))
      try {
        const r = await fetch(`/api/ivasms/sms?numberId=${num.id}&limit=15`)
        if (r.ok) {
          const { messages } = await r.json()
          setSmsMap(p => ({ ...p, [num.id]: messages || [] }))
        }
      } catch {}
      setSmsLoading(p => ({ ...p, [num.id]: false }))
    }
  }

  // Live SMS polling for expanded row every 5s
  useEffect(() => {
    if (liveSmsRef.current) { clearInterval(liveSmsRef.current); liveSmsRef.current = null }
    if (!expandedId) return
    liveSmsRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/ivasms/sms?numberId=${expandedId}&limit=15`)
        if (r.ok) {
          const { messages } = await r.json()
          setSmsMap(p => ({ ...p, [expandedId]: messages || [] }))
        }
      } catch {}
    }, 5000)
    return () => { if (liveSmsRef.current) clearInterval(liveSmsRef.current) }
  }, [expandedId])

  const activeCount   = numbers.filter(n => n.status === 'active').length
  const inactiveCount = numbers.filter(n => n.status !== 'active').length
  const countries     = [...new Set(numbers.map(n => n.country).filter(Boolean))]

  const fmtTime = (t: string) => {
    if (!t) return '—'
    try {
      const d    = new Date(t)
      const diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return d.toLocaleDateString()
    } catch { return t }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'active') return (
      <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span className="dot dot-green dot-pulse" style={{ width: 6, height: 6, boxShadow: 'none' }} />
        Active
      </span>
    )
    if (status === 'expired') return (
      <span className="badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 9 }} />
        Expired
      </span>
    )
    return (
      <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span className="dot dot-gray" style={{ width: 6, height: 6 }} />
        Inactive
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>
            <i className="bi bi-phone-fill" style={{ color: 'var(--accent)', marginRight: 10, fontSize: 20 }} />
            Phone Numbers
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            iVASMS numbers ·&nbsp;
            <span className="live-badge" style={{ fontSize: 10 }}>
              <span className="live-dot" />
              Auto-refresh in {countdown}s
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {regWAMsg && (
            <div className={`alert ${regWAMsg.ok ? 'alert-success' : 'alert-error'}`} style={{ padding: '7px 12px', fontSize: 12, margin: 0 }}>
              <i className={`bi ${regWAMsg.ok ? 'bi-whatsapp' : 'bi-exclamation-triangle-fill'}`} />
              {regWAMsg.text}
            </div>
          )}
          {syncMsg && (
            <div className={`alert ${syncMsg.ok ? 'alert-success' : 'alert-error'}`} style={{ padding: '7px 12px', fontSize: 12, margin: 0 }}>
              <i className={`bi ${syncMsg.ok ? 'bi-check2' : 'bi-exclamation-triangle-fill'}`} />
              {syncMsg.text}
            </div>
          )}
          <button onClick={fetchNumbers} className="btn-secondary btn-sm" style={{ gap: 6 }} title="Refresh now">
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />
            Refresh
          </button>
          {numbers.length > 0 && (
            <button
              onClick={handleRegisterWA}
              disabled={regWA}
              className="btn-secondary"
              style={{ padding: '9px 18px', fontSize: 13, gap: 7, borderColor: '#25D366', color: '#25D366' }}
            >
              <i className="bi bi-whatsapp" style={{ fontSize: 15 }} />
              {regWA ? 'Registering…' : 'Register All → WhatsApp'}
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: 13, gap: 7 }}
          >
            <i className="bi bi-arrow-repeat" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', display: 'inline-block', fontSize: 15 }} />
            {syncing ? 'Syncing iVASMS…' : 'Sync iVASMS'}
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { icon: 'bi-phone-fill',  label: 'Total',     value: numbers.length,   color: 'var(--accent)' },
          { icon: 'bi-circle-fill', label: 'Active',    value: activeCount,      color: 'var(--green)'  },
          { icon: 'bi-dash-circle', label: 'Inactive',  value: inactiveCount,    color: 'var(--text3)'  },
          { icon: 'bi-globe',       label: 'Countries', value: countries.length, color: 'var(--blue)'   },
        ].map(s => (
          <div key={s.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: `${s.color}18`, border: `1px solid ${s.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active/Inactive distribution bar ── */}
      {numbers.length > 0 && (
        <div className="card card-sm" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <i className="bi bi-bar-chart-fill" style={{ color: 'var(--accent)', fontSize: 13 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Number Status Distribution</span>
            <span className="live-badge" style={{ fontSize: 9, marginLeft: 'auto' }}>
              <span className="live-dot" />30s refresh
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--border)' }}>
            <div style={{ flex: activeCount || 0.01, height: '100%', background: 'var(--green)', transition: 'flex .5s ease' }} />
            <div style={{ flex: inactiveCount || 0.01, height: '100%', background: 'var(--text3)', transition: 'flex .5s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="bi bi-circle-fill" style={{ fontSize: 7 }} />
              Active: {activeCount} ({numbers.length > 0 ? Math.round(activeCount / numbers.length * 100) : 0}%)
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="bi bi-dash-circle" style={{ fontSize: 9 }} />
              Inactive: {inactiveCount} ({numbers.length > 0 ? Math.round(inactiveCount / numbers.length * 100) : 0}%)
            </span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="input-group" style={{ flex: '1 1 220px' }}>
          <i className="bi bi-search input-icon" />
          <input
            type="text"
            placeholder="Search by number or country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 'auto', flex: '0 0 160px' }}
        >
          <option value="">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        {(search || statusFilter) && (
          <button className="btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter('') }} style={{ gap: 5 }}>
            <i className="bi bi-x" style={{ fontSize: 15 }} />Clear
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 12 }}>
          <i className="bi bi-filter" />
          {filtered.length} of {numbers.length} shown
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 28, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading numbers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text3)' }}>
            {needsSync || numbers.length === 0 ? (
              <>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
                <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Sync Required</p>
                <p style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.7 }}>
                  No numbers loaded yet. Click <strong>Sync iVASMS</strong> to pull your real<br />
                  phone numbers from iVASMS.com.
                </p>
                <p style={{ fontSize: 12, marginBottom: 24, color: 'var(--text3)' }}>
                  iVASMS credentials are pre-configured — just click Sync.
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn-primary"
                  style={{ display: 'inline-flex', gap: 8, padding: '11px 24px', fontSize: 15 }}
                >
                  <i className="bi bi-arrow-repeat" style={{ fontSize: 16, animation: syncing ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
                  {syncing ? 'Syncing iVASMS…' : 'Sync iVASMS Now'}
                </button>
              </>
            ) : (
              <>
                <i className="bi bi-phone-fill" style={{ fontSize: 44, display: 'block', marginBottom: 16, opacity: .2 }} />
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>No numbers match your filter</p>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Try removing filters to see all numbers.</p>
                <button className="btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter('') }}>
                  <i className="bi bi-x" /> Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th><i className="bi bi-phone-fill" style={{ marginRight: 6 }} />Number</th>
                <th><i className="bi bi-globe" style={{ marginRight: 6 }} />Country</th>
                <th><i className="bi bi-circle-fill" style={{ marginRight: 6, fontSize: 8 }} />Status</th>
                <th><i className="bi bi-chat-dots-fill" style={{ marginRight: 6 }} />SMS</th>
                <th><i className="bi bi-clock-fill" style={{ marginRight: 6 }} />Last SMS</th>
                <th><i className="bi bi-whatsapp" style={{ marginRight: 6 }} />WhatsApp</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n: any) => (
                <>
                  <tr
                    key={n.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleExpand(n)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CountryFlag country={n.country} />
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{n.phone}</div>
                          {n.ivasms_id && (
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>ID #{n.ivasms_id}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{n.country_name || n.country || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{n.country}</div>
                    </td>
                    <td>
                      <StatusBadge status={n.status} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: (n.sms_count || 0) > 0 ? 'var(--text)' : 'var(--text3)' }}>
                        {n.sms_count || 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtTime(n.last_received)}</span>
                    </td>
                    <td>
                      {n.whatsapp_created ? (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>
                          <i className="bi bi-whatsapp" style={{ fontSize: 10 }} />Linked
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <i
                        className={`bi ${expandedId === n.id ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                        style={{ color: 'var(--text3)', fontSize: 12 }}
                      />
                    </td>
                  </tr>

                  {/* ── Expanded Live SMS row ── */}
                  {expandedId === n.id && (
                    <tr key={`exp-${n.id}`}>
                      <td colSpan={7} style={{ padding: 0, background: 'var(--bg)' }}>
                        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--border)' }}>

                          {/* Panel header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                            <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 14 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5 }}>
                              Live SMS for {n.phone}
                            </span>
                            <span className="live-badge" style={{ fontSize: 10 }}>
                              <span className="live-dot" />5s refresh
                            </span>
                            <StatusBadge status={n.status} />
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>
                              {(smsMap[n.id] || []).length} message{(smsMap[n.id] || []).length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {smsLoading[n.id] ? (
                            <div style={{ color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className="bi bi-arrow-repeat animate-spin" />Loading messages…
                            </div>
                          ) : !smsMap[n.id] || smsMap[n.id].length === 0 ? (
                            <div style={{ color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className="bi bi-chat-dots-fill" style={{ opacity: .3 }} />
                              No SMS yet for this number. Sync iVASMS to load messages.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                              {smsMap[n.id].map((msg: any) => (
                                <div key={msg.id} className="sms-item" style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                    <div style={{
                                      background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.2)',
                                      borderRadius: 6, padding: '2px 8px',
                                      fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                                    }}>
                                      <i className="bi bi-person-fill" style={{ marginRight: 4, fontSize: 10 }} />
                                      {msg.sender}
                                    </div>
                                    {msg.service && msg.service !== 'Unknown' && (
                                      <span className="badge badge-blue" style={{ fontSize: 10 }}>{msg.service}</span>
                                    )}
                                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>
                                      <i className="bi bi-clock-fill" style={{ marginRight: 3, fontSize: 9 }} />
                                      {fmtTime(msg.received_at)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>{msg.body}</p>
                                    {msg.otp && (
                                      <div style={{
                                        background: 'rgba(229,9,20,.12)', border: '1px solid rgba(229,9,20,.35)',
                                        color: 'var(--accent)', fontWeight: 900, fontSize: 16,
                                        padding: '4px 12px', borderRadius: 7,
                                        fontFamily: 'monospace', letterSpacing: 4,
                                        whiteSpace: 'nowrap', flexShrink: 0,
                                        boxShadow: '0 0 12px rgba(229,9,20,.15)',
                                      }}>
                                        <i className="bi bi-key-fill" style={{ marginRight: 6, fontSize: 12 }} />
                                        {msg.otp}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
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
        )}
      </div>
    </div>
  )
}
