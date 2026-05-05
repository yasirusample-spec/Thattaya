'use client'
import { useState, useEffect, useCallback } from 'react'

function UptimeBar({ pct }: { pct: number }) {
  const bars = 30
  return (
    <div className="uptime-bar">
      {Array.from({ length: bars }).map((_, i) => {
        const ok = i < Math.floor((pct / 100) * bars)
        return (
          <div key={i} className="uptime-bar-item" style={{
            height: 8 + (ok ? Math.random() * 12 : 0),
            background: ok ? 'var(--green)' : 'var(--border2)',
            opacity: ok ? 0.7 + Math.random() * 0.3 : 1,
          }} />
        )
      })}
    </div>
  )
}

export default function StatusPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/status')
      if (r.ok) {
        const d = await r.json()
        setData(d)
        setLastUpdate(new Date())
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 15000)
    return () => clearInterval(t)
  }, [fetchStatus])

  const overallOk = data?.overall === 'operational'
  const allOk = data?.components?.every((c: any) => c.ok)

  const icons: Record<string, string> = {
    'API Service': 'bi-cloud-fill',
    'iVASMS Connection': 'bi-phone-fill',
    'SMS Receiving': 'bi-chat-dots-fill',
    'WhatsApp Service': 'bi-whatsapp',
    'Telegram Bot': 'bi-telegram',
    'Database': 'bi-database-fill',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>System Status</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            Real-time health of all services · Auto-refresh 15s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-badge"><span className="live-dot" />Live</span>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchStatus} className="btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 13 }} />Refresh
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      <div style={{
        padding: '20px 24px', borderRadius: 'var(--radius)',
        background: allOk ? 'rgba(0,230,118,.06)' : 'rgba(229,9,20,.06)',
        border: `2px solid ${allOk ? 'rgba(0,230,118,.3)' : 'rgba(229,9,20,.3)'}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: allOk ? 'var(--green-dim)' : 'rgba(229,9,20,.12)',
          border: `2px solid ${allOk ? 'rgba(0,230,118,.3)' : 'rgba(229,9,20,.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className={`bi ${allOk ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}
            style={{ fontSize: 24, color: allOk ? 'var(--green)' : 'var(--accent)' }} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: allOk ? 'var(--green)' : 'var(--accent)' }}>
            {allOk ? 'All Systems Operational' : 'Some Systems Degraded'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {data?.components?.filter((c: any) => c.ok).length ?? 0} of {data?.components?.length ?? 0} services online
            {data?.updatedAt && ` · Last checked ${new Date(data.updatedAt).toLocaleTimeString()}`}
          </div>
        </div>
      </div>

      {/* Component cards */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 32, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Checking services…</p>
        </div>
      ) : (
        <div className="three-col">
          {(data?.components || []).map((c: any) => (
            <div key={c.name} className="card card-hover" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: c.ok ? 'rgba(0,230,118,.1)' : 'rgba(229,9,20,.1)',
                  border: `1px solid ${c.ok ? 'rgba(0,230,118,.25)' : 'rgba(229,9,20,.25)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`bi ${icons[c.name] || 'bi-cpu-fill'}`}
                    style={{ fontSize: 18, color: c.ok ? 'var(--green)' : 'var(--accent)' }} />
                </div>
                <span className={`badge ${c.ok ? 'badge-green' : 'badge-red'}`}>
                  {c.ok ? <><i className="bi bi-check2" />Operational</> : <><i className="bi bi-exclamation-triangle-fill" />Degraded</>}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>{c.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg2)', borderRadius: 7, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Latency</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.latency < 100 ? 'var(--green)' : c.latency < 500 ? 'var(--orange)' : 'var(--accent)' }}>
                    {c.latency > 0 ? `${c.latency}ms` : '—'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 7, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Uptime</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
                    {c.uptime?.toFixed(2)}%
                  </div>
                </div>
              </div>
              <UptimeBar pct={c.uptime || 0} />
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>Last 30 checks</div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="card alert-info" style={{ display: 'flex', gap: 12 }}>
        <i className="bi bi-info-circle-fill" style={{ color: 'var(--blue)', fontSize: 18, flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>Note:</strong> For production deployment, bind a <strong>Cloudflare KV namespace</strong> named
          <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4, margin: '0 3px', fontSize: 12 }}>DLSMS_KV</code>
          to persist data across requests. Without KV, data resets on each new edge invocation.
          Add iVASMS credentials in <strong>Settings</strong> to enable real number sync and live SMS polling.
        </div>
      </div>
    </div>
  )
}
