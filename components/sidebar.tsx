'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV = [
  { section: 'MAIN', items: [
    { href: '/',             icon: 'bi-speedometer2',          label: 'Dashboard'   },
    { href: '/numbers',      icon: 'bi-phone-fill',            label: 'Numbers'     },
    { href: '/sms-history',  icon: 'bi-chat-dots-fill',        label: 'SMS History' },
    { href: '/verification', icon: 'bi-shield-check',          label: 'Verification'},
  ]},
  { section: 'SERVICES', items: [
    { href: '/chat',         icon: 'bi-chat-square-dots-fill', label: 'DL Chat',     hot: true  },
    { href: '/whatsapp',     icon: 'bi-whatsapp',              label: 'WhatsApp',    beta: true },
    { href: '/telegram-bot', icon: 'bi-telegram',              label: 'Telegram Bot'            },
    { href: '/mobile',       icon: 'bi-android2',              label: 'DLChat PWA'              },
  ]},
  { section: 'SYSTEM', items: [
    { href: '/status',   icon: 'bi-activity',  label: 'Status'   },
    { href: '/settings', icon: 'bi-gear-fill', label: 'Settings' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [ivasOk,  setIvasOk]  = useState(false)
  const [smsCount,setSmsCount]= useState(0)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user)
          setIvasOk(!!d.user.ivasms_email)
        }
      })
      .catch(() => {})

    fetch('/api/ivasms/sms?limit=1')
      .then(r => r.json())
      .then(d => { if (typeof d.total === 'number') setSmsCount(d.total) })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 200, overflowY: 'auto',
    }}>

      {/* ── Brand ── */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.svg" alt="DL" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 17, letterSpacing: .5, lineHeight: 1.1 }}>DL SMS</div>
            <div style={{ color: 'var(--text3)', fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 2 }}>TEAM DEATH LEGION</div>
          </div>
          {smsCount > 0 && (
            <span style={{
              background: 'rgba(229,9,20,.15)', color: 'var(--accent)',
              border: '1px solid rgba(229,9,20,.3)',
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
              flexShrink: 0,
            }}>
              {smsCount > 999 ? `${(smsCount/1000).toFixed(1)}k` : smsCount}
            </span>
          )}
        </div>

        {/* iVASMS connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          marginTop: 10, padding: '6px 10px',
          background: ivasOk ? 'rgba(0,230,118,.06)' : 'rgba(229,9,20,.06)',
          border: `1px solid ${ivasOk ? 'rgba(0,230,118,.2)' : 'rgba(229,9,20,.2)'}`,
          borderRadius: 8, cursor: 'default',
        }}>
          <span className={`dot ${ivasOk ? 'dot-green dot-pulse' : 'dot-red'}`} style={{ width: 7, height: 7 }} />
          <span style={{ fontSize: 11, color: ivasOk ? 'var(--green)' : 'var(--accent)', fontWeight: 700, flex: 1 }}>
            {ivasOk ? 'iVASMS Connected' : 'iVASMS Disconnected'}
          </span>
          {ivasOk && (
            <span className="live-badge" style={{ fontSize: 9, padding: '1px 6px' }}>
              <span className="live-dot" />LIVE
            </span>
          )}
        </div>
      </div>

      {/* ── Nav sections ── */}
      <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {NAV.map(({ section, items }) => (
          <div key={section} style={{ marginBottom: 2 }}>
            <div style={{
              padding: '10px 18px 4px',
              fontSize: 9, fontWeight: 700, letterSpacing: 1.8,
              color: 'var(--text3)', textTransform: 'uppercase',
            }}>
              {section}
            </div>
            {items.map((item: any) => {
              const active = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'nav-active' : ''}`}
                  style={{ margin: '1px 8px', borderRadius: 8, borderLeft: 'none', paddingLeft: 12 }}
                >
                  <i className={`bi ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{item.label}</span>
                  {item.hot && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: .3,
                      background: 'rgba(229,9,20,.15)', color: 'var(--accent)',
                      border: '1px solid rgba(229,9,20,.3)',
                      padding: '1px 5px', borderRadius: 4,
                    }}>NEW</span>
                  )}
                  {item.beta && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: .3,
                      background: 'rgba(170,0,255,.15)', color: 'var(--purple)',
                      border: '1px solid rgba(170,0,255,.3)',
                      padding: '1px 5px', borderRadius: 4,
                    }}>BETA</span>
                  )}
                  {active && (
                    <i className="bi bi-chevron-right" style={{ fontSize: 10, opacity: .6 }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── User footer ── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #7b0000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 12,
            border: '2px solid rgba(229,9,20,.3)',
            userSelect: 'none',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Admin'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text3)', cursor: 'pointer', padding: 6,
              borderRadius: 6, transition: 'color .2s', flexShrink: 0,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            <i className="bi bi-box-arrow-right" style={{ fontSize: 17 }} />
          </button>
        </div>
      </div>
    </aside>
  )
}
