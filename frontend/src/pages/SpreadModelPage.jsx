/**
 * Aegis-X — Predictive Spread Model
 * 1h / 3h / 6h cellular automaton forecast
 */
import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Wind, Clock, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { riskColor, riskLabel, scenarioColor } from '../utils/helpers'

const SVG_POSITIONS = {
  A1:{ x:28, y:30 }, A2:{ x:50, y:40 }, B1:{ x:22, y:55 },
  B2:{ x:62, y:25 }, C1:{ x:70, y:52 }, C2:{ x:18, y:68 },
  D1:{ x:76, y:70 }, D2:{ x:42, y:15 },
}
const SECTOR_NAMES = {
  A1:'Riverside', A2:'Downtown', B1:'Industrial',
  B2:'Bayou Hts', C1:'Medical',  C2:'Westchase', D1:'Port', D2:'Woodland',
}

export default function SpreadModelPage() {
  const { spreadForecast, setSpreadForecast, scenario } = useAegisStore()
  const [loading, setLoading] = useState(false)
  const [horizon, setHorizon] = useState('1h')
  const color = scenarioColor(scenario)

  const load = async () => {
    setLoading(true)
    try { setSpreadForecast(await api.getSpreadForecast()) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [scenario])

  if (!spreadForecast) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor:color }} />
        <span className="text-sm text-aegis-muted">Computing spread forecast…</span>
      </div>
    </div>
  )

  const sf = spreadForecast
  const active = sf.forecasts?.find(f => f.horizon === horizon) || sf.forecasts?.[0]

  const barData = Object.keys(SVG_POSITIONS).map(id => ({
    sector: id,
    current:   Math.round((sf.current_risks?.[id] || 0) * 100),
    projected: Math.round((active?.sectors?.[id]  || 0) * 100),
  }))

  const spreadPathSet = new Set((sf.spread_path || []).map(p => p.sector))

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5" data-scenario={scenario}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Wind className="w-5 h-5" style={{ color }} />
            <h2 className="font-display text-lg font-bold uppercase tracking-widest" style={{ color }}>
              Predictive Spread Model
            </h2>
          </div>
          <p className="text-sm text-aegis-muted">
            Cellular automaton propagation — where the {sf.scenario} event spreads over time.
            Model confidence:&nbsp;
            <span className="font-mono font-bold" style={{ color:riskColor(sf.confidence) }}>
              {(sf.confidence * 100).toFixed(0)}%
            </span>
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-ghost flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Horizon tabs ────────────────────────────────────── */}
      <div className="flex gap-2">
        {sf.forecasts?.map(f => {
          const critCount = f.sectors_critical?.length || 0
          const active_tab = horizon === f.horizon
          return (
            <button key={f.horizon} onClick={() => setHorizon(f.horizon)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-display text-sm uppercase tracking-wider transition-all ${
                active_tab
                  ? 'text-white border-opacity-60'
                  : 'border-aegis-border text-aegis-muted hover:text-aegis-text'
              }`}
              style={ active_tab ? { borderColor:color+'80', background:color+'18', color } : {} }>
              <Clock className="w-4 h-4" />
              {f.horizon}
              {critCount > 0 && (
                <span className="bg-aegis-critical text-white text-xs font-display px-1.5 py-0.5 rounded-full">
                  {critCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Critical warning ────────────────────────────────── */}
      {active?.sectors_critical?.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-aegis-critical/40 bg-aegis-critical/8">
          <AlertTriangle className="w-4 h-4 text-aegis-critical shrink-0" />
          <span className="text-sm font-medium text-aegis-critical">
            SPREAD ALERT: Sectors {active.sectors_critical.join(', ')} projected CRITICAL within {horizon}
          </span>
        </div>
      )}

      {/* ── Two-column layout: SVG map + bar chart ───────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Projection SVG map */}
        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color }} />
            <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
              Risk Projection — {horizon}
            </span>
          </div>
          <div className="relative w-full grid-bg rounded-xl overflow-hidden" style={{ paddingTop:'78%' }}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {/* Adjacency lines */}
              {[['A1','A2'],['A1','B1'],['A1','D2'],['A2','B2'],['A2','C1'],['B1','C2'],['C1','D1']].map(([a,b],i) => {
                const pa = SVG_POSITIONS[a], pb = SVG_POSITIONS[b]
                if (!pa||!pb) return null
                const bothInPath = spreadPathSet.has(a) && spreadPathSet.has(b)
                return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  stroke={bothInPath ? color : '#1a2d4a'}
                  strokeWidth={bothInPath ? 1 : 0.5}
                  strokeDasharray={bothInPath ? '3 1.5' : 'none'}
                  strokeOpacity={bothInPath ? 0.8 : 0.6} />
              })}

              {/* Risk blobs */}
              {Object.entries(SVG_POSITIONS).map(([id,pos]) => {
                const proj = active?.sectors?.[id] || 0
                return <circle key={`blob-${id}`} cx={pos.x} cy={pos.y}
                  r={proj * 10 + 3} fill={riskColor(proj)} fillOpacity={0.1 + proj*0.12} />
              })}

              {/* Sector nodes */}
              {Object.entries(SVG_POSITIONS).map(([id,pos]) => {
                const cur  = sf.current_risks?.[id] || 0
                const proj = active?.sectors?.[id]  || 0
                const col  = riskColor(proj)
                const inPath = spreadPathSet.has(id)
                return (
                  <g key={id}>
                    {inPath && <circle cx={pos.x} cy={pos.y} r={7} fill="none"
                      stroke={color} strokeWidth={0.7} strokeOpacity={0.6}
                      strokeDasharray="2 1.5" className="sector-pulse" />}
                    <circle cx={pos.x} cy={pos.y} r={inPath ? 4.5 : 3.8}
                      fill={col+(inPath?'cc':'55')} stroke={col} strokeWidth={inPath?0.8:0.5} />
                    <text x={pos.x} y={pos.y-6} textAnchor="middle"
                      fontSize="2.4" fontFamily="'Orbitron',monospace" fill={col} fillOpacity={0.9}>
                      {id}
                    </text>
                    <text x={pos.x} y={pos.y+7.5} textAnchor="middle"
                      fontSize="2" fontFamily="'IBM Plex Mono',monospace" fill={col} fillOpacity={0.75}>
                      {(proj*100).toFixed(0)}%
                    </text>
                  </g>
                )
              })}

              {/* Spread path arrows */}
              {(sf.spread_path||[]).map((step,i) => {
                if (!i) return null
                const from = SVG_POSITIONS[sf.spread_path[i-1]?.sector]
                const to   = SVG_POSITIONS[step.sector]
                if (!from||!to) return null
                return <line key={`arrow-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={color} strokeWidth={1} strokeOpacity={0.7}
                  markerEnd="url(#arrowHead)" />
              })}

              <defs>
                <marker id="arrowHead" viewBox="0 0 8 8" refX="6" refY="4"
                  markerWidth="4" markerHeight="4" orient="auto">
                  <path d="M1 1L7 4L1 7" fill="none" stroke={color} strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </marker>
              </defs>
            </svg>
          </div>
          <p className="text-xs text-aegis-muted font-mono mt-2 text-center">
            Dashed = spread corridor · Circle size = projected risk
          </p>
        </div>

        {/* Bar chart */}
        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
              Current vs Projected — {horizon}
            </span>
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left:-20, right:8, top:4, bottom:4 }}>
                <XAxis dataKey="sector" tick={{ fontSize:11, fill:'#cbd5e1' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'#4a6080' }} axisLine={false} tickLine={false} />
                <Tooltip content={<SpreadTooltip />} />
                <Bar dataKey="current" opacity={0.4} radius={[3,3,0,0]}>
                  {barData.map((d,i) => <Cell key={i} fill={riskColor(d.current/100)} />)}
                </Bar>
                <Bar dataKey="projected" radius={[3,3,0,0]}>
                  {barData.map((d,i) => <Cell key={i} fill={riskColor(d.projected/100)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 text-sm text-aegis-muted mt-2 px-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded opacity-40 bg-aegis-accent" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded bg-aegis-accent" />
              <span>Projected {horizon}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Spread corridor breakdown ───────────────────────── */}
      {sf.spread_path?.length > 0 && (
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="w-4 h-4" style={{ color }} />
            <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
              Primary Spread Corridor
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {sf.spread_path.map((step,i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 font-display text-base font-bold"
                       style={{ borderColor:riskColor(step.risk), color:riskColor(step.risk),
                                background:riskColor(step.risk)+'18' }}>
                    {step.sector}
                  </div>
                  <span className="text-sm font-mono font-bold" style={{ color:riskColor(step.risk) }}>
                    {(step.risk*100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-aegis-muted text-center w-16 truncate">
                    {SECTOR_NAMES[step.sector] || step.sector}
                  </span>
                </div>
                {i < sf.spread_path.length - 1 && (
                  <span className="text-2xl mb-6" style={{ color }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs text-aegis-muted font-mono mt-3">
            Model: {sf.model}
          </p>
        </div>
      )}
    </div>
  )
}

function SpreadTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="panel px-3 py-2.5 shadow-2xl">
      <p className="text-sm font-display font-bold text-white mb-1">Sector {label}</p>
      <p className="text-sm text-aegis-muted font-mono">Current: {payload[0]?.value}%</p>
      <p className="text-sm text-aegis-accent font-mono">Projected: {payload[1]?.value}%</p>
    </div>
  )
}
