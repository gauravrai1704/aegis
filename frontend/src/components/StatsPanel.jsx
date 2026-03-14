/**
 * Aegis-X Stats Panel — v3.1
 */
import React, { useEffect } from 'react'
import { AlertTriangle, Shield, Users, Activity, Zap, AlertOctagon } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { riskColor, riskLabel, scenarioColor } from '../utils/helpers'

const STATS = [
  { key:'active_alerts',          label:'Active Alerts',    icon:AlertTriangle, color:'#f97316' },
  { key:'pending_approvals',      label:'Pending Approval', icon:Shield,        color:'#00d4ff' },
  { key:'units_deployed',         label:'Units Deployed',   icon:Users,         color:'#22c55e' },
  { key:'sectors_monitored',      label:'Sectors Live',     icon:Activity,      color:'#fbbf24' },
  { key:'conflict_alerts_today',  label:'Sensor Conflicts', icon:Zap,           color:'#ef4444' },
  { key:'uncertainty_flags_today',label:'Uncertainty Flags',icon:AlertOctagon,  color:'#a855f7' },
]

export default function StatsPanel() {
  const { stats, setStats, scenario } = useAegisStore()
  const sColor = scenarioColor(scenario)

  useEffect(() => {
    const load = async () => { try { setStats(await api.getDashboardStats()) } catch {} }
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="shrink-0 space-y-2">
      {/* 6 stat cards */}
      <div className="grid grid-cols-6 gap-2">
        {STATS.map(({ key, label, icon:Icon, color }) => (
          <div key={key} className="stat-card">
            <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-8"
                   style={{ background: color }} />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label">{label}</span>
              <Icon className="w-4 h-4 opacity-50 shrink-0" style={{ color }} />
            </div>
            {stats
              ? <div className="stat-value" style={{ color }}>{stats[key] ?? 0}</div>
              : <div className="shimmer-box w-12 h-8 mt-1" />}
          </div>
        ))}
      </div>

      {/* System risk bar */}
      {stats && (
        <div className="panel px-5 py-3 flex items-center gap-4" data-scenario={scenario}>
          <span className="text-xs font-mono text-aegis-muted uppercase tracking-widest shrink-0">System Risk</span>
          <div className="flex-1 h-2.5 bg-aegis-bg rounded-full overflow-hidden relative">
            <div className="h-full rounded-full transition-all duration-1000 relative"
                 style={{ width:`${(stats.overall_risk||0)*100}%`,
                          background:`linear-gradient(90deg, #22c55e, ${riskColor(stats.overall_risk)})` }}>
              <div className="absolute inset-0 opacity-30"
                   style={{ background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation:'shimmer 2s linear infinite', backgroundSize:'200% 100%' }} />
            </div>
          </div>
          <span className="text-base font-display font-bold w-14 text-right"
                style={{ color:riskColor(stats.overall_risk) }}>
            {((stats.overall_risk||0)*100).toFixed(1)}%
          </span>
          <span className="badge" style={{
            color:riskColor(stats.overall_risk),
            borderColor:riskColor(stats.overall_risk)+'50',
            background:riskColor(stats.overall_risk)+'12',
          }}>
            {riskLabel(stats.overall_risk)}
          </span>
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xl">{['🌊','🔥','🌍','🌐','🌀','⛰️','🌋'].find((_,i)=>['flood','wildfire','earthquake','tsunami','cyclone','landslide','volcanic'][i]===scenario)||'⚠️'}</span>
            <span className="text-sm font-display font-bold uppercase" style={{ color:sColor }}>{scenario}</span>
          </div>
        </div>
      )}
    </div>
  )
}
