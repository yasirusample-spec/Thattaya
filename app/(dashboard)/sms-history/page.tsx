'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const SVC_COLORS: Record<string, string> = {
  Google: 'badge-blue', WhatsApp: 'badge-green', Telegram: 'badge-blue',
  Facebook: 'badge-blue', Instagram: 'badge-orange', Twitter: 'badge-gray',
  Amazon: 'badge-orange', Microsoft: 'badge-blue', Apple: 'badge-gray',
  Netflix: 'badge-red', TikTok: 'badge-gray', Unknown: 'badge-gray',
}

export default function SMSHistoryPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasOtp, setHasOtp] = useState(false)
  const [service, setService] = useState('')
  const [numberId, setNumberId] = useState('')
  const [numbers, setNumbers] = useState<any[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [live, setLive] = useState(true)
  const prevTotalRef = useRef(0)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchMessages = useCallback(async (isLivePoll = false) => {
    if (!isLivePoll) setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '25',
        ...(search && { search }),
        ...(hasOtp && { hasOtp: 'true' }),
        ...(service && { service }),
        ...(numberId && { numberId }),
      })
      const r = await fetch(`/api/ivasms/sms?${params}`)
      if (r.ok) {
        const d = await r.json()
        const msgs = d.messages || []
        if (isLivePoll && prevTotalRef.current > 0 && d.total > prevTotalRef.current) {
          const prevIds = new Set(messages.map((m: any) => m.id))
          const incoming = msgs.filter((m: any) => !prevIds.has(m.id))
          if (incoming.length > 0) {
            setNewIds(new Set(incoming.map((m: any) => m.id)))
            setTimeout(() => setNewIds(new Set()), 4000)
          }
        }
        prevTotalRef.current = d.total || 0
        setMessages(msgs)
        setTotal(d.total || 0)
        setPages(d.pages || 1)
      }
    } catch {}
    if (!isLivePoll) setLoading(false)
  }, [page, search, hasOtp, service, numberId, messages])

  useEffect(() => {
    setPage(1)
  }, [search, hasOtp, service, numberId])

  useEffect(() => { fetchMessages() }, [page, search, hasOtp, service, numberId])

  useEffect(() => {
    fetch('/api/ivasms/numbers').then(r => r.json()).then(d => setNumbers(d.numbers || [])).catch(() => {})
  }, [])

  // Live polling
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => fetchMessages(true), 5000)
    return () => clearInterval(t)
  }, [live, fetchMessages])

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopied(otp)
    setTimeout(() => setCopied(null), 2000)
  }

  const exportCSV = () => {
    const header = 'Phone,Sender,Service,OTP,Body,Time'
    const rows = messages.map(m =>
      `"${m.phone_number}","${m.sender}","${m.service}","${m.otp || ''}","${(m.body || '').replace(/"/g, '""')}","${m.received_at}"`
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `dl-sms-${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const fmtTime = (t: string) => {
    try {
      const d = new Date(t), now = new Date()
      const diff = (now.getTime() - d.getTime()) / 1000
      if (diff < 60) return `${Math.floor(diff)}s ago`
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return d.toLocaleDateString()
    } catch { return t }
  }

  const services = ['Google', 'WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'Amazon', 'Microsoft']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>SMS History</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            {total.toLocaleString()} messages · {live ? 'Live polling every 5s' : 'Live paused'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setLive(p => !p)}
            className={live ? 'btn-success btn-sm' : 'btn-secondary btn-sm'}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {live ? <><span className="live-dot" />Live ON</> : <><i className="bi bi-record-circle" style={{ fontSize: 13 }} />Live OFF</>}
          </button>
          <button onClick={exportCSV} className="btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-download" style={{ fontSize: 13 }} />Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-sm" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div className="input-group" style={{ flex: '1 1 200px' }}>
          <i className="bi bi-search input-icon" />
          <input placeholder="Search messages, sender, number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={service} onChange={e => setService(e.target.value)} style={{ flex: '0 0 150px', width: 'auto' }}>
          <option value="">All Services</option>
          {services.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={numberId} onChange={e => setNumberId(e.target.value)} style={{ flex: '0 0 180px', width: 'auto' }}>
          <option value="">All Numbers</option>
          {numbers.map(n => <option key={n.id} value={n.id}>{n.phone}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text2)', userSelect: 'none' }}>
          <input
            type="checkbox" checked={hasOtp} onChange={e => setHasOtp(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <i className="bi bi-key-fill" style={{ color: 'var(--orange)' }} /> OTP only
        </label>
        {(search || service || numberId || hasOtp) && (
          <button className="btn-ghost btn-xs" onClick={() => { setSearch(''); setService(''); setNumberId(''); setHasOtp(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="bi bi-x" style={{ fontSize: 14 }} />Clear
          </button>
        )}
      </div>

      {/* Messages list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 15 }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Messages</span>
            <span className="badge badge-gray">{total.toLocaleString()}</span>
          </div>
          {live && <span className="live-badge"><span className="live-dot" />LIVE</span>}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 30, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
            <i className="bi bi-chat-dots-fill" style={{ fontSize: 44, display: 'block', marginBottom: 16, opacity: .2 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No messages found</p>
            <p style={{ fontSize: 13 }}>{total === 0 ? 'Sync iVASMS to load SMS messages.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th><i className="bi bi-phone-fill" style={{ marginRight: 5 }} />Number</th>
                  <th><i className="bi bi-person-fill" style={{ marginRight: 5 }} />Sender</th>
                  <th><i className="bi bi-app-indicator" style={{ marginRight: 5 }} />Service</th>
                  <th style={{ minWidth: 280 }}><i className="bi bi-chat-fill" style={{ marginRight: 5 }} />Message</th>
                  <th><i className="bi bi-key-fill" style={{ marginRight: 5, color: 'var(--orange)' }} />OTP</th>
                  <th><i className="bi bi-clock-fill" style={{ marginRight: 5 }} />Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m: any) => (
                  <tr key={m.id} className={newIds.has(m.id) ? 'new-sms' : ''} style={{ animation: newIds.has(m.id) ? 'newSMS .5s ease' : 'none' }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {m.phone_number}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{m.sender || '—'}</td>
                    <td>
                      {m.service && m.service !== 'Unknown' ? (
                        <span className={`badge ${SVC_COLORS[m.service] || 'badge-gray'}`} style={{ fontSize: 10 }}>{m.service}</span>
                      ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 320 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {m.body}
                      </span>
                    </td>
                    <td>
                      {m.otp ? (
                        <button
                          onClick={() => copyOtp(m.otp)}
                          style={{
                            background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)',
                            color: 'var(--accent)', fontWeight: 900, fontSize: 14,
                            padding: '3px 10px', borderRadius: 7, cursor: 'pointer',
                            fontFamily: 'monospace', letterSpacing: 3,
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}
                          title="Click to copy"
                        >
                          {m.otp}
                          <i className={`bi ${copied === m.otp ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 11 }} />
                        </button>
                      ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      <i className="bi bi-clock-fill" style={{ marginRight: 4 }} />{fmtTime(m.received_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="bi bi-chevron-left" />First
          </button>
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <i className="bi bi-chevron-left" />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text2)', padding: '0 8px' }}>
            Page <strong style={{ color: 'var(--text)' }}>{page}</strong> of {pages}
          </span>
          <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <i className="bi bi-chevron-right" />
          </button>
          <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage(pages)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Last<i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}
