'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

function StatCard({ icon, label, value, sub, color = 'var(--accent)', live = false }: any) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`, border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`bi ${icon}`} style={{ fontSize: 18, color }} />
        </div>
        {live && <span className="live-badge"><span className="live-dot" />LIVE</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function SvcBadge({ svc }: { svc: string }) {
  const m: Record<string, string> = {
    Google: 'badge-blue', WhatsApp: 'badge-green', Telegram: 'badge-blue',
    Facebook: 'badge-blue', Instagram: 'badge-orange', Twitter: 'badge-gray',
    Amazon: 'badge-orange', Microsoft: 'badge-blue', Apple: 'badge-gray',
    Netflix: 'badge-red', TikTok: 'badge-gray', Unknown: 'badge-gray',
  }
  return <span className={`badge ${m[svc] ?? 'badge-gray'}`}>{svc}</span>
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ numbers: 0, sms: 0, otps: 0, whatsapp: 0, active: 0 })
  const [recentSMS, setRecentSMS] = useState<any[]>([])
  const [activeNums, setActiveNums] = useState<any[]>([])
  const [status, setStatus] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const [numR, smsR, statR, meR] = await Promise.all([
        fetch('/api/ivasms/numbers'),
        fetch('/api/ivasms/sms?limit=15'),
        fetch('/api/status'),
        fetch('/api/auth/me'),
      ])
      if (numR.ok) {
        const { numbers } = await numR.json()
        const nums = numbers || []
        const active = nums.filter((n: any) => n.status === 'active')
        setActiveNums(active.slice(0, 6))
        setStats(p => ({ ...p, numbers: nums.length, active: active.length }))
      }
      if (smsR.ok) {
        const { messages, total } = await smsR.json()
        const msgs = messages || []
        // detect new messages
        setRecentSMS(prev => {
          const prevIds = new Set(prev.map((m: any) => m.id))
          const incoming = msgs.filter((m: any) => !prevIds.has(m.id))
          if (incoming.length > 0) {
            setNewIds(new Set(incoming.map((m: any) => m.id)))
            setTimeout(() => setNewIds(new Set()), 3000)
          }
          return msgs
        })
        const otps = msgs.filter((m: any) => m.otp).length
        setStats(p => ({ ...p, sms: total || 0, otps }))
      }
      if (statR.ok) {
        const { components } = await statR.json()
        setStatus(components || [])
      }
      if (meR.ok) {
        const { user } = await meR.json()
        setStats(p => ({ ...p, whatsapp: user?.has_whatsapp ? 1 : 0 }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 8000)
    return () => clearInterval(t)
  }, [fetchData])

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg({ ok: true, text: `Synced ${d.count} numbers (${d.added ?? 0} new, ${d.smsAdded ?? 0} SMS)` })
        fetchData()
      } else {
        setSyncMsg({ ok: false, text: d.error || 'Sync failed' })
      }
    } catch { setSyncMsg({ ok: false, text: 'Network error' }) }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 6000) }
  }

  const fmt = (t: string) => { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t } }
  const fmtDate = (t: string) => { try { return new Date(t).toLocaleDateString() } catch { return t } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: -.3 }}>Overview</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            Real-time SMS monitoring · Auto-refresh every 8s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {syncMsg && (
            <div className={`alert ${syncMsg.ok ? 'alert-success' : 'alert-error'}`} style={{ padding: '6px 12px', fontSize: 12 }}>
              <i className={`bi ${syncMsg.ok ? 'bi-check2' : 'bi-exclamation-triangle-fill'}`} />
              {syncMsg.text}
            </div>
          )}
          <button onClick={handleSync} disabled={syncing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', fontSize: 13 }}>
            <i className="bi bi-arrow-repeat" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', display: 'inline-block', fontSize: 15 }} />
            {syncing ? 'Syncing…' : 'Sync iVASMS'}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <StatCard icon="bi-phone-fill" label="Total Numbers" value={stats.numbers} sub={`${stats.active} active`} color="var(--accent)" />
        <StatCard icon="bi-chat-dots-fill" label="Total SMS" value={stats.sms.toLocaleString()} sub="Messages received" color="var(--blue)" live />
        <StatCard icon="bi-key-fill" label="OTPs Extracted" value={stats.otps} sub="Verification codes" color="var(--orange)" />
        <StatCard icon="bi-whatsapp" label="WhatsApp" value={stats.whatsapp > 0 ? 'Active' : 'None'} sub={stats.whatsapp > 0 ? 'Account linked' : 'Not configured'} color={stats.whatsapp > 0 ? 'var(--green)' : 'var(--text3)'} />
      </div>

      {/* ── Two columns ── */}
      <div className="two-col">

        {/* Recent SMS (live) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Live SMS Feed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-badge"><span className="live-dot" />8s refresh</span>
              <Link href="/sms-history" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                All <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              </Link>
            </div>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {recentSMS.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
                <i className="bi bi-chat-dots-fill" style={{ fontSize: 36, display: 'block', marginBottom: 12, opacity: .3 }} />
                <p style={{ fontSize: 13 }}>No SMS yet. Sync iVASMS to load messages.</p>
                <button onClick={handleSync} className="btn-primary btn-sm" style={{ marginTop: 12 }}>
                  <i className="bi bi-arrow-repeat" style={{ marginRight: 6 }} />Sync Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '8px' }}>
                {recentSMS.map((sms: any) => (
                  <div key={sms.id} className={`sms-item ${newIds.has(sms.id) ? 'new-sms' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                        {sms.phone_number || sms.sender}
                      </span>
                      <SvcBadge svc={sms.service || 'Unknown'} />
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
                        <i className="bi bi-clock-fill" style={{ marginRight: 3 }} />{fmt(sms.received_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, flex: 1 }}>{sms.body}</p>
                      {sms.otp && (
                        <span style={{
                          background: 'rgba(229,9,20,.12)', border: '1px solid rgba(229,9,20,.35)',
                          color: 'var(--accent)', fontWeight: 900, fontSize: 15,
                          padding: '3px 10px', borderRadius: 7,
                          fontFamily: 'monospace', letterSpacing: 3, whiteSpace: 'nowrap', flexShrink: 0,
                        }}>{sms.otp}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Active Numbers */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-phone-fill" style={{ color: 'var(--green)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Active Numbers</span>
                <span className="badge badge-green">{stats.active}</span>
              </div>
              <Link href="/numbers" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                All <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              </Link>
            </div>
            {activeNums.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                <i className="bi bi-phone-fill" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: .3 }} />
                No numbers yet
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {activeNums.map((n: any) => (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 7,
                    transition: 'background .15s', cursor: 'default',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 18 }}>{n.flag || '🏳️'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)' }}>{n.phone}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{n.country}</div>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                      <i className="bi bi-circle-fill" style={{ fontSize: 7 }} />Active
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      <i className="bi bi-chat-dots-fill" style={{ marginRight: 3, fontSize: 10 }} />{n.sms_count || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Status mini */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-activity" style={{ color: 'var(--green)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>System Health</span>
              </div>
              <Link href="/status" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View <i className="bi bi-chevron-right" style={{ fontSize: 10 }} /></Link>
            </div>
            <div style={{ padding: '10px' }}>
              {status.slice(0, 5).map((c: any) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 7 }}>
                  <span className={`dot ${c.ok ? 'dot-green dot-pulse' : 'dot-red'}`} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: c.ok ? 'var(--green)' : 'var(--accent)' }}>
                    {c.ok ? 'Operational' : 'Down'}
                    {c.latency > 0 && <span style={{ color: 'var(--text3)', marginLeft: 5 }}>{c.latency}ms</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              <i className="bi bi-lightning-fill" style={{ marginRight: 6, color: 'var(--orange)' }} />Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Verification', href: '/verification', icon: 'bi-shield-check', color: 'var(--green)' },
                { label: 'WhatsApp', href: '/whatsapp', icon: 'bi-whatsapp', color: '#25d366' },
                { label: 'Telegram Bot', href: '/telegram-bot', icon: 'bi-telegram', color: '#229ed9' },
                { label: 'DLChat PWA', href: '/mobile', icon: 'bi-android2', color: 'var(--blue)' },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 8px', borderRadius: 8, textDecoration: 'none',
                  background: `${a.color}10`, border: `1px solid ${a.color}25`,
                  transition: 'all .2s',
                }}
                  onMouseEnter={e => { (e.currentTarget as any).style.background = `${a.color}20`; (e.currentTarget as any).style.borderColor = `${a.color}50` }}
                  onMouseLeave={e => { (e.currentTarget as any).style.background = `${a.color}10`; (e.currentTarget as any).style.borderColor = `${a.color}25` }}
                >
                  <i className={`bi ${a.icon}`} style={{ fontSize: 20, color: a.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: a.color }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
