/**
 * Aegis-X — Scenario Switcher
 */
import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { scenarioColor, scenarioIcon } from '../utils/helpers'
import clsx from 'clsx'

const ALL = [
  { id:'flood',      label:'Flood'      },
  { id:'wildfire',   label:'Wildfire'   },
  { id:'earthquake', label:'Earthquake' },
  { id:'tsunami',    label:'Tsunami'    },
  { id:'cyclone',    label:'Cyclone'    },
  { id:'landslide',  label:'Landslide'  },
  { id:'volcanic',   label:'Volcanic'   },
]

export default function ScenarioSwitcher() {
  const { scenario, setScenario, scenarioSwitching, setScenarioSwitching,
          setRiskScores, addNotification } = useAegisStore()
  const [open, setOpen] = useState(false)

  const cur   = ALL.find(s => s.id === scenario) || ALL[0]
  const color = scenarioColor(scenario)
  const icon  = scenarioIcon(scenario)

  const switchTo = async (id) => {
    if (id === scenario || scenarioSwitching) return
    setOpen(false)
    setScenarioSwitching(true)
    try {
      await api.switchScenario(id)
      setScenario(id)
      setRiskScores({})
      addNotification({ type:'info', message:`Switched to ${ALL.find(s=>s.id===id)?.label} scenario` })
    } catch {
      addNotification({ type:'error', message:'Scenario switch failed' })
    }
    setScenarioSwitching(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o=>!o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all"
        style={{ borderColor:color+'55', background:color+'12' }}>
        {scenarioSwitching
          ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:color }} />
          : <span className="text-xl leading-none">{icon}</span>
        }
        <span className="text-sm font-display font-bold uppercase tracking-wider" style={{ color }}>
          {cur.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open?'rotate-180':''}`} style={{ color }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-52 anim-pop panel-glass rounded-xl p-2 overflow-hidden"
               style={{ boxShadow:`0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px ${color}30` }}>
            <p className="text-xs font-mono text-aegis-muted uppercase tracking-wider px-2 pb-2 pt-1 mb-1 border-b border-aegis-border/50">
              Hazard Scenario
            </p>
            {ALL.map(s => {
              const sc = scenarioColor(s.id)
              const active = s.id === scenario
              return (
                <button key={s.id} onClick={() => switchTo(s.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                    active ? '' : 'hover:bg-white/5'
                  )}
                  style={ active ? { background:sc+'18', boxShadow:`inset 0 0 0 1px ${sc}40` } : {} }>
                  <span className="text-xl leading-none">{scenarioIcon(s.id)}</span>
                  <span className="text-sm font-display font-bold uppercase tracking-wider"
                        style={{ color:active ? sc : '#94a3b8' }}>
                    {s.label}
                  </span>
                  {active && (
                    <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background:sc }} />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
