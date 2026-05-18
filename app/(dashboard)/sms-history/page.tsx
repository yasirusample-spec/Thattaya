'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const SVC_COLORS: Record<string, string> = {
  Google: '#4285f4', WhatsApp: '#25d366', Telegram: '#229ed9', Facebook: '#1877f2',
  Instagram: '#e1306c', Twitter: '#1da1f2', Amazon: '#ff9900', Microsoft: '#00a4ef',
  Apple: '#777', PayPal: '#003087', Netflix: '#e50914', TikTok: '#ff0050',
  Discord: '#5865f2', LinkedIn: '#0a66c2', Binance: '#f3ba2f', Coinbase: '#0052ff',
  Snapchat: '#fffc00', Uber: '#000', Shopify: '#96bf48', Unknown: '#6a6a8a',
}

const SERVICES = ['Google','WhatsApp','Telegram','Facebook','Instagram','Amazon','Microsoft','Apple','Twitter','TikTok','Discord','Netflix','Binance','PayPal','LinkedIn','Snapchat']

export default function SMSHistoryPage() {
  const [messages,   setMessages]   = useState<any[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [pages,      setPages]      = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [hasOtp,     setHasOtp]     = useState(false)
  const [service,    setService]    = useState('')
  const [numberId,   setNumberId]   = useState('')
  const [numbers,    setNumbers]    = useState<any[]>([])
  const [live,       setLive]       = useState(true)
  const [copied,     setCopied]     = useState<string|null>(null)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [deleting,   setDeleting]   = useState(false)
  const [newIds,     setNewIds]     = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const prevTotal = useRef(0)

  const fetchMsgs = useCallback(async (isLive = false) => {
    if (!isLive) setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '30',
        ...(search   && { search }),
        ...(hasOtp   && { hasOtp: 'true' }),
        ...(service  && { service }),
        ...(numberId && { numberId }),
      })
      const r = await fetch(`/api/ivasms/sms?${params}`)
      if (r.ok) {
        const d = await r.json()
        const msgs = d.messages || []
        if (isLive && prevTotal.current > 0 && d.total > prevTotal.current) {
          const prevIds = new Set(messages.map((m: any) => m.id))
          const incoming = msgs.filter((m: any) => !prevIds.has(m.id))
          if (incoming.length > 0) {
            setNewIds(new Set(incoming.map((m: any) => m.id)))
            setTimeout(() => setNewIds(new Set()), 4000)
          }
        }
        prevTotal.current = d.total || 0
        setMessages(msgs)
        setTotal(d.total || 0)
        setPages(d.pages || 1)
      }
    } catch {}
    if (!isLive) setLoading(false)
  }, [page, search, hasOtp, service, numberId, messages])

  useEffect(() => { setPage(1) }, [search, hasOtp, service, numberId])
  useEffect(() => { fetchMsgs() }, [page, search, hasOtp, service, numberId])

  useEffect(() => {
    fetch('/api/ivasms/numbers').then(r => r.json()).then(d => setNumbers(d.numbers || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => fetchMsgs(true), 5000)
    return () => clearInterval(t)
  }, [live, fetchMsgs])

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopied(otp)
    setTimeout(() => setCopied(null), 2500)
  }

  const toggleSelect = (id: string) => {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} message${selected.size > 1 ? 's' : ''}?`)) return
    setDeleting(true)
    try {
      await fetch('/api/ivasms/sms', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) })
      setMessages(p => p.filter(m => !selected.has(m.id)))
      setTotal(p => p - selected.size)
      setSelected(new Set())
    } catch {}
    setDeleting(false)
  }

  const exportCSV = () => {
    const header = 'Phone,Sender,Service,OTP,Body,Time'
    const rows = messages.map(m => `"${m.phone_number}","${m.sender}","${m.service}","${m.otp||''}","${(m.body||'').replace(/"/g,'""')}","${m.received_at}"`)
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `dl-sms-${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const fmtTime = (t: string) => {
    try {
      const d = new Date(t), diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
      if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return d.toLocaleDateString()
    } catch { return t }
  }

  const otpCount  = messages.filter(m => m.otp).length
  const svcCounts = messages.reduce((a: any, m) => { if (m.service && m.service !== 'Unknown') a[m.service] = (a[m.service]||0) + 1; return a }, {})
  const topSvc    = Object.entries(svcCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 20 }} />
            SMS History
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            {total.toLocaleString()} messages · {live ? 'Live 5s' : 'Paused'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button onClick={bulkDelete} disabled={deleting} className="btn-ghost btn-sm" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
              <i className="bi bi-trash-fill" style={{ fontSize: 13 }} />
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          )}
          <button onClick={() => setLive(p => !p)} className={live ? 'btn-success btn-sm' : 'btn-secondary btn-sm'} style={{ gap: 6 }}>
            {live ? <><span className="live-dot" />Live ON</> : <><i className="bi bi-record-circle" style={{ fontSize: 13 }} />Live OFF</>}
          </button>
          <button onClick={exportCSV} className="btn-secondary btn-sm" style={{ gap: 6 }}>
            <i className="bi bi-download" style={{ fontSize: 13 }} />Export CSV
          </button>
        </div>
      </div>

      {/* ── Quick stats row ── */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
            <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{total.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Total SMS</div>
            </div>
          </div>
          <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
            <i className="bi bi-key-fill" style={{ color: 'var(--orange)', fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--orange)', lineHeight: 1 }}>{otpCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>With OTP</div>
            </div>
          </div>
          {topSvc.map(([svc, cnt]: any) => (
            <div key={svc} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', cursor: 'pointer' }}
              onClick={() => setService(service === svc ? '' : svc)}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: SVC_COLORS[svc] || 'var(--text3)', display: 'inline-block', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: SVC_COLORS[svc] || 'var(--text)', lineHeight: 1 }}>{cnt}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{svc}</div>
              </div>
              {service === svc && <i className="bi bi-x-circle-fill" style={{ color: 'var(--accent)', fontSize: 12 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card card-sm" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div className="input-group" style={{ flex: '1 1 200px' }}>
          <i className="bi bi-search input-icon" />
          <input placeholder="Search body, sender, number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={service} onChange={e => setService(e.target.value)} style={{ flex: '0 0 160px', width: 'auto' }}>
          <option value="">All Services</option>
          {SERVICES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={numberId} onChange={e => setNumberId(e.target.value)} style={{ flex: '0 0 180px', width: 'auto' }}>
          <option value="">All Numbers</option>
          {numbers.map(n => <option key={n.id} value={n.id}>{n.phone}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text2)', userSelect: 'none' }}>
          <input type="checkbox" checked={hasOtp} onChange={e => setHasOtp(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <i className="bi bi-key-fill" style={{ color: 'var(--orange)' }} /> OTP only
        </label>
        {(search || service || numberId || hasOtp) && (
          <button className="btn-ghost btn-xs" onClick={() => { setSearch(''); setService(''); setNumberId(''); setHasOtp(false) }}>
            <i className="bi bi-x" style={{ fontSize: 14 }} />Clear all
          </button>
        )}
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginLeft: 'auto' }}>
            {selected.size} selected
          </span>
        )}
      </div>

      {/* ── Messages list ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {messages.length > 0 && (
              <input type="checkbox" style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                checked={selected.size === messages.length && messages.length > 0}
                onChange={e => setSelected(e.target.checked ? new Set(messages.map(m => m.id)) : new Set())} />
            )}
            <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 15 }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Messages</span>
            <span className="badge badge-gray" style={{ fontSize: 11 }}>{total.toLocaleString()}</span>
          </div>
          {live && <span className="live-badge"><span className="live-dot" />LIVE</span>}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 30, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
            <i className="bi bi-chat-dots-fill" style={{ fontSize: 44, display: 'block', marginBottom: 16, opacity: .15 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No messages found</p>
            <p style={{ fontSize: 13 }}>{total === 0 ? 'Go to Numbers and click Load Numbers to get started.' : 'Try adjusting your filters.'}</p>
            {total === 0 && (
              <a href="/numbers" className="btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex', gap: 6 }}>
                <i className="bi bi-phone-fill" style={{ fontSize: 13 }} />Go to Numbers
              </a>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th><i className="bi bi-phone-fill" style={{ marginRight: 5 }} />Number</th>
                  <th><i className="bi bi-person-fill" style={{ marginRight: 5 }} />Sender</th>
                  <th><i className="bi bi-app-indicator" style={{ marginRight: 5 }} />Service</th>
                  <th style={{ minWidth: 260 }}><i className="bi bi-chat-fill" style={{ marginRight: 5 }} />Message</th>
                  <th><i className="bi bi-key-fill" style={{ marginRight: 5, color: 'var(--orange)' }} />OTP</th>
                  <th><i className="bi bi-clock-fill" style={{ marginRight: 5 }} />Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m: any) => (
                  <>
                    <tr key={m.id} className={newIds.has(m.id) ? 'new-sms' : ''} style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                          checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} />
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {m.phone_number}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{m.sender || '—'}</td>
                      <td>
                        {m.service && m.service !== 'Unknown' ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: SVC_COLORS[m.service] || 'var(--text2)',
                            background: `${SVC_COLORS[m.service]||'#666'}18`, border: `1px solid ${SVC_COLORS[m.service]||'#666'}30`,
                            padding: '2px 7px', borderRadius: 4 }}>
                            {m.service}
                          </span>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 300 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.body}
                        </span>
                      </td>
                      <td>
                        {m.otp ? (
                          <button onClick={e => { e.stopPropagation(); copyOtp(m.otp) }}
                            style={{ background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)',
                              color: 'var(--accent)', fontWeight: 900, fontSize: 14, padding: '3px 10px',
                              borderRadius: 7, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 3,
                              display: 'flex', alignItems: 'center', gap: 5 }}
                            title="Copy OTP">
                            {m.otp}
                            <i className={`bi ${copied === m.otp ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 10 }} />
                          </button>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        <i className="bi bi-clock-fill" style={{ marginRight: 4 }} />{fmtTime(m.received_at)}
                      </td>
                    </tr>
                    {expandedId === m.id && (
                      <tr key={`exp-${m.id}`}>
                        <td colSpan={7} style={{ padding: 0, background: 'var(--bg)' }}>
                          <div style={{ padding: '14px 20px', borderTop: '2px solid var(--accent)' }}>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Full Message</div>
                                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, background: 'var(--bg2)', padding: '10px 14px', borderRadius: 8 }}>{m.body}</p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                                {m.otp && (
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>OTP Code</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, letterSpacing: 6, color: 'var(--accent)',
                                        background: 'rgba(229,9,20,.08)', border: '1px solid rgba(229,9,20,.3)', padding: '6px 16px', borderRadius: 10 }}>
                                        {m.otp}
                                      </div>
                                      <button onClick={() => copyOtp(m.otp)} className={copied === m.otp ? 'btn-success btn-sm' : 'btn-primary btn-sm'}>
                                        <i className={`bi ${copied === m.otp ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 13 }} />
                                        {copied === m.otp ? 'Copied!' : 'Copy'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <div><strong>From:</strong> {m.sender}</div>
                                  <div><strong>To:</strong> {m.phone_number}</div>
                                  <div><strong>Service:</strong> {m.service || 'Unknown'}</div>
                                  <div><strong>Time:</strong> {new Date(m.received_at).toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(1)}><i className="bi bi-chevron-double-left" /></button>
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p-1)}><i className="bi bi-chevron-left" /></button>
          <span style={{ fontSize: 13, color: 'var(--text2)', padding: '0 12px' }}>
            Page <strong style={{ color: 'var(--text)' }}>{page}</strong> of {pages}
          </span>
          <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(p => p+1)}><i className="bi bi-chevron-right" /></button>
          <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(pages)}><i className="bi bi-chevron-double-right" /></button>
        </div>
      )}
    </div>
  )
}
