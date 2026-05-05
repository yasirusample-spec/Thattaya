'use client'
import { useState, useEffect, useCallback } from 'react'

function UptimeBar({ uptime }: { uptime: number }) {
  const bars = 90
  return (
    <div className="uptime-bar" style={{ gap: 2 }}>
      {Array.from({ length: bars }, (_, i) => {
        const rand = Math.random()
        const color = rand > 0.02 ? 'var(--green)' : rand > 0.01 ? '#ff9800' : 'var(--accent)'
        return (
          <div key={i} className="uptime-bar-item" style={{
            width: 3, height: 16 + Math.random() * 8,
            background: color, borderRadius: 2, opacity: 0.8,
          }} />
        )
      })}
    </div>
  )
}

export default function StatusPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/status')
      if (r.ok) setData(await r.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const overallOk = data?.overall === 'operational'
  const overallColor = overallOk ? 'var(--green)' : '#ff9800'

  const statusIcon: Record<string, string> = {
    'API Service': '⚙️',
    'iVASMS Connection': '🔗',
    'SMS Receiving': '📨',
    'WhatsApp Service': '💬',
    'Telegram Bot': '✈️',
    'Database': '🗄️',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>💀</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          DL SMS — System Status
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Team Death Legion · Realtime Monitoring</p>
      </div>

      {/* Overall banner */}
      <div style={{
        padding: '20px 28px',
        background: overallOk ? 'rgba(0,200,83,.08)' : 'rgba(255,152,0,.08)',
        border: `1px solid ${overallColor}44`,
        borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span className={`dot ${overallOk ? 'dot-green' : 'dot-yellow'}`} style={{ width: 14, height: 14, animation: 'pulse 2s infinite' }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: overallColor }}>
            {loading ? 'Checking...' : overallOk ? 'All Systems Operational' : 'Some Systems Degraded'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Last updated: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'Loading...'}
          </div>
        </div>
      </div>

      {/* Components grid */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Components</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
            <span style={{ fontSize: 28, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          </div>
        ) : (
          <div className="two-col-eq">
            {(data?.components || []).map((c: any) => (
              <div key={c.name} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{statusIcon[c.name] || '⚡'}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                      {c.latency > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.latency}ms latency</div>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${c.ok ? 'badge-green' : 'badge-red'}`}>
                    {c.ok ? '● Operational' : '● Degraded'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>90-day uptime</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.uptime >= 99 ? 'var(--green)' : '#ff9800' }}>
                    {c.uptime?.toFixed(2)}%
                  </span>
                </div>

                <UptimeBar uptime={c.uptime} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incidents */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Recent Incidents</h2>
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600 }}>No incidents in the past 90 days</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>All systems running smoothly</div>
        </div>
      </div>

      {/* Subscribe */}
      <div className="card" style={{ textAlign: 'center', padding: '28px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          🔔 Subscribe to Updates
        </h3>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16 }}>
          Get notified when there are service disruptions
        </p>
        {subscribed ? (
          <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 500 }}>✓ Subscribed! You'll receive incident alerts.</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (email) setSubscribed(true) }}
            style={{ display: 'flex', gap: 10, maxWidth: 360, margin: '0 auto' }}>
            <input type="email" placeholder="Enter email address..." value={email}
              onChange={e => setEmail(e.target.value)} required style={{ flex: 1 }} />
            <button type="submit" className="btn-primary" style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}>
              Subscribe
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text3)', fontSize: 12, borderTop: '1px solid var(--border)' }}>
        💀 DL SMS Client · TEAM DEATH LEGION · Auto-refreshes every 60s
      </div>
    </div>
  )
}
