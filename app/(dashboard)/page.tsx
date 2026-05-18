'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

function CountryFlag({ country }: { country: string }) {
  try {
    const c = (country || 'US').toUpperCase().slice(0, 2)
    return <span style={{ fontSize: 18 }}>{c.split('').map(x => String.fromCodePoint(x.charCodeAt(0) + 127397)).join('')}</span>
  } catch { return <span style={{ fontSize: 11, color: 'var(--text3)' }}>{country}</span> }
}

const SVC_COLORS: Record<string, string> = {
  Google: '#4285f4', WhatsApp: '#25d366', Telegram: '#229ed9', Facebook: '#1877f2',
  Amazon: '#ff9900', Microsoft: '#00a4ef', Apple: '#777', Twitter: '#1da1f2',
  Netflix: '#e50914', TikTok: '#ff0050', Discord: '#5865f2', LinkedIn: '#0a66c2',
  Binance: '#f3ba2f', PayPal: '#003087', Coinbase: '#0052ff', Instagram: '#e1306c',
}

function SvcDot({ svc }: { svc: string }) {
  const c = SVC_COLORS[svc] || 'var(--text3)'
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: c, background: `${c}18`, border: `1px solid ${c}30`, padding: '2px 8px', borderRadius: 5 }}>{svc}</span>
}

