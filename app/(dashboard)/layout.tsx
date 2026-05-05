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
      .then(r => {
        if (!r.ok) router.replace('/login')
        else setChecking(false)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💀</div>
          <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>DL SMS Client</div>
          <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Loading...</div>
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
