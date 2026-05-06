'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV = [
  { section: 'MAIN', items: [
    { href: '/',              icon: 'bi-speedometer2',          label: 'Dashboard'    },
    { href: '/numbers',       icon: 'bi-phone-fill',            label: 'Numbers'      },
    { href: '/sms-history',   icon: 'bi-chat-dots-fill',        label: 'SMS History'  },
    { href: '/otp-monitor',   icon: 'bi-key-fill',              label: 'OTP Monitor', hot: true },
    { href: '/verification',  icon: 'bi-shield-check',          label: 'Verification' },
  ]},
  { section: 'SERVICES', items: [
    { href: '/chat',          icon: 'bi-chat-square-dots-fill', label: 'DL Chat',     hot: true  },
    { href: '/whatsapp',      icon: 'bi-whatsapp',              label: 'WhatsApp'               },
    { href: '/telegram-bot',  icon: 'bi-telegram',              label: 'Telegram Bot'            },
    { href: '/bulk-sms',      icon: 'bi-send-fill',             label: 'Bulk Message'            },
    { href: '/mobile',        icon: 'bi-android2',              label: 'DLChat PWA'              },
  ]},
  { section: 'ANALYTICS', items: [
    { href: '/analytics',     icon: 'bi-bar-chart-fill',        label: 'Analytics',   new: true  },
    { href: '/notifications', icon: 'bi-bell-fill',             label: 'Notifications', new: true },
    { href: '/export',        icon: 'bi-download',              label: 'Export Data'             },
    { href: '/api-keys',      icon: 'bi-code-slash',            label: 'API & Docs'              },
  ]},
  { section: 'SYSTEM', items: [
    { href: '/status',    icon: 'bi-activity',  label: 'Status'   },
    { href: '/settings',  icon: 'bi-gear-fill', label: 'Settings' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user,      setUser]      = useState<any>(null)
  const [ivasOk,    setIvasOk]    = useState(false)
  const [smsCount,  setSmsCount]  = useState(0)
  const [unreadN,   setUnreadN]   = useState(0)
  const [collapsed, setCollapsed] = useState(false)

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

    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        const notifs = d.notifications || []
        setUnreadN(notifs.filter((n: any) => !n.read).length)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  const W = collapsed ? 64 : 230

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: W, background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000, transition: 'width .25s ease',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '18px 14px' : '18px 20px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 10, borderBottom: '1px solid var(--border)' }}>
        {!collapsed && (
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo.svg" alt="DL" width={28} height={28} style={{ borderRadius: 7, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', letterSpacing: -.3 }}>DL SMS</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginTop: 1 }}>Team Death Legion</div>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.svg" alt="DL" width={28} height={28} style={{ borderRadius: 7 }} />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} style={{ fontSize: 13 }} />
        </button>
      </div>

      {/* iVASMS status */}
      {!collapsed && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
            background: ivasOk ? 'var(--green-dim)' : 'rgba(255,255,255,.03)',
            border: `1px solid ${ivasOk ? 'rgba(0,230,118,.2)' : 'var(--border)'}`,
            borderRadius: 8, fontSize: 11,
          }}>
            <span className={`dot ${ivasOk ? 'dot-green dot-pulse' : 'dot-gray'}`} style={{ width: 6, height: 6 }} />
            <span style={{ color: ivasOk ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>
              {ivasOk ? 'iVASMS Connected' : 'iVASMS Disconnected'}
            </span>
            {smsCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8 }}>
                {smsCount > 999 ? `${(smsCount / 1000).toFixed(1)}k` : smsCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '8px 8px' : '8px 12px' }}>
        {NAV.map(section => (
          <div key={section.section} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: 1.2, textTransform: 'uppercase', padding: '8px 6px 4px' }}>
                {section.section}
              </div>
            )}
            {section.items.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const isNotif = item.href === '/notifications'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'nav-active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px' : '9px 12px',
                    position: 'relative',
                  }}
                >
                  <i className={`bi ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {(item as any).hot && (
                          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: .5 }}>HOT</span>
                        )}
                        {(item as any).new && (
                          <span style={{ background: 'var(--green)', color: '#000', fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: .5 }}>NEW</span>
                        )}
                        {isNotif && unreadN > 0 && (
                          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8, minWidth: 16, textAlign: 'center' }}>
                            {unreadN}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {collapsed && isNotif && unreadN > 0 && (
                    <span className="notif-dot" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '12px 8px' : '12px 14px' }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #c40812)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Loading…'}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}
            >
              <i className="bi bi-box-arrow-right" style={{ fontSize: 15 }} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #c40812)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {initials}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
            >
              <i className="bi bi-box-arrow-right" style={{ fontSize: 14 }} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
