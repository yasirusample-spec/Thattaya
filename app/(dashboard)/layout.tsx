'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/sidebar'
import Topbar  from '../../components/topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) throw new Error('unauth'); return r.json() })
      .then(d => { if (!d.user) throw new Error('unauth'); setReady(true) })
      .catch(() => router.replace('/login'))
  }, [router])

  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.svg" alt="DL SMS" width={56} height={56} style={{ borderRadius: 14, marginBottom: 20, animation: 'float 2s ease-in-out infinite' }} />
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `dotPulse 1.2s ease ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 14 }}>Loading DL SMS Client…</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left .25s ease' }}>
        <Topbar />
        <main style={{ flex: 1, padding: '24px', marginTop: 'var(--topbar-h)', background: 'var(--bg)', animation: 'fadeInUp .25s ease' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
