/**
 * Aegis-X Command Dashboard — v3.1 Production-Ready
 */
import React, { useEffect, useState, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, Cpu, Zap, Activity } from 'lucide-react'
import StatsPanel from '../components/StatsPanel'
import AlertFeed from '../components/AlertFeed'
import XAIPanel from '../components/XAIPanel'
import VerificationGate from '../components/VerificationGate'
import RealMap from '../components/RealMap'
import { api } from '../utils/api'
import useAegisStore from '../store/aegisStore'
import { riskColor, scenarioColor } from '../utils/helpers'

const MAX_PTS = 40
let _buf = {}

export default function CommandDashboard() {
  const { addAlert, setActiveAlert, riskScores, setSpreadForecast, scenario } = useAegisStore()
  const [timeline,     setTimeline]     = useState({})
  const [modelStatus,  setModel]        = useState(null)
  const color = scenarioColor(scenario)

  useEffect(() => {
    _buf = {} // reset on scenario change
    const load = async () => {
      try {
        const [recent, status] = await Promise.all([api.getAlerts(10), api.getModelStatus()])
        recent.forEach(a => addAlert(a))
        if (recent.length > 0) setActiveAlert(recent[0])
        setModel(status)
      } catch {}
      try { setSpreadForecast(await api.getSpreadForecast()) } catch {}
    }
    load()
  }, [scenario])

  useEffect(() => {
    if (!Object.keys(riskScores).length) return
    const now = Date.now()
    Object.entries(riskScores).forEach(([s, r]) => {
      if (!_buf[s]) _buf[s] = []
      _buf[s].push({ t: now, risk: Math.round(r * 100) })
      if (_buf[s].length > MAX_PTS) _buf[s].shift()
    })
    setTimeline({ ..._buf })
  }, [riskScores])

  const chartData = (() => {
    const ss = Object.keys(_buf)
    if (!ss.length) return []
    const len = Math.max(...ss.map(s => _buf[s]?.length || 0))
    return Array.from({ length: len }, (_, i) => {
      const vals = ss.map(s => _buf[s]?.[i]?.risk || 0)
      return { i, avg: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length), max: Math.max(...vals) }
    })
  })()

  return (
    <div className="h-full flex flex-col gap-2.5 p-3 overflow-hidden" data-scenario={scenario}>
      {/* Stats row */}
      <StatsPanel />

      {/* AI Stack bar */}
      {modelStatus && <AIStackBar status={modelStatus} scenario={scenario} />}

      {/* Main 3-column grid */}
      <div className="flex-1 min-h-0 grid gap-2.5"
           style={{ gridTemplateColumns: '1fr 300px 330px' }}>

        {/* LEFT: Map + Timeline */}
        <div className="flex flex-col gap-2.5 min-h-0">
          <div className="flex-1 min-h-0">
            <RealMap />
          </div>

          {/* Risk Timeline */}
          <div className="panel shrink-0" style={{ height: 118 }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-aegis-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
                <span className="font-display text-xs font-bold uppercase tracking-wider" style={{ color }}>
                  Live Risk Timeline
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-aegis-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 rounded bg-aegis-accent" /><span>Avg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-0.5 rounded bg-aegis-critical" /><span>Peak</span>
                </div>
              </div>
            </div>
            {chartData.length > 2 ? (
              <div style={{ height: 72, paddingTop: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 0, right: 8, top: 2, bottom: 0 }}>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={[0, 100]} hide />
                    <ReferenceLine y={80} stroke="rgba(239,68,68,0.2)" strokeDasharray="3 3" />
                    <ReferenceLine y={60} stroke="rgba(249,115,22,0.2)" strokeDasharray="3 3" />
                    <Tooltip content={TimelineTooltip} />
                    <Line type="monotone" dataKey="avg" stroke="#00d4ff" strokeWidth={2} dot={false} activeDot={{ r:3, fill:'#00d4ff' }} />
                    <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-sm text-aegis-muted font-mono">
                Monitoring — risk data populates in real-time
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Alert Feed */}
        <AlertFeed />

        {/* RIGHT: XAI + Gate */}
        <div className="flex flex-col gap-2.5 min-h-0">
          <div className="flex-1 min-h-0"><XAIPanel /></div>
          <VerificationGate />
        </div>
      </div>
    </div>
  )
}

function TimelineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="panel px-3 py-2 text-xs shadow-2xl" style={{ minWidth: 110 }}>
      <div className="text-aegis-accent font-mono">Avg risk: {payload[0]?.value}%</div>
      {payload[1] && <div className="text-aegis-critical font-mono">Peak: {payload[1]?.value}%</div>}
    </div>
  )
}

function AIStackBar({ status, scenario }) {
  const color = scenarioColor(scenario)
  const ITEMS = [
    { label: 'XGBoost', active: status.xgboost_active, key: 'xgb' },
    { label: 'SHAP',    active: status.xgboost_active, key: 'shap' },
    { label: 'LBP',     active: true, key: 'lbp' },
    { label: 'What-If', active: true, key: 'cf' },
    { label: 'Uncert.', active: true, key: 'unc' },
    { label: 'Conflict',active: true, key: 'con' },
    { label: 'Dual-XAI',active: true, key: 'dxai' },
    { label: 'AI Loop', active: true, key: 'loop' },
  ]
  return (
    <div className="panel flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderColor: color + '30' }}>
      <div className="flex items-center gap-2 shrink-0">
        <Cpu className="w-3.5 h-3.5" style={{ color }} />
        <span className="font-display text-xs font-bold uppercase tracking-wider" style={{ color }}>
          AI Stack Active
        </span>
      </div>
      <div className="w-px h-4 bg-aegis-border" />
      <div className="flex items-center gap-4 overflow-x-auto">
        {ITEMS.map(({ label, active, key }) => (
          <div key={key} className="flex items-center gap-1.5 shrink-0">
            <div className={`w-2 h-2 rounded-full ${active ? 'animate-pulse' : ''}`}
                 style={{ background: active ? '#22c55e' : '#4a6080' }} />
            <span className="text-xs font-display" style={{ color: active ? '#22c55e' : '#4a6080' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
