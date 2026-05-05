'use client'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) router.replace('/login'); else setChecking(false) })
      .catch(() => router.replace('/login'))
  }, [router])

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.svg" alt="DL" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }} />
          <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>DL SMS Client</div>
          <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 14 }} />
            Loading…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Sidebar />
      <Topbar />
      <main className="page-container">
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
