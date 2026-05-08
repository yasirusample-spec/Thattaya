'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'

const PAGE_TITLES: Record<string, string> = {
  '/':              'Dashboard',
  '/numbers':       'Phone Numbers',
  '/sms-history':   'SMS History',
  '/otp-monitor':   'OTP Monitor',
  '/verification':  'Verification',
  '/countries':     'Countries',
  '/chat':          'DL Chat',
  '/whatsapp':      'WhatsApp',
  '/telegram-bot':  'Telegram Bot',
  '/bulk-sms':      'Bulk Message',
  '/mobile':        'DLChat PWA',
  '/scheduler':     'Scheduler',
  '/groups':        'Number Groups',
  '/speed-dial':    'Speed Dial',
  '/pin-vault':     'PIN Vault',
  '/blacklist':     'Blacklist',
  '/webhooks':      'Webhooks',
  '/analytics':     'Analytics',
  '/notifications': 'Notifications',
  '/activity':      'Activity Log',
  '/export':        'Export Data',
  '/api-keys':      'API & Docs',
  '/status':        'System Status',
  '/settings':      'Settings',
}

export default function Topbar() {
  const pathname = usePathname()
  const router   = useRouter()

  // Core state
  const [user,        setUser]        = useState<any>(null)
  const [ivasOk,      setIvasOk]      = useState<boolean|null>(null)
  const [smsCount,    setSmsCount]    = useState(0)
  const [unreadN,     setUnreadN]     = useState(0)
  const [autoSync,    setAutoSync]    = useState(false)
  const [lastSync,    setLastSync]    = useState<string|null>(null)
  const [syncing,     setSyncing]     = useState(false)
  const [syncMsg,     setSyncMsg]     = useState('')

  // Heartbeat / always-connected
  const [connected,   setConnected]   = useState(true)
  const [newMsgs,     setNewMsgs]     = useState(0)
  const [lastHbTs,    setLastHbTs]    = useState<string>(new Date().toISOString())
  const [hbOk,        setHbOk]        = useState(true)
  const [hbLatency,   setHbLatency]   = useState<number|null>(null)
  const hbFailCount   = useRef(0)
  const hbTimer       = useRef<ReturnType<typeof setInterval>|null>(null)
  const sinceRef      = useRef<string>(new Date(Date.now()-5000).toISOString())

  // Search
  const [search,      setSearch]      = useState('')
  const [results,     setResults]     = useState<any[]>([])
  const [showSearch,  setShowSearch]  = useState(false)
  const searchRef     = useRef<HTMLDivElement>(null)

  // Auto-sync timer
  const autoSyncTimer = useRef<ReturnType<typeof setInterval>|null>(null)

  // ── Initial load ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [meR, smsR, notR] = await Promise.all([
        fetch('/api/auth/me').then(r=>r.json()),
        fetch('/api/ivasms/sms?limit=1').then(r=>r.json()),
        fetch('/api/notifications').then(r=>r.json()),
      ])
      if (meR.user) {
        setUser(meR.user)
        setIvasOk(!!meR.user.ivasms_email)
        setAutoSync(meR.user.auto_sync||false)
        setLastSync(meR.user.last_sync||null)
      }
      if (typeof smsR.total==='number') setSmsCount(smsR.total)
      setUnreadN((notR.notifications||[]).filter((n:any)=>!n.read).length)
    } catch {}
  }, [])

  useEffect(() => {
    loadData()
    const t = setInterval(loadData, 60000)
    return () => clearInterval(t)
  }, [loadData])

  // ── 1-second heartbeat (always-connected engine) ──────────────────────────
  const runHeartbeat = useCallback(async () => {
    if (!document.visibilityState || document.visibilityState === 'hidden') return
    const t0 = Date.now()
    try {
      const r = await fetch(`/api/heartbeat?since=${encodeURIComponent(sinceRef.current)}`, {
        signal: AbortSignal.timeout(5000),
      })
      const latency = Date.now() - t0
      setHbLatency(latency)
      if (r.ok) {
        const d = await r.json()
        hbFailCount.current = 0
        setHbOk(true)
        setConnected(true)
        setLastHbTs(d.ts || new Date().toISOString())
        setIvasOk(d.ivasOk ?? null)
        setUnreadN(d.unreadNotif || 0)
        if (typeof d.sms === 'number') setSmsCount(d.sms)
        if (typeof d.autoSync === 'boolean') setAutoSync(d.autoSync)
        if (d.lastSync) setLastSync(d.lastSync)
        if (d.newCount > 0) {
          setNewMsgs(c => c + d.newCount)
          sinceRef.current = d.ts || new Date().toISOString()
          // Clear new message count after 8s
          setTimeout(() => setNewMsgs(0), 8000)
        }
      } else {
        hbFailCount.current++
        if (hbFailCount.current >= 3) setHbOk(false)
      }
    } catch {
      hbFailCount.current++
      if (hbFailCount.current >= 3) { setHbOk(false); setConnected(false) }
    }
  }, [])

  useEffect(() => {
    // Start heartbeat — 3s interval (not 1s to avoid KV rate limits on Cloudflare)
    hbTimer.current = setInterval(runHeartbeat, 3000)
    runHeartbeat() // immediate
    // Visibility change: pause when hidden, resume when visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        sinceRef.current = new Date(Date.now() - 5000).toISOString()
        runHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (hbTimer.current) clearInterval(hbTimer.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [runHeartbeat])

  // ── Auto-sync engine ──────────────────────────────────────────────────────
  useEffect(() => {
    if (autoSyncTimer.current) { clearInterval(autoSyncTimer.current); autoSyncTimer.current = null }
    if (autoSync && user?.ivasms_email && user?.auto_sync_interval) {
      const interval = Math.max(60, user.auto_sync_interval || 300) * 1000
      autoSyncTimer.current = setInterval(async () => {
        try {
          const r = await fetch('/api/ivasms/auto-sync', { method: 'POST' })
          const d = await r.json()
          if (d.success) {
            setSmsCount(c => c + (d.smsAdded || 0))
            setLastSync(new Date().toISOString())
          }
        } catch {}
      }, interval)
    }
    return () => { if (autoSyncTimer.current) clearInterval(autoSyncTimer.current) }
  }, [autoSync, user?.auto_sync_interval, user?.ivasms_email])

  // ── Close search on outside click ─────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false); setSearch(''); setResults([])
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Live search ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
        if (r.ok) { const d = await r.json(); setResults(d.results?.slice(0,8)||[]) }
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // ── Manual sync ───────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`✓ ${d.smsAdded??0} new`)
        setSmsCount(c => c + (d.smsAdded||0))
        setLastSync(new Date().toISOString())
      } else {
        setSyncMsg('✗ ' + (d.error||'Failed').slice(0,30))
      }
    } catch { setSyncMsg('✗ Error') }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 5000)
  }

  const fmtRelTime = (ts: string) => {
    try {
      const diff = Date.now() - new Date(ts).getTime()
      if (diff < 60000) return 'just now'
      if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
      return `${Math.floor(diff/3600000)}h ago`
    } catch { return '' }
  }

  const title = Object.entries(PAGE_TITLES).find(([k]) => k !== '/' && pathname.startsWith(k))?.[1]
             || PAGE_TITLES[pathname]
             || 'DL SMS'

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0,
      left: 'var(--sidebar-w)', height: 'var(--topbar-h)',
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      zIndex: 900, gap: 10, transition: 'left .22s cubic-bezier(.4,0,.2,1)',
    }}>

      {/* Page title + badges */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h2>
        {autoSync && user?.ivasms_email && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--green)', background: 'rgba(0,230,118,.1)', border: '1px solid rgba(0,230,118,.2)', borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 9 }} />AUTO
          </span>
        )}
        {newMsgs > 0 && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: 'var(--accent)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', animation: 'fadeIn .3s ease', display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="bi bi-chat-dots-fill" style={{ fontSize: 9 }} />+{newMsgs} new
          </span>
        )}
      </div>

      {/* Search */}
      <div ref={searchRef} style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg)', border: `1.5px solid ${showSearch ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 9, padding: '5px 10px', width: showSearch ? 240 : 170,
          transition: 'width .25s, border-color .15s',
        }}>
          <i className="bi bi-search" style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSearch(true) }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search SMS, numbers…"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, width: '100%' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setResults([]); setShowSearch(false) }}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <i className="bi bi-x-circle-fill" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>
        {showSearch && results.length > 0 && (
          <div style={{
            position: 'absolute', top: '110%', right: 0, width: 340,
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,.35)', zIndex: 1000, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>
              {results.length} results for "{search}"
            </div>
            {results.map((r: any, i: number) => (
              <button key={i}
                onClick={() => { router.push(r.type==='number'?'/numbers':'/sms-history'); setShowSearch(false); setSearch(''); setResults([]) }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: r.type==='sms'?'rgba(229,9,20,.15)':'rgba(59,130,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi bi-${r.type==='sms'?'chat-dots-fill':'phone-fill'}`} style={{ fontSize: 12, color: r.type==='sms'?'var(--accent)':'#3b82f6' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.type==='sms' ? (r.body||'').slice(0,50) : r.phone}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                    {r.type==='sms' ? `${r.sender} · ${r.service}` : `${r.country_name||r.country} · ${r.status}`}
                    {r.otp && <span style={{ marginLeft: 6, color: 'var(--green)', fontWeight: 700 }}>OTP: {r.otp}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sync button */}
      {user?.ivasms_email && (
        <button onClick={handleSync} disabled={syncing} title={lastSync ? `Last sync: ${fmtRelTime(lastSync)}` : 'Sync iVASMS now'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: syncing?'rgba(229,9,20,.08)':syncMsg?(syncMsg.startsWith('✓')?'rgba(0,230,118,.08)':'rgba(229,9,20,.08)'):'var(--bg)',
            border: `1px solid ${syncMsg?(syncMsg.startsWith('✓')?'rgba(0,230,118,.3)':'rgba(229,9,20,.3)'):'var(--border)'}`,
            color: syncMsg?(syncMsg.startsWith('✓')?'var(--green)':'var(--accent)'):'var(--text2)',
            cursor: syncing?'default':'pointer', padding: '6px 11px',
            borderRadius: 8, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', transition: 'all .15s',
          }}>
          <i className={`bi bi-arrow-repeat${syncing?' spin':''}`} style={{ fontSize: 13 }} />
          {syncMsg||(syncing?'Syncing…':'Sync')}
          {smsCount>0&&!syncMsg&&!syncing&&(
            <span style={{ fontSize: 9, background: 'var(--accent)', color: '#fff', padding: '1px 5px', borderRadius: 5, fontWeight: 800 }}>
              {smsCount>9999?`${(smsCount/1000).toFixed(1)}k`:smsCount}
            </span>
          )}
        </button>
      )}

      {/* Always-connected heartbeat indicator */}
      <div title={`Heartbeat${hbLatency!==null?` · ${hbLatency}ms`:''} · ${hbOk?'OK':'Failed'}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', flexShrink: 0,
          background: hbOk?'rgba(0,230,118,.06)':'rgba(229,9,20,.08)',
          border: `1px solid ${hbOk?'rgba(0,230,118,.2)':'rgba(229,9,20,.3)'}`,
          borderRadius: 7, fontSize: 11, fontWeight: 700,
          color: hbOk?'var(--green)':'var(--accent)', whiteSpace: 'nowrap',
          transition: 'all .3s',
        }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: hbOk?'var(--green)':'var(--accent)',
          boxShadow: hbOk?'0 0 6px var(--green)':'0 0 6px var(--accent)',
          animation: hbOk?'livePulse 2s ease-in-out infinite':'none',
        }} />
        {hbOk?'Live':'Offline'}
        {hbLatency!==null&&hbOk&&(
          <span style={{ fontSize: 9, opacity: .7, fontWeight: 600 }}>{hbLatency}ms</span>
        )}
      </div>

      {/* iVASMS status */}
      {ivasOk !== null && (
        <div title={ivasOk?'iVASMS Connected':'iVASMS Disconnected'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            fontSize: 11, fontWeight: 700,
            color: ivasOk?'var(--green)':'var(--text3)',
            background: ivasOk?'rgba(0,230,118,.06)':'rgba(255,255,255,.03)',
            border: `1px solid ${ivasOk?'rgba(0,230,118,.18)':'var(--border)'}`,
            borderRadius: 7, padding: '5px 10px', whiteSpace: 'nowrap',
          }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ivasOk?'var(--green)':'var(--text3)', boxShadow: ivasOk?'0 0 6px var(--green)':'none' }} />
          iVASMS
        </div>
      )}

      {/* Notifications */}
      <Link href="/notifications"
        style={{ position: 'relative', display: 'flex', padding: 7, borderRadius: 8, background: 'var(--bg)', border: `1px solid ${unreadN>0?'rgba(229,9,20,.3)':'var(--border)'}`, color: unreadN>0?'var(--accent)':'var(--text3)', textDecoration: 'none', flexShrink: 0 }}
        title={`Notifications${unreadN>0?` (${unreadN} unread)`:''}`}>
        <i className={`bi bi-bell${unreadN>0?'-fill':''}`} style={{ fontSize: 14 }} />
        {unreadN>0&&(
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7, background: 'var(--accent)', fontSize: 8, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid var(--bg2)' }}>
            {unreadN>99?'99+':unreadN}
          </span>
        )}
      </Link>

      {/* Settings */}
      <Link href="/settings"
        style={{ display: 'flex', padding: 7, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text3)', textDecoration: 'none', flexShrink: 0 }}
        title="Settings">
        <i className="bi bi-gear-fill" style={{ fontSize: 14 }} />
      </Link>

      {/* User avatar */}
      {user && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px 4px 4px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => router.push('/settings')}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,var(--accent),#8b0000)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>
            {user.name?.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)||'AD'}
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>{user.name?.split(' ')[0]||'Admin'}</span>
        </div>
      )}
    </header>
  )
}
