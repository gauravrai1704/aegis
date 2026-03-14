/**
 * Aegis-X NavBar — v3.0 Multi-Hazard
 */
import React from 'react'
import { Shield, Activity, Map, Bell, TrendingUp, FileText, Wind, Database } from 'lucide-react'
import ScenarioSwitcher from './ScenarioSwitcher'
import useAegisStore from '../store/aegisStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { id:'dashboard', label:'Command',  icon:Shield    },
  { id:'map',       label:'Risk Map', icon:Map       },
  { id:'realdata',  label:'Live Data',icon:Database  },
  { id:'alerts',    label:'Alerts',   icon:Bell      },
  { id:'xai',       label:'XAI Lab',  icon:Activity  },
  { id:'spread',    label:'Spread',   icon:Wind      },
  { id:'loop',      label:'AI Loop',  icon:TrendingUp},
  { id:'briefing',  label:'Briefing', icon:FileText  },
]

export default function NavBar() {
  const { activePanel, setActivePanel, wsStatus, alerts, scenario } = useAegisStore()
  const pendingCount  = alerts.filter(a => a.status === 'pending').length
  const conflictCount = alerts.reduce((n,a)=>n+(a.xai_explanation?.conflict_signals?.length||0),0)
  const statusColor   = { connected:'#22c55e', connecting:'#fbbf24', disconnected:'#ef4444' }[wsStatus]

  return (
    <nav className="h-16 bg-aegis-surface border-b border-aegis-border flex items-center px-5 gap-4 z-50 relative shrink-0"
         style={{ boxShadow:'0 1px 0 rgba(255,255,255,0.04)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0 mr-2">
        <div className="relative">
          <Shield className="w-8 h-8 text-aegis-accent" strokeWidth={1.5} />
          <div className="absolute inset-0 blur-xl bg-aegis-accent/40 rounded-full" />
        </div>
        <div>
          <div className="font-display text-base font-bold text-white tracking-widest leading-none">AEGIS-X</div>
          <div className="text-xs text-aegis-muted font-mono uppercase tracking-widest mt-0.5">XAI · Multi-Hazard</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {NAV_ITEMS.map(({ id, label, icon:Icon }) => {
          const active = activePanel === id
          return (
            <button key={id} onClick={() => setActivePanel(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display uppercase tracking-wider transition-all duration-150 relative shrink-0',
                active
                  ? 'bg-aegis-accent/15 text-aegis-accent border border-aegis-accent/40'
                  : 'text-aegis-muted hover:text-white hover:bg-white/5 border border-transparent'
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'alerts' && pendingCount > 0 && (
                <span className="ml-0.5 bg-aegis-critical text-white text-xs font-display px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
              {id === 'xai' && conflictCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-aegis-critical" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* Scenario switcher */}
      <ScenarioSwitcher />

      {/* Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-aegis-bg rounded-lg border border-aegis-border">
          <div className="w-2 h-2 rounded-full" style={{ background:statusColor }} />
          <span className="text-xs font-display uppercase tracking-wider" style={{ color:statusColor }}>
            {wsStatus}
          </span>
        </div>
        <div className="text-xs font-display text-aegis-accent/70">
          <LiveClock />
        </div>
      </div>
    </nav>
  )
}

function LiveClock() {
  const [t, setT] = React.useState(new Date())
  React.useEffect(() => { const i = setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(i) }, [])
  return <span>{t.toUTCString().slice(17,25)} UTC</span>
}
