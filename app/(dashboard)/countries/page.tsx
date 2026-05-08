'use client'
import { useState, useEffect, useCallback } from 'react'

function flag(code: string) {
  try { return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('') } catch { return code }
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState<'numbers'|'sms'|'name'>('numbers')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/countries')
      if (r.ok) { const d = await r.json(); setCountries(d.countries || []) }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = countries
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'sms' ? b.sms - a.sms : b.numbers - a.numbers)

  const total = { numbers: countries.reduce((s, c) => s + c.numbers, 0), sms: countries.reduce((s, c) => s + c.sms, 0), active: countries.reduce((s, c) => s + c.active, 0) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}><i className="bi bi-globe2" style={{ marginRight: 10, color: 'var(--accent)' }} />Countries</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Number distribution by country</p>
        </div>
        <button onClick={load} className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>
          <i className="bi bi-arrow-clockwise" style={{ marginRight: 6 }} />Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: 'bi-globe2', label: 'Countries', value: countries.length, color: 'var(--accent)' },
          { icon: 'bi-phone-fill', label: 'Total Numbers', value: total.numbers, color: '#3b82f6' },
          { icon: 'bi-circle-fill', label: 'Active', value: total.active, color: 'var(--green)' },
          { icon: 'bi-chat-dots-fill', label: 'Total SMS', value: total.sms, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}18`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi ${s.icon}`} style={{ fontSize: 16, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search countries…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 36, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['numbers','sms','name'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)} className={sort === s ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 11, padding: '6px 12px', textTransform: 'capitalize' }}>
              <i className={`bi bi-${s === 'numbers' ? 'phone' : s === 'sms' ? 'chat-dots' : 'sort-alpha-down'}`} style={{ marginRight: 4 }} />
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <i className="bi bi-globe2" style={{ fontSize: 48, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text3)', margin: 0 }}>{countries.length === 0 ? 'No numbers synced yet. Go to Numbers and click Sync.' : 'No results found.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {filtered.map(c => {
            const maxNums = Math.max(...filtered.map(x => x.numbers), 1)
            const pct = Math.round(c.numbers / maxNums * 100)
            return (
              <div key={c.code} className="card" style={{ padding: '16px 18px', transition: 'transform .15s, border-color .15s' }}
                onMouseEnter={e => { (e.currentTarget as any).style.transform = 'translateY(-2px)'; (e.currentTarget as any).style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { (e.currentTarget as any).style.transform = ''; (e.currentTarget as any).style.borderColor = '' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 32, lineHeight: 1 }}>{flag(c.code)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: .5 }}>{c.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>{c.numbers}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>numbers</div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--accent),#ff6b6b)', borderRadius: 2, transition: 'width .5s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg)', borderRadius: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{c.active}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Active</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg)', borderRadius: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)' }}>{c.numbers - c.active}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Inactive</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg)', borderRadius: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>{c.sms}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>SMS</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
