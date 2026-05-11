'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const FAKE_OTPS = [
  { service: 'Google', icon: '🔵', code: '847291', time: '2s ago' },
  { service: 'WhatsApp', icon: '🟢', code: '391827', time: '15s ago' },
  { service: 'Telegram', icon: '🔷', code: '583920', time: '1m ago' },
  { service: 'Facebook', icon: '🔵', code: '274819', time: '2m ago' },
  { service: 'Amazon', icon: '🟠', code: '639201', time: '3m ago' },
]

const FEATURES = [
  { icon: '⚡', color: '#e50914', title: 'Instant OTP Detection', desc: 'Auto-extracts codes within milliseconds' },
  { icon: '🌍', color: '#2196f3', title: '100+ Country Numbers', desc: 'US, UK, DE, FR, RU, IN and more' },
  { icon: '🔒', color: '#00c853', title: 'Cloudflare Bypass', desc: 'Real stealth browser technology' },
  { icon: '💬', color: '#ff9800', title: 'WhatsApp Linking BETA', desc: 'Connect WhatsApp autonomously via OTP' },
  { icon: '🤖', color: '#9c27b0', title: 'Telegram Bot Alerts', desc: 'Get notified on every message' },
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: false })
  const particlesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if already logged in
    fetch('/api/auth/me').then(r => { if (r.ok) router.replace('/') }).catch(() => {})
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const d = await r.json()
      if (r.ok) {
        setMsg({ type: 'success', text: '✓ Welcome back! Redirecting...' })
        setTimeout(() => router.replace('/'), 800)
      } else {
        setMsg({ type: 'error', text: d.error || 'Login failed' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Animated particles */}
      <div ref={particlesRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            background: i % 3 === 0 ? 'var(--accent)' : i % 3 === 1 ? 'var(--blue)' : 'var(--text3)',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.6 + 0.1,
            animation: `particleFloat ${Math.random() * 15 + 10}s linear ${Math.random() * -20}s infinite`,
          }} />
        ))}
      </div>

      {/* Left Hero Panel */}
      <div style={{
        width: 520, flexShrink: 0,
        background: 'rgba(20,0,10,0.95)',
        borderRight: '1px solid rgba(229,9,20,.3)',
        padding: '40px 44px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 1,
        backdropFilter: 'blur(20px)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--accent)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            boxShadow: '0 0 20px rgba(229,9,20,.5)',
          }}>💀</div>
          <div>
            <div style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 20, letterSpacing: 1 }}>DL SMS</div>
            <div style={{ color: 'var(--text3)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' }}>TEAM DEATH LEGION</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.15, marginBottom: 12, color: 'var(--text)' }}>
            Real SMS.<br />
            <span style={{ background: 'linear-gradient(90deg, #e50914, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Real Power.
            </span>
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
            The most advanced SMS & OTP monitoring platform.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
          {[['100+', 'Countries'], ['∞', 'Numbers'], ['0ms', 'Delay'], ['24/7', 'Uptime']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 18 }}>{v}</div>
              <div style={{ color: 'var(--text3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* SMS Preview Cards */}
        <div style={{ position: 'relative', height: 160, marginBottom: 32, perspective: 600 }}>
          {FAKE_OTPS.slice(0, 3).map((sms, i) => (
            <div key={i} style={{
              position: 'absolute', left: i * 8, top: i * 8,
              right: i * -8, zIndex: 3 - i,
              background: i === 0 ? 'var(--card)' : `rgba(20,20,30,${0.9 - i * 0.2})`,
              border: `1px solid ${i === 0 ? 'rgba(229,9,20,.4)' : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 16px',
              animation: i === 0 ? 'float 4s ease-in-out infinite' : 'none',
              boxShadow: i === 0 ? '0 8px 32px rgba(0,0,0,.5)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{sms.icon} {sms.service}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{sms.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Your verification code:</span>
                <span style={{
                  background: 'rgba(229,9,20,.15)', border: '1px solid rgba(229,9,20,.4)',
                  color: 'var(--accent)', fontWeight: 900, fontSize: 20, padding: '2px 10px',
                  borderRadius: 6, fontFamily: 'monospace', letterSpacing: 3,
                }}>{sms.code}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{
                fontSize: 16, width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: `${f.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${f.color}44`,
              }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>💀 Powered by TEAM DEATH LEGION</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dot dot-green" style={{ animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--green)' }}>System Online</span>
          </div>
        </div>
      </div>

      {/* Right Auth Panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(20,20,30,0.8)',
          border: '1px solid var(--border)',
          borderRadius: 16, padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,.6)',
        }}>
          {/* Alert */}
          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13,
              background: msg.type === 'error' ? 'rgba(229,9,20,.1)' : 'rgba(0,200,83,.1)',
              border: `1px solid ${msg.type === 'error' ? 'rgba(229,9,20,.3)' : 'rgba(0,200,83,.3)'}`,
              color: msg.type === 'error' ? 'var(--accent)' : 'var(--green)',
            }}>{msg.text}</div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💀</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Welcome Back</h2>
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Sign in to your Death Legion account</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5, letterSpacing: 1, textTransform: 'uppercase' }}>Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  placeholder="Enter your email"
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                  required
                  autoComplete="username"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5, letterSpacing: 1, textTransform: 'uppercase' }}>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  placeholder="Enter your password"
                  onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={e => setLoginForm(p => ({ ...p, remember: e.target.checked }))}
                    style={{ width: 'auto', accentColor: 'var(--accent)' }}
                  />
                  Remember me
                </label>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px', fontSize: 14, marginTop: 4 }}>
                {loading ? '⟳ Signing in...' : '🔐 Sign In'}
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 11, marginTop: 20 }}>
            DL SMS © 2025 · TEAM DEATH LEGION 💀
          </p>
        </div>
      </div>
    </div>
  )
}
