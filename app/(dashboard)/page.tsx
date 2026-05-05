'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface StatCard { icon: string; title: string; value: string | number; desc: string; color?: string }

function StatCard({ icon, title, value, desc, color = 'var(--accent)' }: StatCard) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 24, fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{desc}</div>
    </div>
  )
}

function ServiceBadge({ service }: { service: string }) {
  const map: Record<string, string> = {
    Google: 'badge-blue', WhatsApp: 'badge-green', Telegram: 'badge-blue',
    Facebook: 'badge-blue', Instagram: 'badge-orange', Twitter: 'badge-blue',
    Amazon: 'badge-orange', Microsoft: 'badge-blue', Unknown: 'badge-gray',
  }
  return <span className={`badge ${map[service] || 'badge-gray'}`}>{service}</span>
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ numbers: 0, smsToday: 0, otpsToday: 0, whatsapp: 0 })
  const [recentSMS, setRecentSMS] = useState<any[]>([])
  const [activeNumbers, setActiveNumbers] = useState<any[]>([])
  const [statusChecks, setStatusChecks] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [numbersRes, smsRes, statusRes, meRes] = await Promise.all([
        fetch('/api/ivasms/numbers'),
        fetch('/api/ivasms/sms?limit=10'),
        fetch('/api/status'),
        fetch('/api/auth/me'),
      ])

      if (numbersRes.ok) {
        const { numbers } = await numbersRes.json()
        setActiveNumbers((numbers || []).slice(0, 5))
        setStats(prev => ({ ...prev, numbers: numbers?.length || 0 }))
      }
      if (smsRes.ok) {
        const { messages, total } = await smsRes.json()
        setRecentSMS(messages || [])
        const otps = (messages || []).filter((m: any) => m.otp).length
        setStats(prev => ({ ...prev, smsToday: total || 0, otpsToday: otps }))
      }
      if (statusRes.ok) {
        const { components } = await statusRes.json()
        setStatusChecks(components || [])
      }
      if (meRes.ok) {
        const { user } = await meRes.json()
        setStats(prev => ({ ...prev, whatsapp: user?.has_whatsapp ? 1 : 0 }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      setSyncMsg(d.success ? `✓ Synced ${d.count} numbers` : `✗ ${d.error}`)
      if (d.success) fetchData()
    } catch { setSyncMsg('✗ Network error') }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 4000) }
  }

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t }
  }

  const statusDot = (ok: boolean) => (
    <span className={`dot ${ok ? 'dot-green' : 'dot-red'}`} style={{ display: 'inline-block' }} />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>💀 Dashboard</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Team Death Legion — SMS Monitoring Platform</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {syncMsg && <span style={{ fontSize: 12, color: syncMsg.startsWith('✓') ? 'var(--green)' : 'var(--accent)', padding: '4px 10px', background: 'var(--bg2)', borderRadius: 6 }}>{syncMsg}</span>}
          <button onClick={handleSync} disabled={syncing} className="btn-primary" style={{ fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
            Sync iVASMS
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <StatCard icon="📱" title="Total Numbers" value={stats.numbers} desc="Numbers synced from iVASMS" />
        <StatCard icon="📨" title="SMS Total" value={stats.smsToday} desc="Messages in database" color="var(--blue)" />
        <StatCard icon="🔑" title="OTPs Extracted" value={stats.otpsToday} desc="Verification codes found" color="#ff9800" />
        <StatCard icon="💬" title="WhatsApp" value={stats.whatsapp > 0 ? '● Active' : '○ None'} desc="WhatsApp accounts active" color={stats.whatsapp > 0 ? 'var(--green)' : 'var(--text3)'} />
      </div>

      {/* Two columns */}
      <div className="two-col">
        {/* Recent SMS */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>📨 Recent SMS</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot dot-green" style={{ animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--green)' }}>Live</span>
              <Link href="/sms-history" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
            </div>
          </div>
          {recentSMS.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 13 }}>No SMS yet. Sync iVASMS to load messages.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentSMS.map((sms: any) => (
                <div key={sms.id} style={{
                  padding: '10px 12px', borderRadius: 8, background: 'var(--bg2)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start',
                  gap: 12, transition: 'border-color .2s', cursor: 'default',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(229,9,20,.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{sms.phone_number || sms.sender}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{formatTime(sms.received_at)}</span>
                      <ServiceBadge service={sms.service || 'Unknown'} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sms.body}
                    </p>
                  </div>
                  {sms.otp && (
                    <span style={{
                      background: 'rgba(229,9,20,.15)', border: '1px solid rgba(229,9,20,.4)',
                      color: 'var(--accent)', fontWeight: 800, fontSize: 14,
                      padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace',
                      whiteSpace: 'nowrap', letterSpacing: 2,
                    }}>{sms.otp}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Numbers */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>📱 Active Numbers</h3>
            <Link href="/numbers" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {activeNumbers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📵</div>
              <p style={{ fontSize: 13 }}>No numbers yet. Sync from iVASMS.</p>
              <button onClick={handleSync} className="btn-primary" style={{ marginTop: 12, padding: '8px 16px', fontSize: 12 }}>
                ⟳ Sync Now
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>SMS</th>
                </tr>
              </thead>
              <tbody>
                {activeNumbers.map((n: any) => (
                  <tr key={n.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.flag} {n.phone}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{n.country}</td>
                    <td><span className={`badge ${n.status === 'active' ? 'badge-green' : 'badge-red'}`}>{n.status}</span></td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{n.sms_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '⟳ Sync iVASMS', action: handleSync, color: 'var(--accent)' },
            { label: '💬 Create WhatsApp', href: '/whatsapp', color: '#25d366' },
            { label: '🤖 Setup Telegram Bot', href: '/telegram-bot', color: '#229ed9' },
            { label: '✅ Start Verification', href: '/verification', color: '#ff9800' },
            { label: '📊 View Status', href: '/status', color: 'var(--green)' },
          ].map(item => (
            item.href ? (
              <Link key={item.label} href={item.href} style={{
                padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: `${item.color}15`, border: `1px solid ${item.color}44`,
                color: item.color, textDecoration: 'none', transition: 'all .2s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {item.label}
              </Link>
            ) : (
              <button key={item.label} onClick={item.action} style={{
                padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: `${item.color}15`, border: `1px solid ${item.color}44`,
                color: item.color, cursor: 'pointer', transition: 'all .2s',
              }}>
                {item.label}
              </button>
            )
          ))}
        </div>
      </div>

      {/* System Status mini */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>🟢 System Status</h3>
        <div className="three-col">
          {statusChecks.slice(0, 6).map((c: any) => (
            <div key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              {statusDot(c.ok)}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: c.ok ? 'var(--green)' : 'var(--accent)' }}>
                  {c.ok ? 'Operational' : 'Degraded'} {c.latency > 0 ? `· ${c.latency}ms` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
