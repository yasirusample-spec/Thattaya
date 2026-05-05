'use client'
import { useState, useEffect, useCallback } from 'react'

const SERVICE_COLORS: Record<string, string> = {
  Google: 'badge-blue', WhatsApp: 'badge-green', Telegram: 'badge-blue',
  Facebook: 'badge-blue', Instagram: 'badge-orange', Twitter: 'badge-blue',
  Amazon: 'badge-orange', Microsoft: 'badge-blue', Apple: 'badge-gray',
  PayPal: 'badge-blue', Unknown: 'badge-gray',
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
  const [numbers, setNumbers] = useState<any[]>([])
  const [numberId, setNumberId] = useState('')
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '20',
        ...(search && { search }),
        ...(hasOtp && { hasOtp: 'true' }),
        ...(service && { service }),
        ...(numberId && { numberId }),
      })
      const r = await fetch(`/api/ivasms/sms?${params}`)
      if (r.ok) {
        const d = await r.json()
        setMessages(d.messages || [])
        setTotal(d.total || 0)
        setPages(d.pages || 1)
      }
    } catch {}
    setLoading(false)
  }, [page, search, hasOtp, service, numberId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => {
    fetch('/api/ivasms/numbers').then(r => r.json()).then(d => setNumbers(d.numbers || [])).catch(() => {})
  }, [])

  const exportCSV = () => {
    const rows = [['Time', 'Number', 'Sender', 'Message', 'OTP', 'Service']]
    messages.forEach((m: any) => rows.push([m.received_at, m.phone_number, m.sender, `"${(m.body||'').replace(/"/g,'""')}"`, m.otp||'', m.service||'']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dl-sms-export-${Date.now()}.csv`
    a.click()
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchMessages() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>📨 SMS History</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>{total.toLocaleString()} total messages</p>
        </div>
        <button onClick={exportCSV} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'rgba(0,200,83,.1)', border: '1px solid rgba(0,200,83,.3)',
          color: 'var(--green)', cursor: 'pointer',
        }}>📥 Export CSV</button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="🔍 Search messages..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, maxWidth: 300 }} />
          <select value={numberId} onChange={e => setNumberId(e.target.value)} style={{ width: 180 }}>
            <option value="">All Numbers</option>
            {numbers.map((n: any) => <option key={n.id} value={n.id}>{n.flag} {n.phone}</option>)}
          </select>
          <select value={service} onChange={e => setService(e.target.value)} style={{ width: 140 }}>
            <option value="">All Services</option>
            {['Google','WhatsApp','Telegram','Facebook','Instagram','Twitter','Amazon','Microsoft','Unknown'].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={hasOtp} onChange={e => { setHasOtp(e.target.checked); setPage(1) }}
              style={{ width: 'auto', accentColor: 'var(--accent)' }} />
            Has OTP only
          </label>
          <button type="submit" className="btn-primary" style={{ padding: '10px 18px', fontSize: 13, whiteSpace: 'nowrap' }}>
            🔍 Search
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
            <span style={{ fontSize: 28, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14 }}>No messages found</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Try syncing iVASMS or adjusting filters</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20, width: 140 }}>Time</th>
                <th style={{ width: 160 }}>Number</th>
                <th style={{ width: 120 }}>Sender</th>
                <th>Message</th>
                <th style={{ width: 90 }}>OTP</th>
                <th style={{ width: 110 }}>Service</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m: any) => (
                <tr key={m.id}>
                  <td style={{ paddingLeft: 20, fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {m.received_at ? new Date(m.received_at).toLocaleString() : '-'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>{m.phone_number}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{m.sender || '-'}</td>
                  <td>
                    <div
                      onMouseEnter={() => setHoveredMsg(m.id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                      style={{ position: 'relative' }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: hoveredMsg === m.id ? 'normal' : 'nowrap', maxWidth: 360, cursor: 'default' }}>
                        {m.body}
                      </span>
                    </div>
                  </td>
                  <td>
                    {m.otp ? (
                      <span style={{
                        background: 'rgba(229,9,20,.15)', border: '1px solid rgba(229,9,20,.4)',
                        color: 'var(--accent)', fontWeight: 800, fontSize: 13,
                        padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', letterSpacing: 2,
                        display: 'inline-block',
                      }}>{m.otp}</span>
                    ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <span className={`badge ${SERVICE_COLORS[m.service] || 'badge-gray'}`}>
                      {m.service || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', color: page === 1 ? 'var(--text3)' : 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            ← Prev
          </button>
          {Array.from({ length: Math.min(7, pages) }, (_, i) => {
            const p = i + 1
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid', cursor: 'pointer',
                  background: page === p ? 'var(--accent)' : 'var(--bg2)',
                  borderColor: page === p ? 'var(--accent)' : 'var(--border)',
                  color: page === p ? '#fff' : 'var(--text)',
                }}>
                {p}
              </button>
            )
          })}
          <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
            style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', color: page === pages ? 'var(--text3)' : 'var(--text)', cursor: page === pages ? 'not-allowed' : 'pointer' }}>
            Next →
          </button>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Page {page} of {pages}</span>
        </div>
      )}
    </div>
  )
}
