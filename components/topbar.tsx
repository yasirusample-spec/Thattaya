'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/numbers': 'Numbers',
  '/sms-history': 'SMS History',
  '/verification': 'Verification',
  '/whatsapp': 'WhatsApp',
  '/status': 'System Status',
  '/telegram-bot': 'Telegram Bot',
  '/settings': 'Settings',
}

export default function Topbar() {
  const pathname = usePathname()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [ivasOk, setIvasOk] = useState<boolean | null>(null)

  useEffect(() => {
    // Check iVASMS status
    fetch('/api/status').then(r => r.json()).then(d => {
      const comp = d.components?.find((c: any) => c.name === 'iVASMS Connection')
      setIvasOk(comp?.ok ?? false)
    }).catch(() => setIvasOk(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`✓ Synced ${d.count} numbers`)
        setIvasOk(true)
      } else {
        setSyncMsg(`✗ ${d.error || 'Sync failed'}`)
        setIvasOk(false)
      }
    } catch {
      setSyncMsg('✗ Network error')
      setIvasOk(false)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  const title = pageTitles[pathname] || 'DL SMS'

  return (
    <header style={{
      position: 'fixed', top: 0, left: 260, right: 0, height: 56,
      background: 'var(--card)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 99,
    }}>
      {/* Left: Page title */}
      <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</h1>

      {/* Right: Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {syncMsg && (
          <span style={{
            fontSize: 12, color: syncMsg.startsWith('✓') ? 'var(--green)' : 'var(--accent)',
            padding: '3px 10px', background: 'var(--bg2)', borderRadius: 6,
          }}>{syncMsg}</span>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)',
            color: 'var(--accent)', padding: '6px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}
        >
          <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
          Sync iVASMS
        </button>

        {/* iVAS status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className={`dot ${ivasOk === true ? 'dot-green' : ivasOk === false ? 'dot-red' : 'dot-yellow'}`} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>iVAS</span>
        </div>

        {/* Notifications */}
        <button style={{
          background: 'transparent', border: 'none', color: 'var(--text2)',
          fontSize: 18, padding: '4px 8px', cursor: 'pointer', borderRadius: 6,
          transition: 'color .2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
        >🔔</button>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #7b0000)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
        }}>
          AD
        </div>
      </div>
    </header>
  )
}
