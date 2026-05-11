'use client'
import { useState, useEffect, useCallback } from 'react'

const PLANS = [
  { id:'starter', name:'Starter', price:'$0/mo', msgs:1000,  color:'#3b82f6', icon:'bi-rocket-takeoff-fill' },
  { id:'growth',  name:'Growth',  price:'$45/mo', msgs:10000, color:'#8b5cf6', icon:'bi-graph-up-arrow',    popular:true },
  { id:'scale',   name:'Scale',   price:'$199/mo',msgs:100000,color:'#f59e0b', icon:'bi-lightning-charge-fill' },
  { id:'enterprise',name:'Enterprise',price:'Custom',msgs:0, color:'#ef4444', icon:'bi-building-fill' },
]
const TEMPLATES = [
  { id:'otp',      name:'OTP Verification',  body:'Your OTP is {{1}}. Valid for 10 minutes.',        category:'Authentication' },
  { id:'welcome',  name:'Welcome Message',   body:'Hello {{1}}! Welcome to {{2}}. We\'re glad to have you.', category:'Marketing' },
  { id:'order',    name:'Order Confirmed',   body:'Your order #{{1}} has been confirmed. Track at {{2}}.',   category:'Utility' },
  { id:'remind',   name:'Appointment Reminder', body:'Reminder: You have an appointment on {{1}} at {{2}}.', category:'Utility' },
  { id:'promo',    name:'Promotional Offer', body:'Hi {{1}}! Exclusive offer: {{2}}. Valid till {{3}}.',    category:'Marketing' },
  { id:'delivery', name:'Delivery Update',   body:'Your package #{{1}} is out for delivery. ETA: {{2}}.',   category:'Utility' },
]

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: `${color}20`, color, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
      {children}
    </span>
  )
}

