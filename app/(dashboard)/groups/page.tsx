'use client'
import { useState, useEffect, useCallback } from 'react'

export default function GroupsPage() {
  const [groups,  setGroups]  = useState<any[]>([])
  const [numbers, setNumbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ name: '', color: '#e50914', description: '', numberIds: [] as string[] })
  const [editing, setEditing] = useState<any>(null)
  const [msg,     setMsg]     = useState<{ok:boolean;text:string}|null>(null)

  const load = useCallback(async () => {
    try {
      const [gr, nr] = await Promise.all([
        fetch('/api/groups').then(r => r.json()),
        fetch('/api/ivasms/numbers').then(r => r.json()),
      ])
      setGroups(gr.groups || [])
      setNumbers(nr.numbers || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name.trim()) { setMsg({ ok: false, text: 'Name required' }); return }
    setMsg(null)
    try {
      const url    = editing ? `/api/groups/${editing.id}` : '/api/groups'
      const method = editing ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (d.ok) { setMsg({ ok: true, text: editing ? 'Group updated!' : 'Group created!' }); setForm({ name:'', color:'#e50914', description:'', numberIds:[] }); setEditing(null); load() }
      else setMsg({ ok: false, text: d.error || 'Failed' })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete group?')) return
    await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    load()
  }

  const toggleNum = (id: string) => {
    setForm(f => ({ ...f, numberIds: f.numberIds.includes(id) ? f.numberIds.filter(x => x !== id) : [...f.numberIds, id] }))
  }

  const startEdit = (g: any) => { setEditing(g); setForm({ name: g.name, color: g.color, description: g.description, numberIds: g.numberIds || [] }); }

  const COLORS = ['#e50914','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}><i className="bi bi-collection-fill" style={{ marginRight: 10, color: 'var(--accent)' }} />Number Groups</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>Organize numbers into labeled groups</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
        {/* Form */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`bi bi-${editing ? 'pencil-fill' : 'plus-circle-fill'}`} style={{ color: 'var(--accent)' }} />
            {editing ? `Edit: ${editing.name}` : 'New Group'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">Group Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. US Numbers" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional description…" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                    style={{ width: 28, height: 28, borderRadius: 7, background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'transform .15s', transform: form.color === c ? 'scale(1.2)' : 'scale(1)' }} />
                ))}
              </div>
            </div>
            <div>
              <label className="label" style={{ marginBottom: 8 }}>Numbers ({form.numberIds.length} selected)</label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--bg)' }}>
                {numbers.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No numbers. Sync first.</div>
                ) : numbers.map(n => (
                  <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--card2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <input type="checkbox" checked={form.numberIds.includes(n.id)} onChange={() => toggleNum(n.id)} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{n.phone}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{n.country}</span>
                    <span className={`badge ${n.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 9 }}>{n.status}</span>
                  </label>
                ))}
              </div>
            </div>
            {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} className="btn-primary" style={{ flex: 1 }}>
                <i className={`bi bi-${editing ? 'check-lg' : 'plus-lg'}`} style={{ marginRight: 6 }} />{editing ? 'Update Group' : 'Create Group'}
              </button>
              {editing && (
                <button onClick={() => { setEditing(null); setForm({ name:'', color:'#e50914', description:'', numberIds:[] }); setMsg(null) }} className="btn-ghost" style={{ padding: '8px 12px' }}>
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Groups list */}
        <div>
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 12 }} />)
          ) : groups.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <i className="bi bi-collection" style={{ fontSize: 48, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
              <p style={{ color: 'var(--text3)', margin: 0 }}>No groups yet. Create one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groups.map(g => {
                const gnums = numbers.filter(n => (g.numberIds || []).includes(n.id))
                const active = gnums.filter(n => n.status === 'active').length
                return (
                  <div key={g.id} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${g.color}20`, border: `2px solid ${g.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-collection-fill" style={{ fontSize: 18, color: g.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{g.name}</div>
                        {g.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{g.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(g)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 9px' }}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button onClick={() => del(g.id)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 9px', color: 'var(--accent)' }}>
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, background: `${g.color}15`, border: `1px solid ${g.color}30`, fontSize: 11, fontWeight: 700, color: g.color }}>
                        <i className="bi bi-phone-fill" style={{ marginRight: 4 }} />{gnums.length} numbers
                      </span>
                      {active > 0 && (
                        <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(0,230,118,.1)', border: '1px solid rgba(0,230,118,.2)', fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                          <i className="bi bi-circle-fill" style={{ marginRight: 4, fontSize: 8 }} />{active} active
                        </span>
                      )}
                      {gnums.slice(0, 4).map(n => (
                        <span key={n.id} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
                          {n.phone}
                        </span>
                      ))}
                      {gnums.length > 4 && <span style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>+{gnums.length - 4} more</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
