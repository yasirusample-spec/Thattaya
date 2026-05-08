'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV = [
  { section: 'MAIN', items: [
    { href: '/',              icon: 'bi-speedometer2',          label: 'Dashboard'        },
    { href: '/numbers',       icon: 'bi-phone-fill',            label: 'Numbers'          },
    { href: '/sms-history',   icon: 'bi-chat-dots-fill',        label: 'SMS History'      },
    { href: '/otp-monitor',   icon: 'bi-key-fill',              label: 'OTP Monitor',  hot: true },
    { href: '/verification',  icon: 'bi-shield-check',          label: 'Verification'     },
    { href: '/countries',     icon: 'bi-globe2',                label: 'Countries'        },
  ]},
  { section: 'SERVICES', items: [
    { href: '/whatsapp',      icon: 'bi-whatsapp',              label: 'WhatsApp'         },
    { href: '/telegram-bot',  icon: 'bi-telegram',              label: 'Telegram Bot'     },
    { href: '/bulk-sms',      icon: 'bi-send-fill',             label: 'Bulk Message'     },
    { href: '/chat',          icon: 'bi-chat-square-dots-fill', label: 'DL Chat',      hot: true },
    { href: '/mobile',        icon: 'bi-android2',              label: 'DLChat PWA'       },
  ]},
  { section: 'TOOLS', items: [
    { href: '/scheduler',     icon: 'bi-clock-fill',            label: 'Scheduler',    new: true },
    { href: '/groups',        icon: 'bi-collection-fill',       label: 'Number Groups',new: true },
    { href: '/speed-dial',    icon: 'bi-lightning-charge-fill', label: 'Speed Dial',   new: true },
    { href: '/pin-vault',     icon: 'bi-safe-fill',             label: 'PIN Vault',    new: true },
    { href: '/blacklist',     icon: 'bi-slash-circle-fill',     label: 'Blacklist',    new: true },
    { href: '/webhooks',      icon: 'bi-globe-americas',        label: 'Webhooks',     new: true },
  ]},
  { section: 'ANALYTICS', items: [
    { href: '/analytics',     icon: 'bi-bar-chart-fill',        label: 'Analytics'        },
    { href: '/notifications', icon: 'bi-bell-fill',             label: 'Notifications', badge: 'notif' },
    { href: '/activity',      icon: 'bi-activity',              label: 'Activity Log'     },
    { href: '/export',        icon: 'bi-download',              label: 'Export Data'      },
    { href: '/api-keys',      icon: 'bi-code-slash',            label: 'API & Docs'       },
  ]},
  { section: 'SYSTEM', items: [
    { href: '/status',        icon: 'bi-heart-pulse-fill',      label: 'Status'           },
    { href: '/settings',      icon: 'bi-gear-fill',             label: 'Settings'         },
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
  const [syncing,   setSyncing]   = useState(false)
  const [syncMsg,   setSyncMsg]   = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [meR, smsR, notR] = await Promise.all([
          fetch('/api/auth/me').then(r => r.json()),
          fetch('/api/ivasms/sms?limit=1').then(r => r.json()),
          fetch('/api/notifications').then(r => r.json()),
        ])
        if (meR.user) { setUser(meR.user); setIvasOk(!!meR.user.ivasms_email) }
        if (typeof smsR.total === 'number') setSmsCount(smsR.total)
        const notifs = notR.notifications || []
        setUnreadN(notifs.filter((n: any) => !n.read).length)
      } catch {}
    }
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await fetch('/api/ivasms/sync', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setSyncMsg(`✓ ${d.smsAdded ?? 0} new`)
        setSmsCount(c => c + (d.smsAdded || 0))
      } else {
        setSyncMsg('✗ Error')
      }
    } catch { setSyncMsg('✗ Failed') }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  const W = collapsed ? 60 : 232

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: W, background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000, transition: 'width .22s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '14px 12px' : '14px 16px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8, borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #e50914, #8b0000)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="bi bi-shield-fill-check" style={{ fontSize: 15, color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', letterSpacing: -.3, lineHeight: 1.2 }}>DL SMS</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, marginTop: 1 }}>Death Legion</div>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/" style={{ textDecoration: 'none', display: 'flex' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #e50914, #8b0000)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="bi bi-shield-fill-check" style={{ fontSize: 15, color: '#fff' }} />
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`bi ${collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-reverse'}`} style={{ fontSize: 13 }} />
        </button>
      </div>

      {/* iVASMS status + quick sync */}
      {!collapsed && (
        <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            background: ivasOk ? 'rgba(0,230,118,.07)' : 'rgba(255,255,255,.02)',
            border: `1px solid ${ivasOk ? 'rgba(0,230,118,.2)' : 'var(--border)'}`,
            borderRadius: 8, fontSize: 10.5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: ivasOk ? 'var(--green)' : 'var(--text3)',
              boxShadow: ivasOk ? '0 0 6px var(--green)' : 'none',
            }} />
            <span style={{ color: ivasOk ? 'var(--green)' : 'var(--text3)', fontWeight: 700, flex: 1 }}>
              {ivasOk ? 'iVASMS Connected' : 'Not Connected'}
            </span>
            {ivasOk && (
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  background: 'none', border: 'none', color: syncMsg ? (syncMsg.startsWith('✓') ? 'var(--green)' : 'var(--accent)') : 'var(--text3)',
                  cursor: syncing ? 'default' : 'pointer', padding: '1px 4px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 2,
                }}
                title="Quick sync"
              >
                {syncMsg || (
                  <><i className={`bi bi-arrow-repeat${syncing ? ' spin' : ''}`} style={{ fontSize: 11 }} /></>
                )}
              </button>
            )}
            {smsCount > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 6, flexShrink: 0 }}>
                {smsCount > 9999 ? `${(smsCount / 1000).toFixed(1)}k` : smsCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '6px 8px' : '6px 10px' }}>
        {NAV.map(section => (
          <div key={section.section} style={{ marginBottom: 2 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: 1.4, textTransform: 'uppercase', padding: '8px 4px 3px' }}>
                {section.section}
              </div>
            )}
            {collapsed && <div style={{ height: 4 }} />}
            {section.items.map((item: any) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const isNotif = item.badge === 'notif'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'nav-active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '9px' : '8px 10px',
                    position: 'relative',
                    marginBottom: 1,
                  }}
                >
                  <i className={`bi ${item.icon}`} style={{ fontSize: 15, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, fontSize: 12.5 }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {item.hot && (
                          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: .3 }}>HOT</span>
                        )}
                        {item.new && (
                          <span style={{ background: 'var(--green)', color: '#000', fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: .3 }}>NEW</span>
                        )}
                        {isNotif && unreadN > 0 && (
                          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 8, minWidth: 16, textAlign: 'center' }}>
                            {unreadN > 99 ? '99+' : unreadN}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {collapsed && isNotif && unreadN > 0 && (
                    <span style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 6px var(--accent)',
                    }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '10px 8px' : '10px 12px', flexShrink: 0 }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #8b0000)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0, letterSpacing: .5,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Loading…'}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <Link href="/settings" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex', textDecoration: 'none' }} title="Settings">
                <i className="bi bi-gear" style={{ fontSize: 13 }} />
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex' }}
              >
                <i className="bi bi-box-arrow-right" style={{ fontSize: 13 }} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #8b0000)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 900, color: '#fff',
            }}>
              {initials}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
            >
              <i className="bi bi-box-arrow-right" style={{ fontSize: 13 }} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
