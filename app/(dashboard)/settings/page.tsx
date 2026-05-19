'use client'
import { useState, useEffect } from 'react'

const G = {
  bg:'#0a0a0f', card:'#111118', card2:'#16161f', card3:'#1a1a24',
  border:'rgba(255,255,255,0.07)', border2:'rgba(255,255,255,0.12)',
  text1:'#f0f0f8', text2:'#a0a0b8', text3:'#60607a',
  accent:'#7c3aed', accentHover:'#8b5cf6', accentDim:'rgba(124,58,237,0.15)',
  green:'#10b981', greenDim:'rgba(16,185,129,0.12)',
  red:'#ef4444', redDim:'rgba(239,68,68,0.1)',
  yellow:'#f59e0b', yellowDim:'rgba(245,158,11,0.1)',
  blue:'#3b82f6', blueDim:'rgba(59,130,246,0.1)',
}

const inp = {
  width:'100%',padding:'10px 14px',borderRadius:10,
  background:'#16161f',border:'1px solid rgba(255,255,255,0.12)',
  color:'#f0f0f8',fontSize:13,outline:'none',boxSizing:'border-box',
  transition:'border-color .2s',
} as React.CSSProperties

const Label = ({children}: any) => (
  <div style={{fontSize:11,fontWeight:700,color:'#60607a',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>{children}</div>
)

export default function SettingsPage() {
  const [user,        setUser]        = useState<any>(null)
  const [profile,     setProfile]     = useState({name:'',email:''})
  const [passwords,   setPasswords]   = useState({old:'',new_:'',confirm:''})
  const [telegram,    setTelegram]    = useState({botToken:'',chatId:''})
  const [prefs,       setPrefs]       = useState({auto_sync:false,auto_sync_interval:300,notify_otp:true,notify_sms:false})
  const [token,       setToken]       = useState('')
  const [apiKey,      setApiKey]      = useState('')
  const [msgs,        setMsgs]        = useState<Record<string,{type:'success'|'error',text:string}|null>>({})
  const [loading,     setLoading]     = useState<Record<string,boolean>>({})
  const [showPwd,     setShowPwd]     = useState(false)
  const [copied,      setCopied]      = useState<string|null>(null)
  const [tab,         setTab]         = useState<'account'|'ivasms'|'integrations'|'preferences'>('account')
  const [ivasCreds,   setIvasCreds]   = useState({email:'ohlivvy53@gmail.com',password:''})
  const [ivasResult,  setIvasResult]  = useState<any>(null)
  const [ivasTesting, setIvasTesting] = useState(false)
  const [ivasSaving,  setIvasSaving]  = useState(false)
  const [injecting,   setInjecting]   = useState(false)
  const [injectMsg,   setInjectMsg]   = useState('')
  const [importCookies, setImportCookies] = useState('')
  const [importing,   setImporting]   = useState(false)

  useEffect(()=>{
    fetch('/api/settings').then(r=>r.json()).then(d=>{
      if(d.user){
        setUser(d.user)
        setProfile({name:d.user.name||'',email:d.user.email||''})
        setTelegram({botToken:d.user.telegram_bot_token||'',chatId:d.user.telegram_chat_id||''})
        setToken(d.user.mobile_token||'')
        setApiKey(d.user.api_key||'')
        setIvasCreds(p=>({...p,email:d.user.ivasms_email||'ohlivvy53@gmail.com'}))
        setPrefs({
          auto_sync:d.user.auto_sync||false,
          auto_sync_interval:d.user.auto_sync_interval||300,
          notify_otp:d.user.notify_otp!==false,
          notify_sms:d.user.notify_sms||false,
        })
      }
    }).catch(()=>{})
  },[])

  const setMsg_=(key:string,type:'success'|'error',text:string)=>{setMsgs(p=>({...p,[key]:{type,text}}));setTimeout(()=>setMsgs(p=>({...p,[key]:null})),6000)}
  const setLoad=(key:string,v:boolean)=>setLoading(p=>({...p,[key]:v}))

  const saveProfile=async(e:React.FormEvent)=>{
    e.preventDefault();setLoad('profile',true)
    try{
      const r=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'profile',name:profile.name,email:profile.email})})
      const d=await r.json()
      r.ok?setMsg_('profile','success','Profile updated!'):setMsg_('profile','error',d.error||'Failed')
    } catch{setMsg_('profile','error','Network error')}
    setLoad('profile',false)
  }

  const savePassword=async(e:React.FormEvent)=>{
    e.preventDefault()
    if(passwords.new_!==passwords.confirm){setMsg_('password','error','Passwords do not match');return}
    if(passwords.new_.length<6){setMsg_('password','error','Min 6 characters');return}
    setLoad('password',true)
    try{
      const r=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'password',old:passwords.old,new:passwords.new_})})
      const d=await r.json()
      if(r.ok){setMsg_('password','success','Password changed!');setPasswords({old:'',new_:'',confirm:''})}
      else setMsg_('password','error',d.error||'Failed')
    } catch{setMsg_('password','error','Network error')}
    setLoad('password',false)
  }

  const saveTelegram=async(e:React.FormEvent)=>{
    e.preventDefault();setLoad('telegram',true)
    try{
      const r=await fetch('/api/telegram/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({botToken:telegram.botToken,chatId:telegram.chatId})})
      const d=await r.json()
      if(r.ok) setMsg_('telegram','success',`Bot @${d.bot?.username||'connected'} ready`)
      else setMsg_('telegram','error',d.error||'Invalid token')
    } catch{setMsg_('telegram','error','Network error')}
    setLoad('telegram',false)
  }

  const testTelegram=async()=>{
    setLoad('tgtest',true)
    try{
      const r=await fetch('/api/telegram/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({botToken:telegram.botToken,chatId:telegram.chatId})})
      const d=await r.json()
      setMsg_('telegram',d.ok?'success':'error',d.ok?'✅ Test message sent!':d.error||'Failed')
    } catch{setMsg_('telegram','error','Network error')}
    setLoad('tgtest',false)
  }

  const savePrefs=async()=>{
    setLoad('prefs',true)
    try{
      const r=await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'preferences',...prefs})})
      const d=await r.json()
      r.ok?setMsg_('prefs','success','Preferences saved!'):setMsg_('prefs','error',d.error||'Failed')
    } catch{setMsg_('prefs','error','Network error')}
    setLoad('prefs',false)
  }

  const copyText=(text:string,key:string)=>{navigator.clipboard.writeText(text).catch(()=>{});setCopied(key);setTimeout(()=>setCopied(null),2000)}

  const testIvas=async(save=false)=>{
    if(save) setIvasSaving(true); else setIvasTesting(true)
    try{
      const r=await fetch('/api/ivasms/test-creds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:ivasCreds.email,password:ivasCreds.password,save})})
      const d=await r.json()
      setIvasResult(d)
    } catch(e:any){setIvasResult({error:e.message})}
    setIvasSaving(false); setIvasTesting(false)
  }

  const inject=async()=>{
    setInjecting(true);setInjectMsg('')
    try{
      const r=await fetch('/api/ivasms/inject',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
      const d=await r.json()
      setInjectMsg(r.ok?`✅ Loaded ${d.count} numbers + ${d.smsCount} SMS`:`❌ ${d.error||'Failed'}`)
    } catch(e:any){setInjectMsg(`❌ ${e.message}`)}
    setInjecting(false)
  }

  const importCookiesHandler=async()=>{
    if(!importCookies.trim()) return
    setImporting(true)
    try{
      const r=await fetch('/api/ivasms/import-cookies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cookies:importCookies})})
      const d=await r.json()
      setMsg_('import',d.ok?'success':'error',d.ok?d.message||`✅ Imported ${d.count} real numbers!`:d.error||'Failed')
      if(d.ok){setImportCookies('')}
    } catch(e:any){setMsg_('import','error',(e as any).message)}
    setImporting(false)
  }

  const Alert=({k}:{k:string})=>msgs[k]?(
    <div style={{padding:'10px 14px',borderRadius:9,marginTop:12,fontSize:12,fontWeight:600,
      background:msgs[k]!.type==='success'?G.greenDim:G.redDim,
      color:msgs[k]!.type==='success'?G.green:G.red,
      border:`1px solid ${msgs[k]!.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>
      {msgs[k]!.text}
    </div>
  ):null

  const Section=({title,icon,children}:{title:string,icon:string,children:React.ReactNode})=>(
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${G.border}`}}>
        <i className={`bi ${icon}`} style={{fontSize:16,color:G.accent}}/>
        <span style={{fontSize:14,fontWeight:700,color:G.text1}}>{title}</span>
      </div>
      {children}
    </div>
  )

  const Btn=({onClick,type='button',disabled,loading:ld,label,icon,color='default'}: any)=>(
    <button onClick={onClick} type={type} disabled={disabled||ld} style={{
      display:'flex',alignItems:'center',gap:7,padding:'10px 18px',borderRadius:10,
      background:color==='primary'?`linear-gradient(135deg,${G.accent},#a855f7)`:color==='danger'?G.redDim:G.card2,
      border:color==='primary'?'none':color==='danger'?`1px solid rgba(239,68,68,0.3)`:`1px solid ${G.border2}`,
      color:color==='danger'?G.red:'#fff',fontSize:12,fontWeight:700,
      cursor:(disabled||ld)?'not-allowed':'pointer',opacity:(disabled||ld)?0.7:1,
      transition:'all .2s',
      ...(color==='primary'?{boxShadow:'0 3px 12px rgba(124,58,237,0.35)'}:{}),
    }}>
      <i className={`bi ${ld?'bi-arrow-repeat':icon}`} style={{fontSize:12,animation:ld?'spin .8s linear infinite':undefined}}/>
      {label}
    </button>
  )

  const Toggle=({checked,onChange,label,sub}:{checked:boolean,onChange:(v:boolean)=>void,label:string,sub?:string})=>(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:`1px solid ${G.border}`}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:G.text1}}>{label}</div>
        {sub&&<div style={{fontSize:11,color:G.text3,marginTop:2}}>{sub}</div>}
      </div>
      <button onClick={()=>onChange(!checked)} style={{
        width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
        background:checked?G.accent:'rgba(255,255,255,0.1)',
        transition:'background .2s',position:'relative',
      }}>
        <div style={{
          width:18,height:18,borderRadius:'50%',background:'#fff',
          position:'absolute',top:3,left:checked?22:3,
          transition:'left .2s ease',boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
        }}/>
      </button>
    </div>
  )

  const TABS = [
    {id:'account',    icon:'bi-person-fill',    label:'Account'},
    {id:'ivasms',     icon:'bi-phone-fill',     label:'iVASMS'},
    {id:'integrations',icon:'bi-plug-fill',     label:'Integrations'},
    {id:'preferences',icon:'bi-sliders',        label:'Preferences'},
  ] as const

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.text1,letterSpacing:'-0.5px',display:'flex',alignItems:'center',gap:10}}>
          <i className="bi bi-gear-fill" style={{color:G.accent,fontSize:20}}/>
          Settings
        </h1>
        <p style={{margin:'4px 0 0',fontSize:12,color:G.text3}}>Manage your account & integrations</p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:24,background:G.card,borderRadius:12,padding:6,border:`1px solid ${G.border}`}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:7,
            padding:'9px 14px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',
            background:tab===t.id?G.accentDim:'none',
            border:tab===t.id?`1px solid ${G.accent}40`:'1px solid transparent',
            color:tab===t.id?G.accentHover:G.text3,transition:'all .2s',
          }}>
            <i className={`bi ${t.icon}`} style={{fontSize:13}}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {tab==='account'&&(
        <>
          <Section title="Profile" icon="bi-person-fill">
            <form onSubmit={saveProfile}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <div><Label>Display Name</Label><input style={inp} value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} placeholder="Your name"/></div>
                <div><Label>Email</Label><input style={inp} value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))} type="email" placeholder="email@example.com"/></div>
              </div>
              <Btn type="submit" icon="bi-check-circle-fill" label={loading.profile?'Saving…':'Save Profile'} color="primary" loading={loading.profile}/>
              <Alert k="profile"/>
            </form>
          </Section>

          <Section title="Change Password" icon="bi-lock-fill">
            <form onSubmit={savePassword}>
              <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
                <div><Label>Current Password</Label>
                  <div style={{position:'relative'}}>
                    <input style={inp} value={passwords.old} onChange={e=>setPasswords(p=>({...p,old:e.target.value}))} type={showPwd?'text':'password'} placeholder="Current password"/>
                    <button type="button" onClick={()=>setShowPwd(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:G.text3,cursor:'pointer',fontSize:14}}>
                      <i className={`bi ${showPwd?'bi-eye-slash':'bi-eye'}`}/>
                    </button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div><Label>New Password</Label><input style={inp} value={passwords.new_} onChange={e=>setPasswords(p=>({...p,new_:e.target.value}))} type="password" placeholder="New password"/></div>
                  <div><Label>Confirm Password</Label><input style={inp} value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} type="password" placeholder="Confirm new password"/></div>
                </div>
              </div>
              <Btn type="submit" icon="bi-lock-fill" label={loading.password?'Changing…':'Change Password'} color="primary" loading={loading.password}/>
              <Alert k="password"/>
            </form>
          </Section>

          {(token||apiKey)&&(
            <Section title="API Tokens" icon="bi-code-slash">
              {token&&(
                <div style={{marginBottom:14}}>
                  <Label>Mobile Token</Label>
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...inp,fontFamily:'monospace',fontSize:11}} value={token} readOnly/>
                    <button onClick={()=>copyText(token,'token')} style={{padding:'10px 14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border2}`,color:copied==='token'?G.green:G.text2,cursor:'pointer',fontSize:13,flexShrink:0}}>
                      <i className={`bi ${copied==='token'?'bi-check':'bi-copy'}`}/>
                    </button>
                  </div>
                </div>
              )}
              {apiKey&&(
                <div>
                  <Label>API Key</Label>
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...inp,fontFamily:'monospace',fontSize:11}} value={apiKey} readOnly/>
                    <button onClick={()=>copyText(apiKey,'apikey')} style={{padding:'10px 14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border2}`,color:copied==='apikey'?G.green:G.text2,cursor:'pointer',fontSize:13,flexShrink:0}}>
                      <i className={`bi ${copied==='apikey'?'bi-check':'bi-copy'}`}/>
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </>
      )}

      {/* iVASMS Tab */}
      {tab==='ivasms'&&(
        <>
          <div style={{
            background:'rgba(245,158,11,0.06)',border:`1px solid rgba(245,158,11,0.2)`,
            borderRadius:12,padding:'14px 18px',marginBottom:16,
            display:'flex',gap:12,alignItems:'flex-start',
          }}>
            <i className="bi bi-shield-exclamation" style={{fontSize:16,color:G.yellow,flexShrink:0,marginTop:1}}/>
            <div style={{fontSize:12,color:G.text2,lineHeight:1.7}}>
              <strong style={{color:G.yellow}}>Cloudflare Protection:</strong> iVASMS.com blocks server-side login. 
              The credentials below are saved for reference, but direct server login is blocked by CF Managed Challenge.
              <br/><strong style={{color:G.text1}}>Best way to get real data:</strong> Use "Import Browser Cookies" below.
            </div>
          </div>

          <Section title="iVASMS Credentials" icon="bi-phone-fill">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div><Label>Email</Label><input style={inp} value={ivasCreds.email} onChange={e=>setIvasCreds(p=>({...p,email:e.target.value}))} placeholder="ivasms email"/></div>
              <div><Label>Password</Label><input style={inp} value={ivasCreds.password} onChange={e=>setIvasCreds(p=>({...p,password:e.target.value}))} type="password" placeholder="ivasms password"/></div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Btn onClick={()=>testIvas(false)} icon="bi-lightning-fill" label={ivasTesting?'Testing…':'Test Login'} loading={ivasTesting}/>
              <Btn onClick={()=>testIvas(true)} icon="bi-floppy-fill" label={ivasSaving?'Saving…':'Save & Test'} color="primary" loading={ivasSaving}/>
            </div>
            {ivasResult&&(
              <div style={{marginTop:12,padding:'12px 14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border2}`,fontSize:12}}>
                <div style={{fontWeight:700,color:ivasResult.loginSuccess?G.green:G.yellow,marginBottom:6}}>
                  {ivasResult.loginSuccess?'✅ Login OK':ivasResult.cfProtected?'⚠️ CF Protected':ivasResult.error?'❌ Error':'ℹ️ Result'}
                </div>
                <div style={{color:G.text2}}>{ivasResult.message||ivasResult.error||''}</div>
                {ivasResult.steps&&ivasResult.steps.map((s:any,i:number)=>(
                  <div key={i} style={{marginTop:6,padding:'8px 10px',borderRadius:7,background:G.card3,fontSize:11,color:G.text3,fontFamily:'monospace',wordBreak:'break-all'}}>
                    Step {s.step}: {s.label} → {s.status} {s.cfProtection?'[CF BLOCKED]':''} {s.csrfFound?'[CSRF OK]':''}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Import Browser Cookies (Real Data)" icon="bi-cookie">
            <div style={{background:G.card2,borderRadius:10,padding:'12px 14px',marginBottom:14,border:`1px solid ${G.border}`,fontSize:12,color:G.text2,lineHeight:1.8}}>
              <strong style={{color:G.text1}}>Steps:</strong>
              <ol style={{margin:'6px 0 0',paddingLeft:18}}>
                <li>Login to <strong style={{color:G.accent}}>ivasms.com</strong> in Chrome/Firefox</li>
                <li>F12 → Application → Cookies → www.ivasms.com</li>
                <li>Copy: <code style={{background:G.card3,padding:'1px 5px',borderRadius:4,color:G.yellow,fontSize:11}}>cf_clearance, ivas_sms_session, XSRF-TOKEN</code></li>
                <li>Paste below as: <code style={{background:G.card3,padding:'1px 5px',borderRadius:4,color:G.yellow,fontSize:11}}>cf_clearance=xxx; ivas_sms_session=yyy; XSRF-TOKEN=zzz</code></li>
              </ol>
            </div>
            <Label>Browser Cookies</Label>
            <textarea value={importCookies} onChange={e=>setImportCookies(e.target.value)}
              placeholder="cf_clearance=...; ivas_sms_session=...; XSRF-TOKEN=..."
              rows={3} style={{...inp,fontFamily:'monospace',fontSize:11,resize:'vertical',marginBottom:12}}/>
            <Btn onClick={importCookiesHandler} icon="bi-box-arrow-in-down" label={importing?'Importing…':'Import & Scrape Real Numbers'} color="primary" loading={importing}/>
            <Alert k="import"/>
          </Section>

          <Section title="Demo Data (Inject)" icon="bi-database-fill">
            <p style={{fontSize:13,color:G.text2,marginBottom:14,lineHeight:1.6}}>
              Load 36 demo numbers with 100+ realistic SMS messages including OTPs for testing. This replaces existing data.
            </p>
            <Btn onClick={inject} icon="bi-download" label={injecting?'Loading…':'Load Demo Numbers + SMS'} color="primary" loading={injecting}/>
            {injectMsg&&<div style={{marginTop:10,fontSize:12,color:injectMsg.startsWith('✅')?G.green:G.red}}>{injectMsg}</div>}
          </Section>
        </>
      )}

      {/* Integrations Tab */}
      {tab==='integrations'&&(
        <Section title="Telegram Bot" icon="bi-telegram">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><Label>Bot Token</Label><input style={inp} value={telegram.botToken} onChange={e=>setTelegram(p=>({...p,botToken:e.target.value}))} placeholder="1234567:ABC..." type="password"/></div>
            <div><Label>Chat ID</Label><input style={inp} value={telegram.chatId} onChange={e=>setTelegram(p=>({...p,chatId:e.target.value}))} placeholder="Your chat ID"/></div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Btn onClick={saveTelegram} icon="bi-floppy-fill" label={loading.telegram?'Saving…':'Save Bot'} color="primary" loading={loading.telegram}/>
            <Btn onClick={testTelegram} icon="bi-send-fill" label={loading.tgtest?'Sending…':'Send Test'} loading={loading.tgtest}/>
          </div>
          <Alert k="telegram"/>
          <div style={{marginTop:16,padding:'12px 14px',borderRadius:9,background:G.card2,border:`1px solid ${G.border}`,fontSize:12,color:G.text2}}>
            <strong style={{color:G.text1}}>How to get Bot Token:</strong> Message @BotFather on Telegram → /newbot → copy token<br/>
            <strong style={{color:G.text1}}>How to get Chat ID:</strong> Message @userinfobot → copy your ID
          </div>
        </Section>
      )}

      {/* Preferences Tab */}
      {tab==='preferences'&&(
        <Section title="Notification Preferences" icon="bi-bell-fill">
          <Toggle checked={prefs.notify_otp} onChange={v=>setPrefs(p=>({...p,notify_otp:v}))} label="OTP Notifications" sub="Get notified when new OTP codes arrive"/>
          <Toggle checked={prefs.notify_sms} onChange={v=>setPrefs(p=>({...p,notify_sms:v}))} label="SMS Notifications" sub="Get notified for all incoming SMS"/>
          <Toggle checked={prefs.auto_sync} onChange={v=>setPrefs(p=>({...p,auto_sync:v}))} label="Auto Sync" sub="Automatically sync with iVASMS"/>
          {prefs.auto_sync&&(
            <div style={{marginTop:14}}>
              <Label>Sync Interval</Label>
              <select value={prefs.auto_sync_interval} onChange={e=>setPrefs(p=>({...p,auto_sync_interval:Number(e.target.value)}))} style={{...inp,cursor:'pointer'}}>
                <option value={60}>Every 1 minute</option>
                <option value={300}>Every 5 minutes</option>
                <option value={600}>Every 10 minutes</option>
                <option value={1800}>Every 30 minutes</option>
                <option value={3600}>Every hour</option>
              </select>
            </div>
          )}
          <div style={{marginTop:16}}>
            <Btn onClick={savePrefs} icon="bi-check-circle-fill" label={loading.prefs?'Saving…':'Save Preferences'} color="primary" loading={loading.prefs}/>
            <Alert k="prefs"/>
          </div>
        </Section>
      )}
    </div>
  )
}
