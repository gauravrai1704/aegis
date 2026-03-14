/**
 * Aegis-X Tactical Risk Map — Multi-Hazard
 * Adds: conflict overlays, spread path corridor, sector population rings,
 *       adjacency network with risk-weighted edge colors, VR panoramic toggle
 */

import React, { useEffect, useState } from 'react'
import { Map, RefreshCw, Layers, Eye } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { riskColor, riskLabel } from '../utils/helpers'

const SECTOR_POSITIONS = {
  A1: { x: 28, y: 30, name: 'Riverside',  pop: 12400 },
  A2: { x: 50, y: 40, name: 'Downtown',   pop: 45000 },
  B1: { x: 22, y: 55, name: 'Industrial', pop: 3200  },
  B2: { x: 62, y: 25, name: 'Bayou Hts',  pop: 8900  },
  C1: { x: 70, y: 52, name: 'Medical',    pop: 21000 },
  C2: { x: 18, y: 68, name: 'Westchase',  pop: 15600 },
  D1: { x: 76, y: 70, name: 'Port',       pop: 1800  },
  D2: { x: 42, y: 15, name: 'Woodland',   pop: 9700  },
}

const ROADS = [
  [[28,30],[50,40]], [[50,40],[62,25]], [[50,40],[70,52]],
  [[28,30],[22,55]], [[22,55],[18,68]], [[70,52],[76,70]],
  [[28,30],[42,15]], [[42,15],[62,25]],
  [[22,55],[50,40]], [[50,40],[76,70]],
]

// Sector adjacency for drawing risk-weighted edges
const ADJACENCY_EDGES = [
  ['A1','A2'], ['A1','B1'], ['A1','D2'],
  ['A2','B2'], ['A2','C1'],
  ['B1','C2'],
  ['C1','D1'],
]

