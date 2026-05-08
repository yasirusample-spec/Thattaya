'use client'
import { useState, useEffect, useCallback } from 'react'

export default function ActivityPage() {
  const [activity, setActivity] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')
  const [search,   setSearch]   = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/activity')
      if (r.ok) { const d = await r.json(); setActivity(d.activity || []) }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = activity
    .filter(a => !filter || a.type === filter)
    .filter(a => !search || (a.description||'').toLowerCase().includes(search.toLowerCase()) || (a.type||'').includes(search.toLowerCase()))

  const TYPE_ICONS: Record<string, string> = {
    login: 'bi-box-arrow-in-right', logout: 'bi-box-arrow-right',
    sync: 'bi-arrow-repeat', otp: 'bi-key-fill', sms: 'bi-chat-dots-fill',
    whatsapp: 'bi-whatsapp', telegram: 'bi-telegram', action: 'bi-lightning-fill',
    export: 'bi-download', bulk: 'bi-send-fill',
  }
  const TYPE_COLORS: Record<string, string> = {
    login: 'var(--green)', logout: 'var(--text3)', sync: '#3b82f6', otp: '#8b5cf6',
    sms: 'var(--accent)', whatsapp: '#25d366', telegram: '#0088cc', action: '#f59e0b',
    export: '#06b6d4', bulk: 'var(--accent)',
  }

  const types = [...new Set(activity.map(a => a.type))]
  const stats: Record<string, number> = {}
  for (const a of activity) stats[a.type] = (stats[a.type] || 0) + 1

  const fmtTime = (ts: string) => {
    try {
      const d = new Date(ts)
      const now = Date.now()
      const diff = now - d.getTime()
      if (diff < 60000) return 'Just now'
      if (diff < 3600000) return `${Math.round(diff/60000)}m ago`
      if (diff < 86400000) return `${Math.round(diff/3600000)}h ago`
      return d.toLocaleDateString()
    } catch { return ts }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
            <i className="bi bi-activity" style={{ marginRight: 10, color: 'var(--accent)' }} />Activity Log
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Full audit trail of all account actions</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>
            <i className="bi bi-arrow-clockwise" style={{ marginRight: 6 }} />Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
        {Object.entries(stats).slice(0, 8).map(([type, count]) => (
          <div key={type} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`bi ${TYPE_ICONS[type] || 'bi-circle-fill'}`} style={{ fontSize: 16, color: TYPE_COLORS[type] || 'var(--text3)' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: TYPE_COLORS[type] || 'var(--text)' }}>{count}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .3 }}>{type}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activity…"
            style={{ width: '100%', paddingLeft: 30, height: 34, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('')} className={!filter ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 11, padding: '5px 10px' }}>All</button>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t === filter ? '' : t)} className={filter === t ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 11, padding: '5px 10px' }}>
              <i className={`bi ${TYPE_ICONS[t] || 'bi-dot'}`} style={{ marginRight: 4, color: filter === t ? '#fff' : TYPE_COLORS[t] }} />
              {t}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{filtered.length} events</span>
      </div>

      {/* Timeline */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}>{Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <i className="bi bi-clock-history" style={{ fontSize: 48, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
            <p style={{ color: 'var(--text3)', margin: 0 }}>{activity.length === 0 ? 'No activity recorded yet.' : 'No matching activity.'}</p>
          </div>
        ) : (
          <div>
            {filtered.map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${TYPE_COLORS[a.type] || 'var(--text3)'}15`, border: `1px solid ${TYPE_COLORS[a.type] || 'var(--text3)'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <i className={`bi ${TYPE_ICONS[a.type] || 'bi-circle'}`} style={{ fontSize: 14, color: TYPE_COLORS[a.type] || 'var(--text3)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TYPE_COLORS[a.type] || 'var(--text)', textTransform: 'capitalize' }}>{a.type}</span>
                    {a.description && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{a.description}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 10.5, color: 'var(--text3)' }}>
                    <span><i className="bi bi-clock" style={{ marginRight: 3 }} />{fmtTime(a.ts)}</span>
                    {a.ip && a.ip !== 'unknown' && <span><i className="bi bi-geo-alt" style={{ marginRight: 3 }} />{a.ip}</span>}
                    {a.ua && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}><i className="bi bi-laptop" style={{ marginRight: 3 }} />{a.ua}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, textAlign: 'right' }}>
                  {new Date(a.ts).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
