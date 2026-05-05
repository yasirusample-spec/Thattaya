'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, { title: string; icon: string }> = {
  '/': { title: 'Dashboard', icon: 'bi-speedometer2' },
  '/numbers': { title: 'Numbers', icon: 'bi-phone-fill' },
  '/sms-history': { title: 'SMS History', icon: 'bi-chat-dots-fill' },
  '/verification': { title: 'Verification', icon: 'bi-shield-check' },
  '/whatsapp': { title: 'WhatsApp BETA', icon: 'bi-whatsapp' },
  '/telegram-bot': { title: 'Telegram Bot', icon: 'bi-telegram' },
  '/status': { title: 'System Status', icon: 'bi-activity' },
  '/settings': { title: 'Settings', icon: 'bi-gear-fill' },
  '/mobile': { title: 'DLChat PWA', icon: 'bi-android2' },
}

export default function Topbar() {
  const pathname = usePathname()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [ivasOk, setIvasOk] = useState<boolean | null>(null)
  const [smsCount, setSmsCount] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user)
    }).catch(() => {})
    checkStatus()
    const t = setInterval(checkStatus, 30000)
    return () => clearInterval(t)
  }, [])

  const checkStatus = () => {
    fetch('/api/status').then(r => r.json()).then(d => {
      const c = d.components?.find((c: any) => c.name === 'iVASMS Connection')
      setIvasOk(c?.ok ?? false)
    }).catch(() => setIvasOk(false))
    fetch('/api/ivasms/sms?limit=1').then(r => r.json()).then(d => {
      if (d.total !== undefined) setSmsCount(d.total)
    }).catch(() => {})
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`Synced ${d.count} numbers`)
        setIvasOk(true)
        checkStatus()
      } else {
        setSyncMsg(d.error || 'Sync failed')
        setIvasOk(false)
      }
    } catch {
      setSyncMsg('Network error')
      setIvasOk(false)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 5000)
    }
  }

  const page = PAGE_TITLES[pathname] || { title: 'DL SMS', icon: 'bi-grid-fill' }
  const initials = user?.name ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'AD'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0,
      height: 'var(--topbar-h)',
      background: 'rgba(14,14,23,0.95)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className={`bi ${page.icon}`} style={{ fontSize: 18, color: 'var(--accent)' }} />
        <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{page.title}</h1>
        {smsCount > 0 && (
          <span style={{
            background: 'rgba(229,9,20,.12)', border: '1px solid rgba(229,9,20,.25)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 700,
            padding: '1px 7px', borderRadius: 10,
          }}>{smsCount.toLocaleString()} SMS</span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Sync message */}
        {syncMsg && (
          <span style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 6,
            background: syncMsg.includes('error') || syncMsg.includes('failed') || syncMsg.includes('Error')
              ? 'rgba(229,9,20,.1)' : 'rgba(0,230,118,.1)',
            color: syncMsg.includes('error') || syncMsg.includes('failed') || syncMsg.includes('Error')
              ? 'var(--accent)' : 'var(--green)',
            border: `1px solid ${syncMsg.includes('error') || syncMsg.includes('failed') || syncMsg.includes('Error')
              ? 'rgba(229,9,20,.3)' : 'rgba(0,230,118,.3)'}`,
          }}>
            <i className={`bi ${syncMsg.includes('error') || syncMsg.includes('failed') ? 'bi-exclamation-triangle-fill' : 'bi-check2'}`} style={{ marginRight: 4 }} />
            {syncMsg}
          </span>
        )}

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: 'rgba(229,9,20,.08)', border: '1px solid rgba(229,9,20,.25)',
            color: 'var(--accent)', padding: '6px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? .6 : 1,
          }}
        >
          <i className="bi bi-arrow-repeat" style={{
            fontSize: 14,
            display: 'inline-block',
            animation: syncing ? 'spin 1s linear infinite' : 'none',
          }} />
          {syncing ? 'Syncing…' : 'Sync iVASMS'}
        </button>

        {/* iVAS status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
        }}>
          <span className={`dot ${ivasOk === true ? 'dot-green dot-pulse' : ivasOk === false ? 'dot-red' : 'dot-yellow'}`} />
          <span style={{ fontSize: 11, fontWeight: 600, color: ivasOk === true ? 'var(--green)' : ivasOk === false ? 'var(--accent)' : 'var(--orange)' }}>
            iVAS
          </span>
        </div>

        {/* Notification bell */}
        <button style={{
          background: 'transparent', border: 'none',
          color: 'var(--text2)', fontSize: 18, padding: '4px 8px',
          cursor: 'pointer', borderRadius: 6, transition: 'color .2s',
          position: 'relative',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
        >
          <i className="bi bi-bell-fill" />
        </button>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #7b0000)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 12,
          border: '2px solid rgba(229,9,20,.4)',
          cursor: 'pointer', flexShrink: 0,
        }}>{initials}</div>
      </div>
    </header>
  )
}
