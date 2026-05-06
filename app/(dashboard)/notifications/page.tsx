'use client'
import { useState, useEffect, useCallback } from 'react'

const TYPE_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  info:    { icon: 'bi-info-circle-fill',         color: 'var(--blue)',   bg: 'rgba(41,121,255,.08)'  },
  success: { icon: 'bi-check-circle-fill',         color: 'var(--green)',  bg: 'rgba(0,230,118,.08)'   },
  warning: { icon: 'bi-exclamation-triangle-fill', color: 'var(--orange)', bg: 'rgba(255,152,0,.08)'   },
  error:   { icon: 'bi-x-circle-fill',             color: 'var(--accent)', bg: 'rgba(229,9,20,.08)'    },
  otp:     { icon: 'bi-key-fill',                  color: 'var(--yellow)', bg: 'rgba(255,193,7,.08)'   },
  sms:     { icon: 'bi-chat-dots-fill',            color: 'var(--cyan)',   bg: 'rgba(0,188,212,.08)'   },
}

export default function NotificationsPage() {
  const [notifs,   setNotifs]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notifications')
      if (r.ok) {
        const d = await r.json()
        setNotifs(d.notifications || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = async (id?: string) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : { readAll: true }),
    })
    load()
  }

  const clearAll = async () => {
    if (!confirm('Clear all notifications?')) return
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifs([])
  }

  const fmtTime = (ts: string) => {
    try {
      const d    = new Date(ts)
      const diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60)    return `${Math.floor(diff)}s ago`
      if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return d.toLocaleDateString()
    } catch { return ts }
  }

  const unread   = notifs.filter(n => !n.read).length
  const filtered = filter ? notifs.filter(n => n.type === filter) : notifs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="bi bi-bell-fill" style={{ color: 'var(--accent)', fontSize: 20 }} />
            Notifications
            {unread > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, lineHeight: 1.4 }}>
                {unread} new
              </span>
            )}
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>OTP alerts, sync events, and system messages</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {unread > 0 && (
            <button onClick={() => markRead()} className="btn-secondary btn-sm">
              <i className="bi bi-check2-all" style={{ fontSize: 14 }} />Mark all read
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll} className="btn-danger btn-sm">
              <i className="bi bi-trash-fill" style={{ fontSize: 13 }} />Clear all
            </button>
          )}
          <button onClick={load} className="btn-ghost btn-sm">
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['', 'otp', 'sms', 'info', 'success', 'warning', 'error'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={filter === t ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            style={{ fontSize: 12 }}
          >
            {t ? <i className={`bi ${TYPE_STYLES[t]?.icon}`} style={{ fontSize: 12, color: filter === t ? '#fff' : TYPE_STYLES[t]?.color }} /> : <i className="bi bi-list" style={{ fontSize: 13 }} />}
            {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}
            {t === '' && notifs.length > 0 && (
              <span style={{ background: 'var(--border)', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{notifs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 28, color: 'var(--accent)', display: 'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text3)' }}>Loading notifications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <i className="bi bi-bell-slash" style={{ fontSize: 44, opacity: .2, display: 'block', marginBottom: 16, color: 'var(--text3)' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No notifications</p>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {filter ? `No ${filter} notifications found.` : 'Notifications will appear here after syncing iVASMS.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((n: any) => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES.info
            return (
              <div
                key={n.id}
                className="card card-sm"
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  background: n.read ? 'var(--card)' : style.bg,
                  borderColor: n.read ? 'var(--border)' : style.color + '33',
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
                onClick={() => !n.read && markRead(n.id)}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: style.bg, border: `1px solid ${style.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${style.icon}`} style={{ color: style.color, fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: 'var(--text)' }}>{n.title}</span>
                    {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.color, flexShrink: 0 }} />}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      <i className="bi bi-clock-fill" style={{ marginRight: 4, fontSize: 9 }} />
                      {fmtTime(n.ts)}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{n.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info box */}
      <div className="alert alert-info">
        <i className="bi bi-info-circle-fill" />
        <div>
          <strong>Auto-notifications:</strong> OTP codes received via iVASMS sync are automatically logged here and optionally forwarded to Telegram.
          Configure Telegram in <a href="/settings" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Settings</a>.
        </div>
      </div>
    </div>
  )
}
