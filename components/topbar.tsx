'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const PAGE_TITLES: Record<string, string> = {
  '/':              'Dashboard',
  '/numbers':       'Phone Numbers',
  '/sms-history':   'SMS History',
  '/otp-monitor':   'OTP Monitor',
  '/verification':  'Verification',
  '/chat':          'DL Chat',
  '/whatsapp':      'WhatsApp',
  '/telegram-bot':  'Telegram Bot',
  '/bulk-sms':      'Bulk Message',
  '/mobile':        'DLChat PWA',
  '/analytics':     'Analytics',
  '/notifications': 'Notifications',
  '/export':        'Export Data',
  '/api-keys':      'API & Docs',
  '/status':        'System Status',
  '/settings':      'Settings',
}

export default function Topbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [ivasOk,   setIvasOk]   = useState<boolean | null>(null)
  const [smsCount, setSmsCount] = useState(0)
  const [user,     setUser]     = useState<any>(null)
  const [syncing,  setSyncing]  = useState(false)
  const [syncMsg,  setSyncMsg]  = useState<string>('')
  const [unreadN,  setUnreadN]  = useState(0)
  const [search,   setSearch]   = useState('')
  const [results,  setResults]  = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user) })
      .catch(() => {})

    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        const iv = d.components?.find((c: any) => c.name === 'iVASMS Connection')
        if (iv) setIvasOk(iv.ok)
      })
      .catch(() => {})

    fetch('/api/ivasms/sms?limit=1')
      .then(r => r.json())
      .then(d => { if (typeof d.total === 'number') setSmsCount(d.total) })
      .catch(() => {})

    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { setUnreadN((d.notifications || []).filter((n: any) => !n.read).length) })
      .catch(() => {})
  }, [])

  // Global search
  useEffect(() => {
    if (!search.trim() || search.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
        if (r.ok) { const d = await r.json(); setResults(d.results || []) }
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false); setSearch(''); setResults([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`✓ Synced ${d.count} numbers · ${d.smsAdded ?? 0} new SMS`)
        setIvasOk(true)
        const s = await fetch('/api/ivasms/sms?limit=1')
        const sd = await s.json()
        if (typeof sd.total === 'number') setSmsCount(sd.total)
      } else {
        setSyncMsg('✗ ' + (d.error?.slice(0, 60) || 'Sync failed'))
        setIvasOk(false)
      }
    } catch { setSyncMsg('✗ Network error') }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 6000)
  }

  const title = PAGE_TITLES[pathname] || 'DL SMS Client'
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0, height: 'var(--topbar-h)',
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, zIndex: 900,
    }}>
      {/* Page title */}
      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', marginRight: 8 }}>
        {title}
      </div>

      {/* Global search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <div className="input-group" style={{ margin: 0 }}>
          <i className="bi bi-search input-icon" style={{ zIndex: 2 }} />
          <input
            type="text"
            placeholder="Search SMS, numbers, OTPs…"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
            style={{ padding: '7px 10px 7px 34px', fontSize: 12, height: 36 }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setResults([]) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}>
              <i className="bi bi-x" style={{ fontSize: 15 }} />
            </button>
          )}
        </div>
        {showSearch && search.length >= 2 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 10,
            boxShadow: 'var(--shadow)', zIndex: 999, maxHeight: 320, overflowY: 'auto',
          }}>
            {results.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
                <i className="bi bi-search" style={{ marginRight: 8, opacity: .4 }} />No results
              </div>
            ) : results.map((r: any, i: number) => (
              <div
                key={r.id || i}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  setShowSearch(false); setSearch(''); setResults([])
                  if (r.type === 'number') router.push('/numbers')
                  else router.push('/sms-history')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`bi ${r.type === 'number' ? 'bi-phone-fill' : r.otp ? 'bi-key-fill' : 'bi-chat-dots-fill'}`} style={{ fontSize: 12, color: r.type === 'number' ? 'var(--green)' : r.otp ? 'var(--yellow)' : 'var(--blue)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.type === 'number' ? r.phone : `${r.sender} → ${r.phone_number}`}
                    </div>
                    {r.body && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.body}</div>}
                    {r.otp && <span style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700, fontFamily: 'monospace' }}>OTP: {r.otp}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sync message */}
      {syncMsg && (
        <div style={{
          fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap',
          background: syncMsg.startsWith('✓') ? 'rgba(0,230,118,.12)' : 'rgba(229,9,20,.12)',
          color: syncMsg.startsWith('✓') ? 'var(--green)' : 'var(--accent)',
          border: `1px solid ${syncMsg.startsWith('✓') ? 'rgba(0,230,118,.25)' : 'rgba(229,9,20,.25)'}`,
        }}>{syncMsg}</div>
      )}

      {/* SMS count */}
      {smsCount > 0 && (
        <Link href="/sms-history" style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(41,121,255,.1)', border: '1px solid rgba(41,121,255,.2)',
            borderRadius: 20, padding: '4px 10px', cursor: 'pointer', transition: 'all .2s',
          }}>
            <i className="bi bi-chat-dots-fill" style={{ color: 'var(--blue)', fontSize: 12 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>
              {smsCount > 9999 ? `${(smsCount / 1000).toFixed(1)}k` : smsCount}
            </span>
          </div>
        </Link>
      )}

      {/* iVASMS status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: ivasOk === null ? 'var(--text3)' : ivasOk ? 'var(--green)' : 'var(--accent)',
          animation: ivasOk === true ? 'livePulse 2s ease-in-out infinite' : 'none',
        }} />
        <span style={{ color: ivasOk === null ? 'var(--text3)' : ivasOk ? 'var(--green)' : 'var(--accent)' }}>
          {ivasOk === null ? 'Checking…' : ivasOk ? 'iVASMS OK' : 'iVASMS Down'}
        </span>
      </div>

      {/* Sync button */}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn-primary btn-sm"
        style={{ gap: 6, fontSize: 12, padding: '7px 14px' }}
        title="Sync iVASMS now"
      >
        <i className="bi bi-arrow-repeat" style={{ fontSize: 13, animation: syncing ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
        {syncing ? 'Syncing…' : 'Sync'}
      </button>

      {/* Notifications bell */}
      <Link href="/notifications" style={{ position: 'relative', display: 'flex', textDecoration: 'none' }}>
        <button className="btn-icon" title="Notifications">
          <i className="bi bi-bell-fill" style={{ fontSize: 15, color: unreadN > 0 ? 'var(--yellow)' : 'var(--text3)' }} />
        </button>
        {unreadN > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: 'var(--accent)', color: '#fff', fontSize: 8, fontWeight: 700,
            padding: '1px 4px', borderRadius: 8, border: '2px solid var(--bg2)',
            minWidth: 14, textAlign: 'center', lineHeight: 1.4,
          }}>{unreadN > 9 ? '9+' : unreadN}</span>
        )}
      </Link>

      {/* User avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), #c40812)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'default',
        }} title={user?.email}>
          {initials}
        </div>
        {user?.name && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </span>
        )}
      </div>
    </header>
  )
}