export default function RiskMap() {
  const { riskScores, setActiveAlert, setRiskScores, alerts, spreadForecast } = useAegisStore()
  const [mapData,   setMapData]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [analyzing, setAnalyzing] = useState(null)
  const [layer,     setLayer]     = useState('risk')   // risk | spread | population | vr

  const loadMap = async () => {
    setLoading(true)
    try {
      const data = await api.getRiskMap()
      setMapData(data)
      const scores = {}
      data.zones.forEach(z => { scores[z.sector_id] = z.risk_score })
      setRiskScores(scores)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadMap() }, [])

  const getScore = (id) => riskScores[id] ?? 0.1

  // Get conflict markers from active alerts
  const conflictSectors = new Set(
    alerts.flatMap(a =>
      (a.xai_explanation?.conflict_signals || []).map(c => a.sector)
    )
  )

  // Spread path sectors from latest forecast
  const spreadPath = spreadForecast?.spread_path || []
  const spreadPathSectors = new Set(spreadPath.map(p => p.sector))

  const handleClick = async (id) => {
    setSelected(id)
    setAnalyzing(id)
    try {
      const res = await api.analyze(id, {})
      setActiveAlert(res.alert)
    } catch {}
    setAnalyzing(null)
  }

  // VR Panoramic view — simulated 360° sensor environment
  if (layer === 'vr') {
    return <VRPanoramicView onBack={() => setLayer('risk')} riskScores={riskScores} selected={selected} />
  }

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-aegis-accent" />
          <span className="font-display text-xs uppercase tracking-widest text-aegis-accent">
            Tactical Risk Map
          </span>
          {conflictSectors.size > 0 && (
            <span className="text-xs font-display px-1.5 py-0.5 rounded bg-aegis-critical/15 border border-aegis-critical/40 text-aegis-critical uppercase">
              {conflictSectors.size} conflict{conflictSectors.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mapData && (
            <span className="text-xs text-aegis-muted">
              {mapData.active_incidents} incidents
            </span>
          )}
          <button onClick={loadMap} disabled={loading} className="text-aegis-muted hover:text-aegis-accent transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Layer selector */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-aegis-border">
        {[
          { id: 'risk',       label: 'Risk' },
          { id: 'spread',     label: 'Spread' },
          { id: 'population', label: 'Population' },
          { id: 'vr',         label: '360° VR' },
        ].map(l => (
          <button key={l.id} onClick={() => setLayer(l.id)}
            className={`px-2 py-0.5 rounded text-xs font-display uppercase tracking-wider transition-all ${
              layer === l.id
                ? 'bg-aegis-accent/20 text-aegis-accent border border-aegis-accent/40'
                : 'text-aegis-muted hover:text-white border border-transparent'
            }`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* SVG Map Canvas */}
      <div className="flex-1 relative overflow-hidden grid-bg">
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ userSelect: 'none' }}>
          <defs>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#060a10" stopOpacity="0"    />
            </radialGradient>
            <marker id="spreadArrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#ff6b2b" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>
          <rect width="100" height="100" fill="url(#mapGlow)" />

          {/* Adjacency edges — risk-weighted color */}
          {ADJACENCY_EDGES.map(([a, b], i) => {
            const pa = SECTOR_POSITIONS[a], pb = SECTOR_POSITIONS[b]
            if (!pa || !pb) return null
            const combinedRisk = (getScore(a) + getScore(b)) / 2
            return (
              <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={riskColor(combinedRisk)}
                strokeWidth={layer === 'spread' && (spreadPathSectors.has(a) || spreadPathSectors.has(b)) ? 1.2 : 0.4}
                strokeOpacity={layer === 'spread' && (spreadPathSectors.has(a) || spreadPathSectors.has(b)) ? 0.9 : 0.25}
                strokeDasharray={layer === 'spread' && spreadPathSectors.has(a) && spreadPathSectors.has(b) ? "2 1" : "none"}
              />
            )
          })}

          {/* Spread path arrows */}
          {layer === 'spread' && spreadPath.map((step, i) => {
            if (i === 0) return null
            const from = SECTOR_POSITIONS[spreadPath[i-1]?.sector]
            const to   = SECTOR_POSITIONS[step.sector]
            if (!from || !to) return null
            const mx = (from.x + to.x) / 2
            const my = (from.y + to.y) / 2
            return (
              <line key={`sp-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="#ff6b2b" strokeWidth="0.8" strokeOpacity="0.7"
                markerEnd="url(#spreadArrow)" />
            )
          })}

          {/* Risk heatmap blobs */}
          {Object.entries(SECTOR_POSITIONS).map(([id, pos]) => {
            const score = getScore(id)
            const color = riskColor(score)
            const popNorm = Math.log(pos.pop / 1000 + 1) / Math.log(50)  // log-normalized
            const radius = layer === 'population'
              ? popNorm * 14 + 3
              : score * 12 + 3
            return (
              <circle key={`heat-${id}`} cx={pos.x} cy={pos.y}
                r={radius} fill={layer === 'population' ? '#00d4ff' : color}
                fillOpacity={layer === 'population' ? 0.08 : score * 0.16}
              />
            )
          })}

          {/* Sector nodes */}
          {Object.entries(SECTOR_POSITIONS).map(([id, pos]) => {
            const score     = getScore(id)
            const color     = riskColor(score)
            const isSel     = selected === id
            const isAnalyze = analyzing === id
            const hasConflict = conflictSectors.has(id)
            const isSpread  = spreadPathSectors.has(id)

            return (
              <g key={id} transform={`translate(${pos.x},${pos.y})`}
                onClick={() => handleClick(id)} style={{ cursor: 'pointer' }}>

                {/* Spread path halo */}
                {isSpread && layer === 'spread' && (
                  <circle r={9} fill="none" stroke="#ff6b2b"
                    strokeWidth="0.5" strokeOpacity="0.5"
                    strokeDasharray="2 1"
                    className="sector-pulse" />
                )}

                {/* High-risk pulse ring */}
                {score >= 0.6 && (
                  <circle r={8} fill="none" stroke={color}
                    strokeWidth="0.4" strokeOpacity="0.5"
                    className="sector-pulse" />
                )}

                {/* Node */}
                <circle
                  r={isSel ? 5.5 : 4.5}
                  fill={color + (isSel ? 'cc' : '33')}
                  stroke={color}
                  strokeWidth={isSel ? 0.9 : 0.5}
                />

                {/* Analyzing spinner */}
                {isAnalyze && (
                  <circle r={7} fill="none" stroke="#00d4ff"
                    strokeWidth="0.8" strokeDasharray="3 3"
                    style={{ animation: 'spin 1s linear infinite', transformOrigin: '0 0' }} />
                )}

                {/* Conflict indicator */}
                {hasConflict && (
                  <circle cx={4} cy={-4} r={2}
                    fill="#ff2055" stroke="#060a10" strokeWidth="0.3" />
                )}

                {/* Sector ID label */}
                <text textAnchor="middle" dy="-6.5"
                  fontSize="2.5" fontFamily="'Orbitron', monospace"
                  fill={color} fillOpacity={0.9}>{id}</text>

                {/* Score or population */}
                <text textAnchor="middle" dy="8.5"
                  fontSize="1.9" fontFamily="'IBM Plex Mono', monospace"
                  fill={color} fillOpacity={0.7}>
                  {layer === 'population'
                    ? `${(pos.pop / 1000).toFixed(0)}k`
                    : `${(score * 100).toFixed(0)}%`}
                </text>

                {/* Critical badge */}
                {score >= 0.8 && !hasConflict && (
                  <circle cx={4} cy={-4} r={1.5} fill="#ff2055" />
                )}
              </g>
            )
          })}

          {/* Compass */}
          <text x={95} y={8}  fontSize="3" fontFamily="'Orbitron', monospace" fill="#162035" textAnchor="middle">N</text>
          <text x={95} y={96} fontSize="3" fontFamily="'Orbitron', monospace" fill="#162035" textAnchor="middle">S</text>
        </svg>

        {/* Scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-aegis-accent to-transparent"
            style={{ animation: 'scanLine 6s linear infinite' }} />
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 border-t border-aegis-border flex items-center gap-3 text-xs font-body flex-wrap">
        {layer === 'risk' && <>
          {[['CRITICAL','#ff2055'],['HIGH','#ff6b2b'],['MEDIUM','#fbbf24'],['LOW','#00ff88']].map(([l,c]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
              <span style={{ color: c }}>{l}</span>
            </div>
          ))}
          {conflictSectors.size > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-aegis-critical" />
              <span className="text-aegis-critical">Sensor Conflict</span>
            </div>
          )}
        </>}
        {layer === 'spread' && <span className="text-aegis-warn">→ Projected spread corridor · dashed = high-risk edge</span>}
        {layer === 'population' && <span className="text-aegis-accent">Circle size = relative population at risk</span>}
        <span className="ml-auto text-aegis-muted">Click sector to analyze</span>
      </div>
    </div>
  )
}

// ── VR Panoramic View ─────────────────────────────────────────────────────────

function VRPanoramicView({ onBack, riskScores, selected }) {
  const [angle, setAngle] = useState(0)

  // Auto-rotate the panoramic view
  useEffect(() => {
    const t = setInterval(() => setAngle(a => (a + 0.3) % 360), 50)
    return () => clearInterval(t)
  }, [])

  const sectors = Object.entries(riskScores)
  const maxRisk = Math.max(...sectors.map(([,v]) => v), 0.1)

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-aegis-accent" />
          <span className="font-display text-xs uppercase tracking-widest text-aegis-accent">
            360° VR Panoramic Awareness
          </span>
          <span className="text-xs text-aegis-muted font-body">
            Immersive environmental assessment
          </span>
        </div>
        <button onClick={onBack}
          className="text-xs font-display text-aegis-muted hover:text-white uppercase tracking-wider border border-aegis-border rounded px-2 py-1 transition-all">
          ← Map
        </button>
      </div>

      {/* 360° panoramic canvas */}
      <div className="flex-1 relative overflow-hidden bg-aegis-bg">
        <svg className="w-full h-full" viewBox="0 0 400 240">
          {/* Sky gradient */}
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#060a10" />
              <stop offset="60%"  stopColor="#0c1a30" />
              <stop offset="100%" stopColor="#162035" />
            </linearGradient>
            <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#162035" />
              <stop offset="100%" stopColor="#060a10" />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect width="400" height="140" fill="url(#sky)" />
          {/* Ground */}
          <rect y="140" width="400" height="100" fill="url(#ground)" />
          {/* Horizon line */}
          <line x1="0" y1="140" x2="400" y2="140" stroke="#162035" strokeWidth="1" />

          {/* Stars */}
          {Array.from({ length: 40 }, (_, i) => {
            const seed = i * 137.5
            const x = ((seed * 7 + angle * 0.5) % 400 + 400) % 400
            const y = (seed * 3) % 100 + 10
            return <circle key={i} cx={x} cy={y} r={0.5} fill="#00d4ff" fillOpacity={0.4 + Math.sin(i + angle * 0.05) * 0.3} />
          })}

          {/* Sector threat towers on the horizon */}
          {sectors.map(([id, risk], i) => {
            const baseAngle = (i / sectors.length) * 360
            const screenX = (((baseAngle - angle) % 360 + 360) % 360 / 360) * 400
            const towerH  = risk * 80 + 10
            const color   = riskColor(risk)

            // Only render towers in the visible 180° FOV
            const relAngle = ((baseAngle - angle) % 360 + 360) % 360
            if (relAngle > 180 && relAngle < 360) return null

            return (
              <g key={id}>
                {/* Threat glow behind tower */}
                <ellipse cx={screenX} cy={140} rx={20} ry={6}
                  fill={color} fillOpacity={risk * 0.15} />

                {/* Tower silhouette */}
                <rect
                  x={screenX - 8} y={140 - towerH}
                  width={16} height={towerH}
                  fill={color} fillOpacity={0.12}
                  stroke={color} strokeWidth="0.5" strokeOpacity="0.5"
                />

                {/* Risk beacon on top */}
                <circle cx={screenX} cy={140 - towerH} r={risk >= 0.7 ? 4 : 3}
                  fill={color} fillOpacity={0.7 + Math.sin(angle * 0.1 + i) * 0.3} />

                {/* Sector label */}
                <text x={screenX} y={140 - towerH - 6}
                  textAnchor="middle" fontSize="6"
                  fontFamily="'Orbitron', monospace"
                  fill={color} fillOpacity={0.9}>{id}</text>

                {/* Risk % label */}
                <text x={screenX} y={150}
                  textAnchor="middle" fontSize="5"
                  fontFamily="'IBM Plex Mono', monospace"
                  fill={color} fillOpacity={0.7}>
                  {(risk * 100).toFixed(0)}%
                </text>

                {/* Vertical threat beam for critical */}
                {risk >= 0.8 && (
                  <line x1={screenX} y1={140 - towerH} x2={screenX} y2={20}
                    stroke={color} strokeWidth="0.5" strokeOpacity="0.3"
                    strokeDasharray="3 3" />
                )}
              </g>
            )
          })}

          {/* Compass heading */}
          <text x={200} y={220} textAnchor="middle" fontSize="7"
            fontFamily="'Orbitron', monospace" fill="#4a6080">
            HDG {angle.toFixed(0)}°
          </text>

          {/* Scan line sweep */}
          <line x1={200} y1={50} x2={200} y2={140}
            stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.3"
            strokeDasharray="4 2" />

          {/* Crosshair */}
          <circle cx={200} cy={140} r={3} fill="none" stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.6" />
          <line x1={195} y1={140} x2={205} y2={140} stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.6" />
          <line x1={200} y1={135} x2={200} y2={145} stroke="#00d4ff" strokeWidth="0.5" strokeOpacity="0.6" />
        </svg>

        {/* Drag hint */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <span className="text-xs text-aegis-muted font-body bg-aegis-bg/80 px-2 py-0.5 rounded">
            Auto-rotating 360° panoramic sensor view · Threat towers = sector risk level
          </span>
        </div>
      </div>

      {/* Threat summary bar */}
      <div className="px-3 py-2 border-t border-aegis-border flex items-center gap-3 flex-wrap">
        {sectors
          .sort(([,a],[,b]) => b - a)
          .slice(0, 5)
          .map(([id, risk]) => (
            <div key={id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: riskColor(risk) }} />
              <span className="text-xs font-display" style={{ color: riskColor(risk) }}>
                {id}: {(risk * 100).toFixed(0)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
