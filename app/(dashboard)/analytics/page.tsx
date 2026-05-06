'use client'
import { useState, useEffect, useCallback } from 'react'

function CountryFlag({ country }: { country: string }) {
  const code = (country || 'US').toUpperCase().slice(0, 2)
  try {
    return <span style={{ fontSize: 16 }}>{code.split('').map((c: string) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')}</span>
  } catch { return <span style={{ fontSize: 11, color: 'var(--text3)' }}>{code}</span> }
}

const SVC_COLORS: Record<string, string> = {
  Google: '#4285f4', WhatsApp: '#25d366', Telegram: '#229ed9',
  Facebook: '#1877f2', Twitter: '#1da1f2', Amazon: '#ff9900',
  Microsoft: '#00a4ef', Apple: '#555', PayPal: '#003087',
  Uber: '#000', Netflix: '#e50914', TikTok: '#ff0050',
  Discord: '#5865f2', LinkedIn: '#0a66c2', Crypto: '#f7931a',
  Unknown: '#6a6a8a',
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [range,   setRange]   = useState(14)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/analytics')
      if (r.ok) setData(await r.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const maxDay   = data ? Math.max(...(data.smsPerDay || []).map((d: any) => d.count), 1) : 1
  const maxHour  = data ? Math.max(...(data.hourlyDistribution || []).map((h: any) => h.count), 1) : 1

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 36, color: 'var(--accent)', display: 'block', marginBottom: 16 }} />
        <p style={{ color: 'var(--text3)' }}>Loading analytics…</p>
      </div>
    </div>
  )

  const totals = data?.totals || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-bar-chart-fill" style={{ color: 'var(--accent)', fontSize: 20 }} />
            Analytics
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>SMS statistics and usage insights</p>
        </div>
        <button onClick={load} className="btn-secondary btn-sm">
          <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { icon: 'bi-phone-fill',      label: 'Numbers',     value: totals.numbers  || 0, color: 'var(--accent)' },
          { icon: 'bi-circle-fill',     label: 'Active',      value: totals.active   || 0, color: 'var(--green)'  },
          { icon: 'bi-chat-dots-fill',  label: 'Total SMS',   value: totals.sms      || 0, color: 'var(--blue)'   },
          { icon: 'bi-key-fill',        label: 'OTPs',        value: totals.otps     || 0, color: 'var(--yellow)'  },
          { icon: 'bi-clock-fill',      label: 'Last 24h',    value: totals.last24h  || 0, color: 'var(--cyan)'   },
          { icon: 'bi-calendar-week',   label: 'Last 7 days', value: totals.last7d   || 0, color: 'var(--purple)'  },
        ].map(s => (
          <div key={s.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: `${s.color}18`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SMS per day chart */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <i className="bi bi-graph-up" style={{ color: 'var(--accent)', fontSize: 16 }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>SMS per Day (Last 14 days)</h3>
          <span className="live-badge" style={{ fontSize: 10, marginLeft: 'auto' }}>
            <span className="live-dot" />Live
          </span>
        </div>
        {data?.smsPerDay?.length > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
              {(data.smsPerDay || []).map((d: any, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(4, (d.count / maxDay) * 100)}%`,
                        background: d.count > 0 ? 'linear-gradient(180deg, var(--accent), #c40812)' : 'var(--border)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height .5s ease',
                        cursor: 'default',
                        minHeight: 4,
                      }}
                      title={`${d.date}: ${d.count} SMS`}
                    />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                    {d.date?.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px 0' }}>
            <i className="bi bi-graph-up" style={{ fontSize: 28, opacity: .3, display: 'block', marginBottom: 8 }} />
            No SMS data yet. Sync iVASMS to see analytics.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Top Services */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <i className="bi bi-grid-fill" style={{ color: 'var(--blue)', fontSize: 16 }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Top Services</h3>
          </div>
          {(data?.topServices || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data.topServices || []).map((s: any, i: number) => {
                const total = (data.topServices || []).reduce((a: number, b: any) => a + b.count, 0)
                const pct   = total > 0 ? Math.round(s.count / total * 100) : 0
                const color = SVC_COLORS[s.name] || 'var(--accent)'
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                        #{i + 1} {s.name}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.count} ({pct}%)</span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No data</div>
          )}
        </div>

        {/* Top Countries */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <i className="bi bi-globe" style={{ color: 'var(--green)', fontSize: 16 }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Top Countries</h3>
          </div>
          {(data?.topCountries || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data.topCountries || []).map((c: any, i: number) => {
                const maxSms = Math.max(...(data.topCountries || []).map((x: any) => x.sms), 1)
                const pct    = Math.round((c.sms / maxSms) * 100)
                return (
                  <div key={c.country}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                        <CountryFlag country={c.country} />
                        #{i + 1} {c.country}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{c.sms} SMS</span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No data</div>
          )}
        </div>
      </div>

      {/* Hourly distribution */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <i className="bi bi-clock-fill" style={{ color: 'var(--purple)', fontSize: 16 }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Hourly Distribution</h3>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>Based on last 500 messages</span>
        </div>
        {(data?.hourlyDistribution || []).length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
            {(data.hourlyDistribution || []).map((h: any) => (
              <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(4, (h.count / maxHour) * 100)}%`,
                      background: h.count > 0 ? `rgba(170,0,255,${0.3 + (h.count / maxHour) * 0.7})` : 'var(--border)',
                      borderRadius: '2px 2px 0 0',
                      minHeight: 4,
                    }}
                    title={`${h.hour}:00 — ${h.count} SMS`}
                  />
                </div>
                {h.hour % 6 === 0 && (
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>{h.hour}h</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No data</div>
        )}
      </div>

      {/* OTP rate */}
      {data && (
        <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(255,193,7,.1)', border: '1px solid rgba(255,193,7,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-key-fill" style={{ color: 'var(--yellow)', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--yellow)' }}>{data.otpRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>OTP Rate</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="progress" style={{ height: 12 }}>
              <div className="progress-fill" style={{ width: `${data.otpRate}%`, background: 'linear-gradient(90deg, var(--yellow), var(--orange))' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              {totals.otps} of {totals.sms} messages contain OTP codes
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
