'use client'
import { useState, useEffect } from 'react'

export default function ExportPage() {
  const [stats,     setStats]     = useState({ sms: 0, numbers: 0 })
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/ivasms/sms?limit=1').then(r => r.json()),
      fetch('/api/ivasms/numbers').then(r => r.json()),
    ]).then(([s, n]) => {
      setStats({ sms: s.total || 0, numbers: (n.numbers || []).length })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const doExport = async (type: string, fmt: string) => {
    setExporting(`${type}-${fmt}`)
    try {
      const url = `/api/export/${type}?format=${fmt}`
      const r   = await fetch(url)
      if (fmt === 'csv') {
        const blob = await r.blob()
        const a    = document.createElement('a')
        a.href     = URL.createObjectURL(blob)
        a.download = `dl-${type}-export-${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      } else {
        const d    = await r.json()
        const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })
        const a    = document.createElement('a')
        a.href     = URL.createObjectURL(blob)
        a.download = `dl-${type}-export-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch {}
    setExporting(null)
  }

  const exportCards = [
    {
      id: 'sms',
      icon: 'bi-chat-dots-fill',
      title: 'SMS Messages',
      color: 'var(--blue)',
      count: stats.sms,
      unit: 'messages',
      desc: 'Export all received SMS messages including OTP codes, senders, and timestamps.',
      fields: ['id', 'phone_number', 'sender', 'service', 'otp', 'body', 'received_at'],
    },
    {
      id: 'numbers',
      icon: 'bi-phone-fill',
      title: 'Phone Numbers',
      color: 'var(--green)',
      count: stats.numbers,
      unit: 'numbers',
      desc: 'Export all synced phone numbers with country, status, and SMS counts.',
      fields: ['id', 'phone', 'country', 'status', 'sms_count', 'last_received'],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>

      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-download" style={{ color: 'var(--accent)', fontSize: 20 }} />
          Export Data
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Download your SMS and number data in JSON or CSV format</p>
      </div>

      {exportCards.map(card => (
        <div key={card.id} className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${card.color}18`, border: `1px solid ${card.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${card.icon}`} style={{ fontSize: 22, color: card.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{card.title}</h3>
                {!loading && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: card.color, background: `${card.color}18`, border: `1px solid ${card.color}33`, padding: '2px 10px', borderRadius: 20 }}>
                    {card.count.toLocaleString()} {card.unit}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>{card.desc}</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {card.fields.map(f => (
                  <span key={f} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontFamily: 'monospace', color: 'var(--text3)' }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => doExport(card.id, 'json')}
              disabled={!!exporting || loading}
              className="btn-primary btn-sm"
            >
              <i className="bi bi-filetype-json" style={{ fontSize: 14 }} />
              {exporting === `${card.id}-json` ? 'Exporting…' : 'Download JSON'}
            </button>
            <button
              onClick={() => doExport(card.id, 'csv')}
              disabled={!!exporting || loading}
              className="btn-success btn-sm"
            >
              <i className="bi bi-filetype-csv" style={{ fontSize: 14 }} />
              {exporting === `${card.id}-csv` ? 'Exporting…' : 'Download CSV'}
            </button>
          </div>
        </div>
      ))}

      <div className="alert alert-info">
        <i className="bi bi-shield-check" />
        <div>
          <strong>Privacy Note:</strong> All exports contain only your own data. Password hashes and API keys are never included in exports.
          Data is processed server-side and downloaded directly to your browser — nothing is stored externally.
        </div>
      </div>
    </div>
  )
}
