'use client'
import { useState, useEffect } from 'react'

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'bi-facebook', color: '#1877F2', bg: '#E7F0FD', accounts: 3, status: 'connected', msgs: 142, growth: '+12%' },
  { id: 'instagram', name: 'Instagram', icon: 'bi-instagram', color: '#E1306C', bg: '#FDE8F0', accounts: 2, status: 'connected', msgs: 89, growth: '+8%' },
  { id: 'twitter', name: 'Twitter / X', icon: 'bi-twitter-x', color: '#000000', bg: '#F0F0F0', accounts: 1, status: 'connected', msgs: 56, growth: '+3%' },
  { id: 'tiktok', name: 'TikTok', icon: 'bi-tiktok', color: '#010101', bg: '#F0F0F0', accounts: 1, status: 'pending', msgs: 0, growth: '--' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'bi-linkedin', color: '#0A66C2', bg: '#E7F2FB', accounts: 2, status: 'connected', msgs: 34, growth: '+5%' },
  { id: 'snapchat', name: 'Snapchat', icon: 'bi-snapchat', color: '#FFFC00', bg: '#FFFCE0', accounts: 1, status: 'connected', msgs: 21, growth: '+1%' },
  { id: 'youtube', name: 'YouTube', icon: 'bi-youtube', color: '#FF0000', bg: '#FFE8E8', accounts: 1, status: 'connected', msgs: 15, growth: '+2%' },
  { id: 'reddit', name: 'Reddit', icon: 'bi-reddit', color: '#FF4500', bg: '#FFF0EA', accounts: 1, status: 'inactive', msgs: 0, growth: '--' },
  { id: 'discord', name: 'Discord', icon: 'bi-discord', color: '#5865F2', bg: '#EEEEFF', accounts: 4, status: 'connected', msgs: 278, growth: '+22%' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'bi-whatsapp', color: '#25D366', bg: '#E8FBF0', accounts: 5, status: 'connected', msgs: 512, growth: '+31%' },
  { id: 'telegram-bot', name: 'Telegram', icon: 'bi-telegram', color: '#2AABEE', bg: '#E5F5FD', accounts: 2, status: 'connected', msgs: 193, growth: '+18%' },
  { id: 'chat', name: 'DL Chat', icon: 'bi-chat-dots-fill', color: '#6366f1', bg: '#EEEEFF', accounts: 1, status: 'connected', msgs: 87, growth: '+9%' },
]

const RECENT_ACTIVITY = [
  { platform: 'Discord', icon: 'bi-discord', color: '#5865F2', msg: 'New message in #otp-codes from user_7821', time: '2m ago' },
  { platform: 'WhatsApp', icon: 'bi-whatsapp', color: '#25D366', msg: 'OTP received: 847291 from +1 (555) 012-3456', time: '5m ago' },
  { platform: 'Facebook', icon: 'bi-facebook', color: '#1877F2', msg: 'Verification code 293847 from Meta', time: '12m ago' },
  { platform: 'Instagram', icon: 'bi-instagram', color: '#E1306C', msg: 'Login alert: New device detected', time: '18m ago' },
  { platform: 'Telegram', icon: 'bi-telegram', color: '#2AABEE', msg: 'Bot message: Code 559183', time: '24m ago' },
  { platform: 'LinkedIn', icon: 'bi-linkedin', color: '#0A66C2', msg: 'Security code: 772341 from LinkedIn', time: '31m ago' },
  { platform: 'Twitter', icon: 'bi-twitter-x', color: '#000', msg: 'Confirmation code 118847 from X', time: '45m ago' },
  { platform: 'WhatsApp', icon: 'bi-whatsapp', color: '#25D366', msg: 'OTP: 334512 - expires in 10 min', time: '1h ago' },
]

export default function SocialHubPage() {
  const [stats, setStats] = useState({ total: 0, connected: 0, messages: 0, platforms: 0 })
  const [filter, setFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastSync, setLastSync] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const connected = PLATFORMS.filter(p => p.status === 'connected').length
    const msgs = PLATFORMS.reduce((s, p) => s + p.msgs, 0)
    const accounts = PLATFORMS.reduce((s, p) => s + p.accounts, 0)
    setStats({ total: accounts, connected, messages: msgs, platforms: PLATFORMS.length })
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => setLastSync(new Date()), 30000)
    return () => clearInterval(t)
  }, [autoRefresh])

  const syncNow = async () => {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1500))
    setLastSync(new Date())
    setSyncing(false)
  }

  const filtered = filter === 'all' ? PLATFORMS : PLATFORMS.filter(p => p.status === filter)

  return (
    <div style={{ padding: '24px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '10px', width: '40px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-grid-fill" style={{ color: '#fff', fontSize: '1.1rem' }} />
            </span>
            Social Hub
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            All platforms in one place — {stats.connected} active, last sync {lastSync.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button onClick={syncNow} disabled={syncing} className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className={`bi bi-arrow-repeat ${syncing ? 'spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Accounts', value: stats.total, icon: 'bi-person-fill', color: '#6366f1' },
          { label: 'Platforms', value: stats.platforms, icon: 'bi-grid-fill', color: '#10b981' },
          { label: 'Connected', value: stats.connected, icon: 'bi-wifi', color: '#0ea5e9' },
          { label: 'Messages Today', value: stats.messages.toLocaleString(), icon: 'bi-chat-fill', color: '#f59e0b' },
          { label: 'OTPs Captured', value: 284, icon: 'bi-shield-check-fill', color: '#ef4444' },
          { label: 'Campaigns Sent', value: 12, icon: 'bi-megaphone-fill', color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: '0.95rem' }} />
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', 'connected', 'pending', 'inactive'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', transition: 'all .2s',
              borderColor: filter === f ? '#6366f1' : '#e2e8f0',
              background: filter === f ? '#6366f1' : '#fff',
              color: filter === f ? '#fff' : '#64748b' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' ? ` (${PLATFORMS.length})` : ` (${PLATFORMS.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Platform Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px', marginBottom: '28px' }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform .2s,box-shadow .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '42px', height: '42px', borderRadius: '10px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${p.icon}`} style={{ color: p.color, fontSize: '1.3rem' }} />
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.accounts} account{p.accounts !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                background: p.status === 'connected' ? '#dcfce7' : p.status === 'pending' ? '#fef9c3' : '#f1f5f9',
                color: p.status === 'connected' ? '#16a34a' : p.status === 'pending' ? '#854d0e' : '#94a3b8' }}>
                {p.status === 'connected' ? '● Live' : p.status === 'pending' ? '◐ Pending' : '○ Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{p.msgs}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Messages</div>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#f1f5f9' }} />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: p.growth === '--' ? '#94a3b8' : '#10b981' }}>{p.growth}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Growth</div>
              </div>
            </div>
            <a href={`/${p.id}`} style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', background: p.color + '15', color: p.color, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', border: `1px solid ${p.color}30`, transition: 'background .2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = p.color + '25'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = p.color + '15'}>
              Open {p.name} <i className="bi bi-arrow-right" />
            </a>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
            <i className="bi bi-clock-history" style={{ marginRight: '8px', color: '#6366f1' }} />
            Recent Activity
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Live — updates every 30s</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {RECENT_ACTIVITY.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '8px', background: a.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`bi ${a.icon}`} style={{ color: a.color, fontSize: '1rem' }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.msg}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{a.platform}</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