export default function WhatsAppBusinessPage() {
  const [tab,         setTab]         = useState<'overview'|'setup'|'templates'|'campaigns'|'analytics'|'numbers'>('overview')
  const [step,        setStep]        = useState(1)
  const [bizName,     setBizName]     = useState('')
  const [bizPhone,    setBizPhone]    = useState('')
  const [bizEmail,    setBizEmail]    = useState('')
  const [bizWebsite,  setBizWebsite]  = useState('')
  const [bizCategory, setBizCategory] = useState('Technology')
  const [selectedPlan,setSelectedPlan]= useState('starter')
  const [apiKey,      setApiKey]      = useState('')
  const [phoneId,     setPhoneId]     = useState('')
  const [accountId,   setAccountId]   = useState('')
  const [creating,    setCreating]    = useState(false)
  const [created,     setCreated]     = useState(false)
  const [result,      setResult]      = useState<any>(null)
  const [campaigns,   setCampaigns]   = useState<any[]>([])
  const [templates,   setTemplates]   = useState<any[]>(TEMPLATES)
  const [selTemplate, setSelTemplate] = useState('')
  const [campaignName,setCampaignName]= useState('')
  const [campaignMsg, setCampaignMsg] = useState('')
  const [targets,     setTargets]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [analytics,   setAnalytics]   = useState<any>(null)
  const [numbers,     setNumbers]     = useState<any[]>([])
  const [loading,     setLoading]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [waR, nr] = await Promise.all([
        fetch('/api/whatsapp-business/status').then(r=>r.ok?r.json():{}) as Promise<any>,
        fetch('/api/ivasms/numbers').then(r=>r.json()),
      ])
      if (waR.created) {
        setCreated(true)
        setApiKey(waR.apiKey || '')
        setPhoneId(waR.phoneId || '')
        setAccountId(waR.accountId || '')
        setCampaigns(waR.campaigns || [])
        setAnalytics(waR.analytics || null)
      }
      setNumbers((nr.numbers||[]))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const createBusiness = async () => {
    if (!bizName || !bizPhone) { setResult({error:'Business name and phone are required'}); return }
    setCreating(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp-business/create', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name:bizName, phone:bizPhone, email:bizEmail, website:bizWebsite, category:bizCategory, plan:selectedPlan }),
      })
      const d = await r.json()
      if (d.ok) {
        setCreated(true)
        setApiKey(d.apiKey)
        setPhoneId(d.phoneId)
        setAccountId(d.accountId)
        setResult({success:`WhatsApp Business API created! Phone ID: ${d.phoneId}`})
        load()
      } else {
        setResult({error:d.error||'Creation failed'})
      }
    } catch(e:any) { setResult({error:e.message}) }
    setCreating(false)
  }

  const sendCampaign = async () => {
    if (!campaignMsg.trim() || !targets.trim()) return
    const tgts = targets.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean)
    if (tgts.length===0) return
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp-business/campaign', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name:campaignName||'Campaign', message:campaignMsg, targets:tgts, templateId:selTemplate }),
      })
      const d = await r.json()
      if (d.ok) {
        setResult({success:`Campaign sent to ${d.sent} recipients!`})
        setCampaignMsg(''); setTargets(''); setCampaignName('')
        load()
      } else { setResult({error:d.error||'Send failed'}) }
    } catch(e:any) { setResult({error:e.message}) }
    setSending(false)
  }

  const fmtTime = (ts:string) => { try { return new Date(ts).toLocaleString() } catch { return ts } }

  const TABS = [
    {id:'overview',   label:'Overview',   icon:'bi-grid-fill'},
    {id:'setup',      label:created?'Account':'Setup',icon:created?'bi-check-circle-fill':'bi-gear-fill'},
    {id:'templates',  label:'Templates',  icon:'bi-file-text-fill'},
    {id:'campaigns',  label:'Campaigns',  icon:'bi-megaphone-fill'},
    {id:'analytics',  label:'Analytics',  icon:'bi-bar-chart-fill'},
    {id:'numbers',    label:'Numbers',    icon:'bi-telephone-fill'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:900,color:'var(--text)',display:'flex',alignItems:'center',gap:10,margin:0}}>
            <div style={{width:36,height:36,borderRadius:9,background:'linear-gradient(135deg,#25d366,#128c7e)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="bi bi-whatsapp" style={{fontSize:18,color:'#fff'}} />
            </div>
            WhatsApp Business API
          </h2>
          <p style={{color:'var(--text3)',fontSize:13,marginTop:4,margin:'4px 0 0'}}>
            Autonomous WhatsApp Business API creation, campaigns, templates & analytics
          </p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {created ? (
            <span style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(37,211,102,.1)',border:'1px solid rgba(37,211,102,.3)',borderRadius:20,fontSize:12,fontWeight:700,color:'#25d366'}}>
              <i className="bi bi-check-circle-fill" style={{fontSize:12}} />Business API Active
            </span>
          ) : (
            <span style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(255,152,0,.1)',border:'1px solid rgba(255,152,0,.3)',borderRadius:20,fontSize:12,fontWeight:700,color:'var(--orange)'}}>
              <i className="bi bi-exclamation-triangle-fill" style={{fontSize:12}} />Not Configured
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-item ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>
            <i className={`bi ${t.icon}`} style={{marginRight:5,fontSize:11}} />{t.label}
          </button>
        ))}
      </div>

      {/* Result alert */}
      {result && (
        <div className={`alert ${result.error?'alert-error':'alert-success'}`}>
          <i className={`bi ${result.error?'bi-exclamation-triangle-fill':'bi-check-circle-fill'}`} />
          {result.error||result.success}
          <button onClick={()=>setResult(null)} style={{marginLeft:'auto',background:'none',border:'none',color:'inherit',cursor:'pointer'}}><i className="bi bi-x" /></button>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Stats */}
          <div className="stats-grid">
            {[
              {label:'Messages Sent',   val:analytics?.sent||0,       icon:'bi-send-fill',          color:'#25d366'},
              {label:'Delivered',       val:analytics?.delivered||0,  icon:'bi-check2-all',         color:'#3b82f6'},
              {label:'Read',            val:analytics?.read||0,       icon:'bi-eye-fill',           color:'#8b5cf6'},
              {label:'Campaigns',       val:campaigns.length,          icon:'bi-megaphone-fill',     color:'#f59e0b'},
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`${s.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className={`bi ${s.icon}`} style={{fontSize:17,color:s.color}} />
                  </div>
                  <span style={{fontSize:22,fontWeight:900,color:'var(--text)'}}>{s.val.toLocaleString()}</span>
                </div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text3)'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Plans */}
          <div className="card">
            <h3 style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <i className="bi bi-card-list" style={{color:'#25d366'}} />Pricing Plans
            </h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
              {PLANS.map(p=>(
                <div key={p.id} style={{
                  padding:'16px',border:`2px solid ${selectedPlan===p.id?p.color:'var(--border)'}`,
                  borderRadius:12,background:selectedPlan===p.id?`${p.color}08`:'var(--bg)',
                  cursor:'pointer',transition:'all .2s',position:'relative',
                }} onClick={()=>setSelectedPlan(p.id)}>
                  {p.popular && <span style={{position:'absolute',top:-9,right:12,background:p.color,color:'#fff',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:10}}>POPULAR</span>}
                  <i className={`bi ${p.icon}`} style={{fontSize:22,color:p.color,display:'block',marginBottom:8}} />
                  <div style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>{p.name}</div>
                  <div style={{fontSize:18,fontWeight:900,color:p.color,margin:'4px 0'}}>{p.price}</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>{p.msgs>0?`${p.msgs.toLocaleString()} msgs/mo`:'Unlimited'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="card">
            <h3 style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <i className="bi bi-lightning-charge-fill" style={{color:'#f59e0b'}} />Features
            </h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10}}>
              {[
                {icon:'bi-send-fill',label:'Bulk Messaging',desc:'Send to 100k+ contacts',color:'#25d366'},
                {icon:'bi-file-text-fill',label:'Message Templates',desc:'Pre-approved HSM templates',color:'#3b82f6'},
                {icon:'bi-robot',label:'Autonomous Campaigns',desc:'AI-powered scheduling',color:'#8b5cf6'},
                {icon:'bi-graph-up',label:'Delivery Analytics',desc:'Real-time read receipts',color:'#f59e0b'},
                {icon:'bi-telephone-fill',label:'Multi-Number Support',desc:'Manage multiple phone IDs',color:'#ef4444'},
                {icon:'bi-shield-check',label:'End-to-End Encryption',desc:'WhatsApp grade security',color:'#10b981'},
                {icon:'bi-clock-fill',label:'Scheduled Campaigns',desc:'Send at optimal times',color:'#6366f1'},
                {icon:'bi-code-slash',label:'Webhook Integration',desc:'Real-time event callbacks',color:'#f97316'},
              ].map(f=>(
                <div key={f.label} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:9}}>
                  <div style={{width:34,height:34,borderRadius:8,background:`${f.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`bi ${f.icon}`} style={{fontSize:15,color:f.color}} />
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{f.label}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!created && (
            <div style={{textAlign:'center'}}>
              <button onClick={()=>setTab('setup')} className="btn-success" style={{padding:'12px 32px',fontSize:15,fontWeight:800}}>
                <i className="bi bi-rocket-takeoff-fill" style={{fontSize:16}} />Setup WhatsApp Business API
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SETUP ── */}
      {tab==='setup' && (
        <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:600}}>
          {created ? (
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
                <div style={{width:56,height:56,borderRadius:14,background:'rgba(37,211,102,.12)',border:'2px solid rgba(37,211,102,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="bi bi-check-circle-fill" style={{fontSize:28,color:'#25d366'}} />
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:900,color:'var(--text)'}}>Business API Active</div>
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Your WhatsApp Business API is configured and ready</div>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[
                  {label:'Account ID',  val:accountId, icon:'bi-building-fill'},
                  {label:'Phone Number ID', val:phoneId, icon:'bi-telephone-fill'},
                  {label:'API Key', val:apiKey, icon:'bi-key-fill', mono:true},
                ].map(f=>(
                  <div key={f.label} style={{padding:'12px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:9}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--text3)',marginBottom:4,display:'flex',alignItems:'center',gap:5}}>
                      <i className={`bi ${f.icon}`} style={{fontSize:10}} />{f.label}
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)',fontFamily:f.mono?'monospace':'inherit',wordBreak:'break-all'}}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--border)'}}>
                <div style={{width:36,height:36,borderRadius:9,background:'rgba(37,211,102,.1)',border:'1px solid rgba(37,211,102,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="bi bi-whatsapp" style={{fontSize:17,color:'#25d366'}} />
                </div>
                <div>
                  <h3 style={{fontSize:15,fontWeight:700,color:'var(--text)',margin:0}}>Create WhatsApp Business Account</h3>
                  <p style={{fontSize:11,color:'var(--text3)',margin:'2px 0 0'}}>Step {step} of 3 — Autonomous API provisioning</p>
                </div>
              </div>

              {/* Progress */}
              <div style={{display:'flex',gap:0,marginBottom:24,alignItems:'center'}}>
                {['Business Info','Plan','Provisioning'].map((s,i)=>(
                  <div key={s} style={{display:'flex',alignItems:'center',flex:i<2?1:'none'}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div style={{
                        width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:12,fontWeight:800,
                        background:step>i+1?'rgba(37,211,102,.2)':step===i+1?'var(--accent)':'rgba(255,255,255,.05)',
                        border:`2px solid ${step>i+1?'var(--green)':step===i+1?'var(--accent)':'var(--border)'}`,
                        color:step>i+1?'var(--green)':step===i+1?'#fff':'var(--text3)',
                      }}>
                        {step>i+1?<i className="bi bi-check-lg" style={{fontSize:12}} />:i+1}
                      </div>
                      <div style={{fontSize:10,fontWeight:600,color:step===i+1?'var(--text)':'var(--text3)',whiteSpace:'nowrap'}}>{s}</div>
                    </div>
                    {i<2&&<div style={{flex:1,height:2,background:step>i+1?'var(--green)':'var(--border)',margin:'0 8px',marginBottom:18}} />}
                  </div>
                ))}
              </div>

              {step===1 && (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="form-group">
                      <label className="form-label">Business Name *</label>
                      <div className="input-group"><i className="bi bi-building-fill input-icon" /><input value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="Death Legion Corp" style={{paddingLeft:36}} /></div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <div className="input-group"><i className="bi bi-telephone-fill input-icon" /><input value={bizPhone} onChange={e=>setBizPhone(e.target.value)} placeholder="+1234567890" style={{paddingLeft:36}} /></div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div className="form-group">
                      <label className="form-label">Business Email</label>
                      <div className="input-group"><i className="bi bi-envelope-fill input-icon" /><input value={bizEmail} onChange={e=>setBizEmail(e.target.value)} placeholder="business@example.com" type="email" style={{paddingLeft:36}} /></div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Website</label>
                      <div className="input-group"><i className="bi bi-globe input-icon" /><input value={bizWebsite} onChange={e=>setBizWebsite(e.target.value)} placeholder="https://example.com" style={{paddingLeft:36}} /></div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Category</label>
                    <select value={bizCategory} onChange={e=>setBizCategory(e.target.value)}>
                      {['Technology','E-commerce','Finance','Healthcare','Education','Retail','Food & Beverage','Real Estate','Travel','Entertainment','Other'].map(c=>(
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={()=>{if(bizName&&bizPhone)setStep(2);else setResult({error:'Fill required fields'})}} className="btn-success" style={{gap:8}}>
                    Next: Choose Plan <i className="bi bi-arrow-right" />
                  </button>
                </div>
              )}

              {step===2 && (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                    {PLANS.map(p=>(
                      <div key={p.id} style={{
                        padding:'14px',border:`2px solid ${selectedPlan===p.id?p.color:'var(--border)'}`,
                        borderRadius:10,background:selectedPlan===p.id?`${p.color}08`:'var(--bg)',
                        cursor:'pointer',transition:'all .2s',position:'relative',
                      }} onClick={()=>setSelectedPlan(p.id)}>
                        {p.popular && <span style={{position:'absolute',top:-9,right:10,background:p.color,color:'#fff',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:10}}>POPULAR</span>}
                        <i className={`bi ${p.icon}`} style={{fontSize:20,color:p.color,marginBottom:6,display:'block'}} />
                        <div style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>{p.name}</div>
                        <div style={{fontSize:16,fontWeight:900,color:p.color}}>{p.price}</div>
                        <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{p.msgs>0?`${p.msgs.toLocaleString()} msgs/mo`:'Unlimited messages'}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setStep(1)} className="btn-secondary" style={{gap:6}}><i className="bi bi-arrow-left" />Back</button>
                    <button onClick={()=>setStep(3)} className="btn-success" style={{flex:1,gap:8}}>Continue <i className="bi bi-arrow-right" /></button>
                  </div>
                </div>
              )}

              {step===3 && (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div className="card" style={{background:'var(--bg)',padding:16}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:12}}>Review & Confirm</div>
                    {[
                      {label:'Business',  val:bizName},
                      {label:'Phone',     val:bizPhone},
                      {label:'Email',     val:bizEmail||'—'},
                      {label:'Category',  val:bizCategory},
                      {label:'Plan',      val:PLANS.find(p=>p.id===selectedPlan)?.name||selectedPlan},
                    ].map(f=>(
                      <div key={f.label} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontSize:11,color:'var(--text3)',fontWeight:600}}>{f.label}</span>
                        <span style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{f.val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setStep(2)} className="btn-secondary" style={{gap:6}}><i className="bi bi-arrow-left" />Back</button>
                    <button onClick={createBusiness} disabled={creating} className="btn-success" style={{flex:1,gap:8}}>
                      <i className={`bi ${creating?'bi-hourglass-split':'bi-rocket-takeoff-fill'}`} style={{fontSize:14}} />
                      {creating?'Creating Business API…':'Create WhatsApp Business API'}
                    </button>
                  </div>
                  {creating && (
                    <div style={{padding:'12px 16px',background:'rgba(37,211,102,.06)',border:'1px solid rgba(37,211,102,.2)',borderRadius:8}}>
                      <div style={{fontSize:12,color:'var(--green)',fontWeight:700,marginBottom:8}}>
                        <span className="spin" style={{display:'inline-block',marginRight:6}}>⚙</span>Provisioning WhatsApp Business API…
                      </div>
                      {['Registering business account','Verifying phone number','Generating API credentials','Setting up webhooks','Activating messaging'].map((s,i)=>(
                        <div key={s} style={{fontSize:11,color:'var(--text3)',padding:'2px 0',display:'flex',alignItems:'center',gap:6}}>
                          <i className="bi bi-check-lg" style={{fontSize:10,color:'var(--green)'}} />{s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {tab==='templates' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <i className="bi bi-file-text-fill" style={{color:'#25d366',fontSize:15}} />
              <span style={{fontSize:13,fontWeight:700,color:'var(--text)',flex:1}}>Message Templates</span>
              <span style={{fontSize:11,color:'var(--text3)'}}>{templates.length} templates</span>
            </div>
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
              {templates.map(t=>(
                <div key={t.id} style={{padding:'14px 16px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,transition:'border-color .15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(37,211,102,.25)')}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{t.name}</span>
                    <Badge color={t.category==='Authentication'?'#ef4444':t.category==='Marketing'?'#8b5cf6':'#3b82f6'}>{t.category}</Badge>
                    <span style={{marginLeft:'auto',fontSize:10,padding:'2px 7px',background:'rgba(37,211,102,.1)',color:'var(--green)',borderRadius:5,fontWeight:700}}>APPROVED</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text2)',fontFamily:'monospace',background:'var(--card)',padding:'8px 12px',borderRadius:7,lineHeight:1.6}}>{t.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS ── */}
      {tab==='campaigns' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card" style={{maxWidth:600}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <i className="bi bi-megaphone-fill" style={{color:'#25d366',fontSize:14}} />New Campaign
            </h3>
            {!created && (
              <div className="alert alert-warn" style={{marginBottom:14}}>
                <i className="bi bi-exclamation-triangle-fill" />Setup WhatsApp Business API first to send campaigns.
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Summer Sale Campaign" />
              </div>
              <div className="form-group">
                <label className="form-label">Use Template (optional)</label>
                <select value={selTemplate} onChange={e=>{setSelTemplate(e.target.value);if(e.target.value){const t=templates.find(t=>t.id===e.target.value);if(t)setCampaignMsg(t.body)}}}>
                  <option value="">— Custom message —</option>
                  {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea value={campaignMsg} onChange={e=>setCampaignMsg(e.target.value)} placeholder="Your campaign message…" style={{minHeight:80}} />
              </div>
              <div className="form-group">
                <label className="form-label">Recipients (one per line or comma-separated)</label>
                <textarea value={targets} onChange={e=>setTargets(e.target.value)} placeholder="+1234567890&#10;+9876543210" style={{minHeight:80,fontFamily:'monospace',fontSize:12}} />
                {targets.trim() && <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{targets.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).length} recipients</div>}
              </div>
              <button onClick={sendCampaign} disabled={sending||!created||!campaignMsg.trim()||!targets.trim()} className="btn-success" style={{gap:8}}>
                <i className="bi bi-megaphone-fill" style={{fontSize:14}} />
                {sending?'Sending…':'Send Campaign'}
              </button>
            </div>
          </div>

          {campaigns.length>0 && (
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontSize:12,fontWeight:700,color:'var(--text3)'}}>CAMPAIGN HISTORY</div>
              <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>
                {campaigns.map((c:any)=>(
                  <div key={c.id} style={{padding:'10px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{c.name}</span>
                      <Badge color='#25d366'>Sent: {c.sent}</Badge>
                      <span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)'}}>{fmtTime(c.ts)}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab==='analytics' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="stats-grid">
            {[
              {label:'Total Sent',     val:analytics?.sent||0,       icon:'bi-send-fill',        color:'#25d366', pct:100},
              {label:'Delivered',      val:analytics?.delivered||0,  icon:'bi-check2-all',       color:'#3b82f6', pct:analytics?.sent?Math.round((analytics.delivered/analytics.sent)*100):0},
              {label:'Read',           val:analytics?.read||0,       icon:'bi-eye-fill',         color:'#8b5cf6', pct:analytics?.delivered?Math.round((analytics.read/analytics.delivered)*100):0},
              {label:'Failed',         val:analytics?.failed||0,     icon:'bi-x-circle-fill',    color:'#ef4444', pct:analytics?.sent?Math.round((analytics.failed/analytics.sent)*100):0},
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{width:36,height:36,borderRadius:9,background:`${s.color}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className={`bi ${s.icon}`} style={{fontSize:16,color:s.color}} />
                  </div>
                  <span style={{fontSize:20,fontWeight:900,color:'var(--text)'}}>{s.val.toLocaleString()}</span>
                </div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:8}}>{s.label}</div>
                <div className="progress"><div className="progress-fill" style={{width:`${s.pct}%`,background:s.color}} /></div>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>{s.pct}% rate</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:16}}>Message Delivery Funnel</h3>
            {[
              {label:'Sent',      val:analytics?.sent||1000,      color:'#25d366'},
              {label:'Delivered', val:analytics?.delivered||950,  color:'#3b82f6'},
              {label:'Read',      val:analytics?.read||700,       color:'#8b5cf6'},
              {label:'Clicked',   val:analytics?.clicked||300,    color:'#f59e0b'},
            ].map((f,i)=>(
              <div key={f.label} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{f.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:f.color}}>{f.val.toLocaleString()}</span>
                </div>
                <div className="progress" style={{height:10}}>
                  <div className="progress-fill" style={{width:`${Math.round((f.val/1000)*100)}%`,background:f.color}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NUMBERS ── */}
      {tab==='numbers' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-telephone-fill" style={{color:'#25d366',fontSize:15}} />
            <span style={{fontSize:13,fontWeight:700,color:'var(--text)',flex:1}}>Phone Numbers</span>
            <span style={{fontSize:11,color:'var(--text3)'}}>{numbers.length} numbers</span>
          </div>
          {numbers.length===0?(
            <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
              <i className="bi bi-telephone-fill" style={{fontSize:40,display:'block',marginBottom:12,opacity:.2}} />
              No numbers found. Sync iVASMS first.
            </div>
          ):(
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
              {numbers.map((n:any)=>(
                <div key={n.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10}}>
                  <div style={{width:38,height:38,borderRadius:10,background:'rgba(37,211,102,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="bi bi-telephone-fill" style={{fontSize:16,color:'#25d366'}} />
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)',fontFamily:'monospace'}}>{n.phone}</div>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{n.country_name||n.country} · {n.status}</div>
                  </div>
                  <Badge color={n.status==='active'?'#25d366':n.status==='inactive'?'#f59e0b':'#ef4444'}>{n.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