export default function DashboardPage() {
  const [stats,     setStats]     = useState({ numbers: 0, active: 0, sms: 0, otps: 0, last24h: 0, countries: 0 })
  const [analytics, setAnalytics] = useState<any>(null)
  const [recentSMS, setRecentSMS] = useState<any[]>([])
  const [activeNums,setActiveNums]= useState<any[]>([])
  const [allNums,   setAllNums]   = useState<any[]>([])
  const [sysStatus, setSysStatus] = useState<any[]>([])
  const [syncing,   setSyncing]   = useState(false)
  const [injecting, setInjecting] = useState(false)
  const [syncMsg,   setSyncMsg]   = useState<{ok:boolean;text:string}|null>(null)
  const [newIds,    setNewIds]    = useState<Set<string>>(new Set())
  const [copiedOtp, setCopiedOtp] = useState<string|null>(null)
  const prevTotal = useRef(0)

  const fetchAll = useCallback(async () => {
    try {
      const [numR, smsR, statR, analR] = await Promise.all([
        fetch('/api/ivasms/numbers'),
        fetch('/api/ivasms/sms?limit=25'),
        fetch('/api/status'),
        fetch('/api/analytics'),
      ])

      if (numR.ok) {
        const d = await numR.json()
        const nums = Array.isArray(d.numbers) ? d.numbers : []
        const active = nums.filter((n: any) => n.status === 'active')
        const ctries = new Set(nums.map((n: any) => n.country).filter(Boolean))
        setAllNums(nums)
        setActiveNums(active.slice(0, 8))
        setStats(p => ({ ...p, numbers: nums.length, active: active.length, countries: ctries.size }))
      }

      if (smsR.ok) {
        const d = await smsR.json()
        const msgs = Array.isArray(d.messages) ? d.messages : []
        if (prevTotal.current > 0 && (d.total || 0) > prevTotal.current) {
          const prev = new Set(recentSMS.map((m: any) => m.id))
          const incoming = msgs.filter((m: any) => !prev.has(m.id))
          if (incoming.length > 0) {
            setNewIds(new Set(incoming.map((m: any) => m.id)))
            setTimeout(() => setNewIds(new Set()), 3000)
          }
        }
        prevTotal.current = d.total || 0
        setRecentSMS(msgs)
        const otps = msgs.filter((m: any) => m.otp).length
        const now  = Date.now()
        const last24 = msgs.filter((m: any) => now - new Date(m.received_at).getTime() < 86400000).length
        setStats(p => ({ ...p, sms: d.total || msgs.length, otps, last24h: last24 }))
      }

      if (statR.ok) {
        const d = await statR.json()
        setSysStatus(d.components || [])
      }

      if (analR.ok) {
        const d = await analR.json()
        setAnalytics(d)
      }
    } catch {}
  }, [recentSMS])

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, 8000)
    return () => clearInterval(t)
  }, [])

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      setSyncMsg(d.success
        ? { ok: true, text: `Synced ${d.count} numbers · ${d.smsAdded ?? 0} SMS` }
        : { ok: false, text: d.error || 'Sync failed' })
      fetchAll()
    } catch { setSyncMsg({ ok: false, text: 'Network error' }) }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 6000)
  }

  const handleInject = async () => {
    setInjecting(true); setSyncMsg(null)
    try {
      const r = await fetch('/api/ivasms/inject', { method: 'POST' })
      const d = await r.json()
      setSyncMsg(d.ok
        ? { ok: true, text: `Loaded ${d.numbers} numbers + ${d.sms} SMS messages` }
        : { ok: false, text: d.error || 'Failed' })
      fetchAll()
    } catch { setSyncMsg({ ok: false, text: 'Network error' }) }
    setInjecting(false)
    setTimeout(() => setSyncMsg(null), 6000)
  }

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopiedOtp(otp)
    setTimeout(() => setCopiedOtp(null), 2000)
  }

  const fmtTime = (t: string) => {
    try {
      const d = new Date(t), diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
      if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return d.toLocaleDateString()
    } catch { return t }
  }

  const topServices = analytics?.topServices || []
  const topCountries = analytics?.topCountries || []
  const smsPerDay = analytics?.smsPerDay || []
  const maxDay = Math.max(...smsPerDay.map((d: any) => d.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-speedometer2" style={{ color: 'var(--accent)' }} />Overview
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            Real-time SMS monitoring ·
            <span className="live-badge" style={{ fontSize: 10 }}>
              <span className="live-dot" />8s refresh
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {syncMsg && (
            <div className={`alert ${syncMsg.ok ? 'alert-success' : 'alert-error'}`} style={{ padding: '6px 12px', fontSize: 12, margin: 0 }}>
              {syncMsg.text}
            </div>
          )}
          {allNums.length === 0 && (
            <button onClick={handleInject} disabled={injecting} className="btn-secondary btn-sm" style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}>
              <i className="bi bi-database-fill-down" style={{ fontSize: 13 }} />
              {injecting ? 'Loading…' : 'Load Numbers'}
            </button>
          )}
          <button onClick={handleSync} disabled={syncing} className="btn-primary btn-sm" style={{ gap: 6 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14, animation: syncing ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
            {syncing ? 'Syncing…' : 'Sync iVASMS'}
          </button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="stats-grid">
        {[
          { icon: 'bi-phone-fill',     label: 'Total Numbers',    value: stats.numbers,             sub: `${stats.active} active`,             color: 'var(--accent)', live: false },
          { icon: 'bi-chat-dots-fill', label: 'Total SMS',        value: stats.sms.toLocaleString(), sub: 'All messages received',             color: 'var(--blue)',   live: true  },
          { icon: 'bi-key-fill',       label: 'OTPs Extracted',   value: stats.otps,                sub: 'Verification codes',                color: 'var(--orange)', live: false },
          { icon: 'bi-globe',          label: 'Countries',        value: stats.countries,            sub: 'Global coverage',                   color: 'var(--green)',  live: false },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi ${s.icon}`} style={{ fontSize: 18, color: s.color }} />
              </div>
              {s.live && <span className="live-badge"><span className="live-dot" />LIVE</span>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main two-col layout ── */}
      <div className="two-col">

        {/* Live SMS Feed */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="bi bi-chat-dots-fill" style={{ color: 'var(--accent)', fontSize: 15 }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Live SMS Feed</span>
              {recentSMS.length > 0 && <span className="badge badge-gray">{stats.sms.toLocaleString()}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-badge"><span className="live-dot" />8s</span>
              <Link href="/sms-history" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                All <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              </Link>
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {recentSMS.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
                <i className="bi bi-chat-dots-fill" style={{ fontSize: 44, display: 'block', marginBottom: 16, opacity: .15 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>No SMS yet</p>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Load numbers or sync iVASMS to see messages.</p>
                <button onClick={handleInject} disabled={injecting} className="btn-primary btn-sm" style={{ gap: 6 }}>
                  <i className="bi bi-database-fill-down" style={{ fontSize: 13 }} />
                  {injecting ? 'Loading…' : 'Load Numbers'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: 8 }}>
                {recentSMS.map((sms: any) => (
                  <div key={sms.id} className={`sms-item ${newIds.has(sms.id) ? 'new-sms' : ''}`}
                    style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                        {sms.phone_number || sms.sender}
                      </span>
                      {sms.service && sms.service !== 'Unknown' && <SvcDot svc={sms.service} />}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <i className="bi bi-clock-fill" style={{ fontSize: 9 }} />{fmtTime(sms.received_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, flex: 1 }}>{sms.body}</p>
                      {sms.otp && (
                        <button onClick={() => copyOtp(sms.otp)}
                          style={{ background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)',
                            color: 'var(--accent)', fontWeight: 900, fontSize: 15,
                            padding: '3px 10px', borderRadius: 7, cursor: 'pointer',
                            fontFamily: 'monospace', letterSpacing: 3, whiteSpace: 'nowrap', flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 5 }}
                          title="Click to copy">
                          <i className="bi bi-key-fill" style={{ fontSize: 10 }} />{sms.otp}
                          <i className={`bi ${copiedOtp === sms.otp ? 'bi-clipboard-check-fill' : 'bi-clipboard'}`} style={{ fontSize: 10, opacity: .7 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Active numbers */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-phone-fill" style={{ color: 'var(--green)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Active Numbers</span>
                <span className="badge badge-green" style={{ fontSize: 10 }}>{stats.active}</span>
              </div>
              <Link href="/numbers" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                All <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              </Link>
            </div>
            {activeNums.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                <i className="bi bi-phone-fill" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: .15 }} />
                No active numbers
                <div style={{ marginTop: 10 }}>
                  <button onClick={handleInject} disabled={injecting} className="btn-primary btn-xs" style={{ gap: 5 }}>
                    <i className="bi bi-database-fill-down" style={{ fontSize: 11 }} />Load Numbers
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '4px 8px' }}>
                {activeNums.map((n: any) => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 7, transition: 'background .15s', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <CountryFlag country={n.country} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.phone}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{n.country_name || n.country}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <i className="bi bi-chat-dots-fill" style={{ fontSize: 9 }} />{n.sms_count || 0}
                    </span>
                    <span className="dot dot-green dot-pulse" style={{ width: 6, height: 6 }} />
                  </div>
                ))}
                {allNums.filter((n: any) => n.status !== 'active').length > 0 && (
                  <div style={{ margin: '4px 8px', padding: '4px 8px', borderRadius: 6, background: 'rgba(74,74,106,.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="dot dot-gray" style={{ width: 5, height: 5 }} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {allNums.filter((n: any) => n.status !== 'active').length} inactive
                    </span>
                    <Link href="/numbers" style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', marginLeft: 'auto' }}>View all</Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Services */}
          {topServices.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
                <i className="bi bi-grid-fill" style={{ color: 'var(--blue)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Top Services</span>
                <Link href="/analytics" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Details <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
                </Link>
              </div>
              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topServices.slice(0, 5).map((s: any) => {
                  const total = topServices.reduce((a: number, b: any) => a + b.count, 0)
                  const pct = total > 0 ? Math.round(s.count / total * 100) : 0
                  const c = SVC_COLORS[s.name] || 'var(--accent)'
                  return (
                    <div key={s.name}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{s.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.count} ({pct}%)</span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: c }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SMS per day mini chart */}
          {smsPerDay.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <i className="bi bi-graph-up" style={{ color: 'var(--accent)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>SMS Last 7 Days</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                {smsPerDay.slice(-7).map((d: any, i: number) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                      <div style={{ width: '100%', height: `${Math.max(4, (d.count/maxDay)*100)}%`,
                        background: d.count > 0 ? 'linear-gradient(180deg,var(--accent),#c40812)' : 'var(--border)',
                        borderRadius: '2px 2px 0 0', minHeight: 4 }}
                        title={`${d.date}: ${d.count}`} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>{(d.date||'').slice(-2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Health */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-activity" style={{ color: 'var(--green)', fontSize: 14 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>System Health</span>
              </div>
              <Link href="/status" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                View <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              </Link>
            </div>
            <div style={{ padding: '6px 8px' }}>
              {sysStatus.slice(0, 5).map((c: any) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 7 }}>
                  <span className={`dot ${c.ok ? 'dot-green dot-pulse' : 'dot-red'}`} style={{ width: 7, height: 7 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: c.ok ? 'var(--green)' : 'var(--accent)' }}>
                    {c.ok ? 'OK' : 'Down'}
                    {c.latency > 0 && <span style={{ color: 'var(--text3)', marginLeft: 4 }}>{c.latency}ms</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-lightning-fill" style={{ color: 'var(--orange)' }} />Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { label: 'Numbers',     href: '/numbers',     icon: 'bi-phone-fill',        color: 'var(--accent)'  },
                { label: 'OTP Monitor', href: '/otp-monitor', icon: 'bi-key-fill',          color: 'var(--orange)'  },
                { label: 'Analytics',   href: '/analytics',   icon: 'bi-bar-chart-fill',    color: 'var(--blue)'    },
                { label: 'WhatsApp',    href: '/whatsapp',    icon: 'bi-whatsapp',          color: '#25d366'        },
                { label: 'Telegram',    href: '/telegram-bot',icon: 'bi-telegram',          color: '#229ed9'        },
                { label: 'DL Chat',     href: '/chat',        icon: 'bi-chat-square-dots-fill', color: 'var(--purple)' },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 8, textDecoration: 'none', background: `${a.color}10`, border: `1px solid ${a.color}20`, transition: 'all .2s' }}
                  onMouseEnter={e => { (e.currentTarget as any).style.background = `${a.color}22`; (e.currentTarget as any).style.borderColor = `${a.color}50` }}
                  onMouseLeave={e => { (e.currentTarget as any).style.background = `${a.color}10`; (e.currentTarget as any).style.borderColor = `${a.color}20` }}>
                  <i className={`bi ${a.icon}`} style={{ fontSize: 18, color: a.color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: a.color, textAlign: 'center' }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Country breakdown row ── */}
      {topCountries.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-globe" style={{ color: 'var(--green)', fontSize: 14 }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Coverage by Country</span>
          </div>
          <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
            {topCountries.slice(0, 10).map((c: any) => (
              <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg2)', borderRadius: 8 }}>
                <CountryFlag country={c.country} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.country}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.numbers} nums · {c.sms} SMS</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
