'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, { title: string; icon: string }> = {
  '/':             { title: 'Dashboard',    icon: 'bi-speedometer2'          },
  '/numbers':      { title: 'Numbers',      icon: 'bi-phone-fill'            },
  '/sms-history':  { title: 'SMS History',  icon: 'bi-chat-dots-fill'        },
  '/verification': { title: 'Verification', icon: 'bi-shield-check'          },
  '/whatsapp':     { title: 'WhatsApp',     icon: 'bi-whatsapp'              },
  '/telegram-bot': { title: 'Telegram Bot', icon: 'bi-telegram'              },
  '/chat':         { title: 'DL Chat',      icon: 'bi-chat-square-dots-fill' },
  '/status':       { title: 'System Status',icon: 'bi-activity'              },
  '/settings':     { title: 'Settings',     icon: 'bi-gear-fill'             },
  '/mobile':       { title: 'DLChat PWA',   icon: 'bi-android2'              },
}

export default function Topbar() {
  const pathname = usePathname()
  const [syncing,   setSyncing]   = useState(false)
  const [syncMsg,   setSyncMsg]   = useState('')
  const [syncOk,    setSyncOk]    = useState(true)
  const [ivasOk,    setIvasOk]    = useState<boolean | null>(null)
  const [smsCount,  setSmsCount]  = useState(0)
  const [user,      setUser]      = useState<any>(null)
  const [hasIvasms, setHasIvasms] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user)
        setHasIvasms(!!d.user.ivasms_email)
      }
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
      if (typeof d.total === 'number') setSmsCount(d.total)
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
        setSyncOk(true)
        setIvasOk(true)
        setHasIvasms(true)
        checkStatus()
      } else {
        setSyncMsg(d.error || 'Sync failed — check Settings')
        setSyncOk(false)
        setIvasOk(false)
      }
    } catch {
      setSyncMsg('Network error')
      setSyncOk(false)
      setIvasOk(false)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 5000)
    }
  }

  const page     = PAGE_TITLES[pathname] || { title: 'DL SMS', icon: 'bi-grid-fill' }
  const initials = user?.name ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'AD'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0,
      height: 'var(--topbar-h)',
      background: 'rgba(14,14,23,0.97)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', zIndex: 100,
    }}>

      {/* Left: Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className={`bi ${page.icon}`} style={{ fontSize: 17, color: 'var(--accent)' }} />
        <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{page.title}</h1>
        {smsCount > 0 && (
          <span style={{
            background: 'rgba(229,9,20,.12)', border: '1px solid rgba(229,9,20,.25)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 700,
            padding: '1px 7px', borderRadius: 10, marginLeft: 4,
          }}>
            {smsCount.toLocaleString()} SMS
          </span>
        )}
      </div>

      {/* Right: Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Sync message */}
        {syncMsg && (
          <span style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 6,
            background: syncOk ? 'rgba(0,230,118,.1)' : 'rgba(229,9,20,.1)',
            color: syncOk ? 'var(--green)' : 'var(--accent)',
            border: `1px solid ${syncOk ? 'rgba(0,230,118,.3)' : 'rgba(229,9,20,.3)'}`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className={`bi ${syncOk ? 'bi-check2' : 'bi-exclamation-triangle-fill'}`} />
            {syncMsg}
          </span>
        )}

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: syncing ? 'rgba(229,9,20,.06)' : 'rgba(229,9,20,.1)',
            border: '1px solid rgba(229,9,20,.3)',
            color: 'var(--accent)', padding: '6px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? .6 : 1,
            transition: 'all .2s',
          }}
        >
          <i className="bi bi-arrow-repeat" style={{
            fontSize: 14, display: 'inline-block',
            animation: syncing ? 'spin 1s linear infinite' : 'none',
          }} />
          {syncing ? 'Syncing…' : 'Sync iVASMS'}
        </button>

        {/* iVASMS status indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
        }}>
          <span className={`dot ${
            ivasOk === true  ? 'dot-green dot-pulse' :
            ivasOk === false ? 'dot-red' : 'dot-yellow'
          }`} style={{ width: 7, height: 7 }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: ivasOk === true ? 'var(--green)' : ivasOk === false ? 'var(--accent)' : 'var(--orange)',
            letterSpacing: .3,
          }}>
            {ivasOk === true ? 'iVAS' : ivasOk === false ? 'iVAS' : 'iVAS'}
          </span>
        </div>

        {/* Bell */}
        <button style={{
          background: 'transparent', border: 'none',
          color: 'var(--text2)', fontSize: 17, padding: '4px 7px',
          cursor: 'pointer', borderRadius: 6, transition: 'color .2s',
          display: 'flex', alignItems: 'center',
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
          userSelect: 'none',
        }} title={user?.name || 'Admin'}>
          {initials}
        </div>
      </div>
    </header>
  )
}
