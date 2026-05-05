'use client'
import { useState, useEffect, useCallback } from 'react'

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [smsMap, setSmsMap] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  const fetchNumbers = useCallback(async () => {
    try {
      const r = await fetch('/api/ivasms/numbers')
      if (r.ok) {
        const { numbers: nums } = await r.json()
        setNumbers(nums || [])
        setFiltered(nums || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchNumbers() }, [fetchNumbers])

  useEffect(() => {
    let f = numbers
    if (search) f = f.filter(n => n.phone?.includes(search) || n.country?.toLowerCase().includes(search.toLowerCase()))
    if (countryFilter) f = f.filter(n => n.country === countryFilter)
    setFiltered(f)
  }, [search, countryFilter, numbers])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`✓ Synced ${d.count} numbers (${d.added} new)`)
        fetchNumbers()
      } else {
        setSyncMsg(`✗ ${d.error}`)
      }
    } catch { setSyncMsg('✗ Network error') }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 5000) }
  }

  const fetchSMSForNumber = async (numberId: string, phone: string) => {
    if (smsMap[numberId]) return
    try {
      const r = await fetch(`/api/ivasms/sms?numberId=${numberId}&limit=5`)
      if (r.ok) {
        const { messages } = await r.json()
        setSmsMap(prev => ({ ...prev, [numberId]: messages || [] }))
      }
    } catch {}
  }

  const toggleExpand = (id: string, phone: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    fetchSMSForNumber(id, phone)
  }

  const countries = Array.from(new Set(numbers.map((n: any) => n.country).filter(Boolean)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>📱 Numbers</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>{numbers.length} numbers synced from iVASMS</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {syncMsg && <span style={{ fontSize: 12, color: syncMsg.startsWith('✓') ? 'var(--green)' : 'var(--accent)', padding: '4px 10px', background: 'var(--bg2)', borderRadius: 6 }}>{syncMsg}</span>}
          <button onClick={handleSync} disabled={syncing} className="btn-primary" style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
            Sync from iVASMS
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Search numbers or country..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-green">{filtered.filter(n => n.status === 'active').length} Active</span>
          <span className="badge badge-gray">{filtered.length} Total</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <p style={{ marginTop: 12 }}>Loading numbers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📵</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>No numbers found</p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>Configure iVASMS credentials in Settings, then sync.</p>
            <button onClick={handleSync} className="btn-primary" style={{ padding: '10px 20px' }}>⟳ Sync Now</button>
          </div>
        ) : (
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Flag</th>
                <th>Phone Number</th>
                <th>Country</th>
                <th>Status</th>
                <th>SMS Count</th>
                <th>Last Received</th>
                <th>WhatsApp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n: any) => (
                <>
                  <tr key={n.id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(n.id, n.phone)}>
                    <td style={{ paddingLeft: 20, fontSize: 20 }}>{n.flag || '🌍'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>{n.phone}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 13 }}>{n.country || 'Unknown'}</td>
                    <td>
                      <span className={`badge ${n.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {n.status || 'active'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: 13 }}>{n.sms_count || 0}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>
                      {n.last_received ? new Date(n.last_received).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      {n.whatsapp_created ? (
                        <span className="badge badge-green">● Connected</span>
                      ) : (
                        <span className="badge badge-gray">○ None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(33,150,243,.1)', border: '1px solid rgba(33,150,243,.3)', color: 'var(--blue)', borderRadius: 6, cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); toggleExpand(n.id, n.phone) }}
                        >SMS</button>
                        <a
                          href="/whatsapp"
                          style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(37,211,102,.1)', border: '1px solid rgba(37,211,102,.3)', color: '#25d366', borderRadius: 6, cursor: 'pointer', textDecoration: 'none' }}
                          onClick={e => e.stopPropagation()}
                        >WA</a>
                      </div>
                    </td>
                  </tr>
                  {expandedId === n.id && (
                    <tr key={`${n.id}-exp`}>
                      <td colSpan={8} style={{ background: 'rgba(20,20,30,.8)', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>Last 5 SMS for {n.phone}:</div>
                        {(smsMap[n.id] || []).length === 0 ? (
                          <p style={{ color: 'var(--text3)', fontSize: 12 }}>No SMS messages found for this number.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(smsMap[n.id] || []).map((s: any, i: number) => (
                              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text3)', fontSize: 11, whiteSpace: 'nowrap', minWidth: 80 }}>
                                  {s.received_at ? new Date(s.received_at).toLocaleTimeString() : '-'}
                                </span>
                                <span style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 500 }}>{s.sender}</span>
                                <span style={{ color: 'var(--text)', fontSize: 12, flex: 1 }}>{s.body}</span>
                                {s.otp && (
                                  <span style={{ background: 'rgba(229,9,20,.15)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                                    {s.otp}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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
