'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface NavItem { href: string; icon: string; label: string; beta?: boolean }
interface NavSection { label: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { href: '/', icon: '📊', label: 'Dashboard' },
      { href: '/numbers', icon: '📱', label: 'Numbers' },
      { href: '/sms-history', icon: '📨', label: 'SMS History' },
      { href: '/verification', icon: '✅', label: 'Verification' },
    ],
  },
  {
    label: 'BETA',
    items: [
      { href: '/whatsapp', icon: '💬', label: 'WhatsApp', beta: true },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/status', icon: '🟢', label: 'Status' },
      { href: '/telegram-bot', icon: '✈️', label: 'Telegram Bot' },
      { href: '/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [ivasConnected, setIvasConnected] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user)
        setIvasConnected(!!d.user.ivasms_email)
      }
    }).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user?.name ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,2) : 'AD'

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            boxShadow: '0 0 12px rgba(229,9,20,.4)',
          }}>💀</div>
          <div>
            <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>DL SMS</div>
            <div style={{ color: 'var(--text3)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>SMSTEAM DEATH LEGION</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span className={`dot ${ivasConnected ? 'dot-green' : 'dot-red'}`} style={{ animation: ivasConnected ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 11, color: ivasConnected ? 'var(--green)' : 'var(--accent)', fontWeight: 500 }}>
            {ivasConnected ? 'iVAS Connected' : 'iVAS Disconnected'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {navSections.map(section => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            <div style={{
              padding: '6px 16px 4px',
              color: 'var(--text3)', fontSize: 10,
              fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
            }}>{section.label}</div>
            {section.items.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'nav-active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15 }}>{item.icon}</span>
                    <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                  </span>
                  {item.beta && (
                    <span className="badge badge-red" style={{ fontSize: 9, padding: '1px 6px' }}>BETA</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #7b0000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Admin'}
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || 'admin@dlsms.com'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '8px', background: 'rgba(229,9,20,.1)',
            border: '1px solid rgba(229,9,20,.3)', borderRadius: 8,
            color: 'var(--accent)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,9,20,.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(229,9,20,.1)')}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  )
}
