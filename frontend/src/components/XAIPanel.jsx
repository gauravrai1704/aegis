/**
 * Aegis-X XAI Panel — Multi-Hazard v3.1
 * 6 Tabs: SHAP | Grad-CAM + Saliency | What-If | Uncertainty | Conflicts | Trace
 * All fonts bumped to readable sizes. No text smaller than text-xs (11px).
 */
import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Brain, Eye, List, CheckCircle, Info, GitBranch,
  AlertOctagon, Cpu, Zap, Shield, Activity,
} from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { riskColor } from '../utils/helpers'
import clsx from 'clsx'

const TABS = [
  { id:'shap',        label:'SHAP',       icon:Activity     },
  { id:'gradcam',     label:'Grad-CAM',   icon:Eye          },
  { id:'whatif',      label:'What-If',    icon:GitBranch    },
  { id:'uncertainty', label:'Uncert.',    icon:AlertOctagon },
  { id:'conflicts',   label:'Conflicts',  icon:Zap          },
  { id:'trace',       label:'Trace',      icon:List         },
]

const RELIABILITY_COLOR = { HIGH:'#22c55e', MEDIUM:'#fbbf24', LOW:'#ef4444' }

export default function XAIPanel() {
  const { activeAlert } = useAegisStore()
  const [tab, setTab] = useState('shap')

  if (!activeAlert) {
    return (
      <div className="panel h-full flex flex-col items-center justify-center gap-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-aegis-border/50">
          <Brain className="w-8 h-8 text-aegis-muted/50" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-sm text-aegis-muted">Select an alert to view</p>
          <p className="text-xs text-aegis-accent/50 font-display uppercase tracking-wider mt-1">
            6 XAI Layers Active
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center px-6">
          {['SHAP','Grad-CAM','What-If','Uncertainty','Conflicts','Trace'].map(l => (
            <span key={l} className="text-xs font-display text-aegis-border border border-aegis-border/50 px-2 py-0.5 rounded">
              {l}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const xai = activeAlert.xai_explanation
  const conflictCount    = xai?.conflict_signals?.length || 0
  const uncertaintyCount = xai?.uncertainty_regions?.length || 0
  const reliability      = xai?.dual_xai_reliability || 'MEDIUM'

  return (
    <div className="panel h-full flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-aegis-accent" />
          <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-accent">
            XAI Engine
          </span>
          <span className="text-xs font-display px-2 py-0.5 rounded-full bg-aegis-safe/10 border border-aegis-safe/30 text-aegis-safe">
            XGBoost
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-aegis-muted">Reliability</span>
            <span className="text-xs font-display font-bold" style={{ color:RELIABILITY_COLOR[reliability] }}>
              {reliability}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-aegis-muted">Conf</span>
            <span className="text-sm font-display font-bold" style={{ color:riskColor(xai?.confidence || 0) }}>
              {((xai?.confidence || 0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Status banners ─────────────────────────────────────── */}
      {xai?.motion_blur_detected && (
        <div className="px-4 py-2 bg-yellow-500/8 border-b border-yellow-500/25 flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-300/90">
            LBP deblur applied · Image quality: {((xai.lbp_texture_quality||1)*100).toFixed(0)}%
          </span>
        </div>
      )}
      {conflictCount > 0 && (
        <div className="px-4 py-2 bg-aegis-critical/8 border-b border-aegis-critical/25 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-aegis-critical shrink-0" />
          <span className="text-xs text-aegis-critical font-medium">
            {conflictCount} sensor conflict{conflictCount > 1 ? 's' : ''} detected — review Conflicts tab
          </span>
        </div>
      )}

      {/* ── Summary ────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-aegis-accent/5 border-b border-aegis-border">
        <p className="text-sm leading-relaxed text-white/85">{xai?.summary}</p>
        <p className="text-xs text-aegis-muted font-mono mt-1.5 truncate">{xai?.model_used}</p>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div className="flex border-b border-aegis-border shrink-0">
        {TABS.map(({ id, label, icon:Icon }) => {
          const hasBadge = (id==='conflicts' && conflictCount > 0) ||
                           (id==='uncertainty' && uncertaintyCount > 0)
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 relative transition-all',
                active
                  ? 'text-aegis-accent border-b-2 border-aegis-accent bg-aegis-accent/5'
                  : 'text-aegis-muted hover:text-aegis-text'
              )}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-display uppercase tracking-wider leading-none">{label}</span>
              {hasBadge && (
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-aegis-critical" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'shap'        && <SHAPTab    features={xai?.shap_features     || []} risk={activeAlert.risk_score} />}
        {tab === 'gradcam'     && <GradCAMTab regions={xai?.grad_cam_regions   || []} saliency={xai?.saliency_regions || []} sector={activeAlert.sector} reliability={reliability} />}
        {tab === 'whatif'      && <WhatIfTab  cfs={xai?.counterfactuals        || []} risk={activeAlert.risk_score} />}
        {tab === 'uncertainty' && <UncertaintyTab regions={xai?.uncertainty_regions || []} quality={xai?.lbp_texture_quality || 1} steps={xai?.preprocessing_steps || []} />}
        {tab === 'conflicts'   && <ConflictsTab signals={xai?.conflict_signals  || []} />}
        {tab === 'trace'       && <TraceTab   steps={xai?.reasoning_trace      || []} />}
      </div>
    </div>
  )
}

/* ── SHAP Tab ─────────────────────────────────────────────────────── */
function SHAPTab({ features, risk }) {
  const data = features.map(f => ({
    name:     f.feature.length > 16 ? f.feature.slice(0,15)+'…' : f.feature,
    fullName: f.feature, value: f.value,
    shap:     Math.abs(f.shap_value), raw: f.shap_value,
    unit:     f.unit,   desc: f.description,
  }))

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-aegis-muted leading-relaxed">
        SHAP values show each sensor's contribution to the risk score.
        Computed by a real XGBoost TreeExplainer — values sum to (prediction − base).
      </p>

      {/* Bar chart */}
      <div style={{ height:190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left:8, right:36, top:4, bottom:4 }}>
            <XAxis type="number" domain={[0,0.5]} tick={{ fontSize:11, fill:'#4a6080' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize:11, fill:'#cbd5e1' }} axisLine={false} tickLine={false} />
            <Tooltip content={<SHAPTooltip />} />
            <Bar dataKey="shap" radius={[0,4,4,0]}>
              {data.map((e,i) => <Cell key={i} fill={riskColor(e.shap*2)} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature rows */}
      <div className="space-y-2">
        {features.slice(0,5).map((f,i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-aegis-border/40">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:riskColor(Math.abs(f.shap_value)*2) }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white leading-none">{f.feature}</p>
              <p className="text-xs text-aegis-muted mt-0.5">{f.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-mono font-bold" style={{ color:riskColor(Math.abs(f.shap_value)*2) }}>
                {f.value}{f.unit}
              </p>
              <p className="text-xs text-aegis-muted font-mono">SHAP: {f.shap_value.toFixed(4)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SHAPTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="panel px-3 py-2.5 text-xs shadow-2xl min-w-[180px]">
      <p className="text-white font-medium mb-1.5">{d.fullName}</p>
      <p className="text-aegis-muted font-mono">Value: {d.value}{d.unit}</p>
      <p className="text-aegis-accent font-mono">SHAP: {d.raw.toFixed(4)}</p>
      <p className="text-aegis-muted mt-1.5 leading-relaxed max-w-[160px]">{d.desc}</p>
    </div>
  )
}

/* ── Grad-CAM Tab ─────────────────────────────────────────────────── */
function GradCAMTab({ regions, saliency, sector, reliability }) {
  const [mode, setMode] = useState('gradcam')
  const RCOL = { HIGH:'#22c55e', MEDIUM:'#fbbf24', LOW:'#ef4444' }

  return (
    <div className="p-4 space-y-4">
      {/* Dual-level toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[['gradcam','Grad-CAM (Global)'],['saliency','Saliency (Local)']].map(([k,label]) => (
            <button key={k} onClick={() => setMode(k)}
              className={clsx('text-xs font-display uppercase px-3 py-1.5 rounded-lg border transition-all',
                mode===k ? 'bg-aegis-accent/15 border-aegis-accent/50 text-aegis-accent'
                         : 'border-aegis-border text-aegis-muted hover:text-aegis-text')}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs font-display font-bold" style={{ color:RCOL[reliability] }}>
          XAI Reliability: {reliability}
        </span>
      </div>

      {reliability === 'LOW' && (
        <div className="px-3 py-2.5 bg-aegis-critical/8 border border-aegis-critical/30 rounded-lg">
          <p className="text-sm text-aegis-critical font-medium">
            ⚠ Low reliability — Grad-CAM and Saliency indicate possible misattribution.
            Recommend ground team verification.
          </p>
        </div>
      )}

      {/* Simulated drone view */}
      <div className="relative rounded-xl overflow-hidden border border-aegis-border bg-aegis-bg" style={{ paddingTop:'56%' }}>
        <div className="absolute inset-0 grid-bg">
          {/* Terrain pattern */}
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='80' height='80' fill='%230c1625'/%3E%3Crect x='8' y='8' width='22' height='14' rx='2' fill='%231a2d4a'/%3E%3Crect x='40' y='10' width='18' height='12' rx='2' fill='%231a2d4a'/%3E%3Crect x='8' y='40' width='30' height='22' rx='2' fill='%231a2d4a'/%3E%3Crect x='48' y='44' width='14' height='14' rx='2' fill='%231a2d4a'/%3E%3C/svg%3E\")",
            backgroundRepeat:'repeat',
          }} />

          {/* Grad-CAM regions */}
          {mode==='gradcam' && regions.map((r,i) => {
            const hc = heatColor(r.intensity)
            return (
              <div key={i} className="absolute rounded-xl" style={{
                left:`${r.x*100}%`, top:`${r.y*100}%`,
                width:`${r.width*100}%`, height:`${r.height*100}%`,
                background:`radial-gradient(ellipse, ${hc}cc, ${hc}44, transparent)`,
                boxShadow:`0 0 24px ${hc}55`,
                animation:`sectorPulse ${1.5+i*0.4}s ease-in-out infinite`,
              }}>
                <span style={{
                  position:'absolute', bottom:4, left:4,
                  fontSize:'9px', fontFamily:"'Orbitron',monospace",
                  color:hc, background:'rgba(4,8,15,0.8)', padding:'1px 5px', borderRadius:4,
                  whiteSpace:'nowrap', letterSpacing:'0.06em',
                }}>{r.label}</span>
              </div>
            )
          })}

          {/* Saliency dots */}
          {mode==='saliency' && saliency.map((s,i) => {
            const hc = heatColor(s.saliency_score)
            const sz = s.radius*200
            return (
              <div key={i} className="absolute rounded-full border-2 flex items-center justify-center" style={{
                left:`calc(${s.x*100}% - ${sz/2}px)`,
                top:`calc(${s.y*100}% - ${sz/2}px)`,
                width:sz, height:sz,
                borderColor:hc, background:`${hc}20`,
                boxShadow:`0 0 12px ${hc}88`,
              }}>
                <span style={{ fontSize:8, fontFamily:"'Orbitron',monospace", color:hc }}>
                  {(s.pixel_confidence*100).toFixed(0)}%
                </span>
              </div>
            )
          })}

          {/* HUD labels */}
          <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg text-xs font-display text-aegis-accent"
               style={{ background:'rgba(4,8,15,0.85)', border:'1px solid rgba(0,212,255,0.25)' }}>
            SECTOR {sector} · {mode === 'gradcam' ? 'GRAD-CAM' : 'SALIENCY'}
          </div>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg"
               style={{ background:'rgba(4,8,15,0.85)' }}>
            <div className="w-2 h-2 rounded-full bg-aegis-critical animate-pulse" />
            <span className="text-xs font-display text-aegis-critical">LIVE</span>
          </div>
        </div>
      </div>

      {/* Colour scale */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-aegis-muted">Activation:</span>
        <div className="flex-1 h-2 rounded-full" style={{ background:'linear-gradient(90deg,#00d4ff,#fbbf24,#f97316,#ef4444)' }} />
        <span className="text-xs text-aegis-muted">High</span>
      </div>

      {/* Region list */}
      <div className="space-y-2">
        {(mode==='gradcam' ? regions : saliency).map((item,i) => {
          const score = item.intensity ?? item.saliency_score ?? 0
          const hc = heatColor(score)
          return (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="w-3 h-3 rounded shrink-0" style={{ background:hc }} />
              <span className="text-sm text-aegis-text flex-1">
                {item.label ?? item.structural_element}
              </span>
              <div className="w-20 h-1.5 bg-aegis-border rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width:`${score*100}%`, background:hc }} />
              </div>
              <span className="text-sm font-mono font-bold w-10 text-right" style={{ color:hc }}>
                {(score*100).toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function heatColor(v) {
  if (v >= 0.8) return '#ef4444'
  if (v >= 0.6) return '#f97316'
  if (v >= 0.4) return '#fbbf24'
  return '#00d4ff'
}

/* ── What-If Tab ──────────────────────────────────────────────────── */
function WhatIfTab({ cfs, risk }) {
  if (!cfs.length) return (
    <div className="p-6 text-center text-aegis-muted text-sm">No counterfactual paths available.</div>
  )
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-aegis-muted leading-relaxed">
        Contrastive XAI — shows exactly what needs to change for risk to downgrade.
        Gives commanders concrete mitigation targets, not just warnings.
      </p>
      {cfs.map((cf,i) => {
        const improve = ((cf.current_risk - cf.counterfactual_risk) / cf.current_risk * 100)
        return (
          <div key={i} className="panel overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between"
                 style={{ background:'rgba(255,255,255,0.025)', borderBottom:'1px solid #1a2d4a' }}>
              <span className="text-sm font-medium text-white">{cf.feature}</span>
              <span className="text-sm font-display text-aegis-safe">↓ {improve.toFixed(0)}% risk</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-aegis-muted mb-1">Current</p>
                  <p className="text-lg font-mono font-bold" style={{ color:riskColor(cf.current_risk) }}>
                    {cf.current_value}{cf.unit}
                  </p>
                  <p className="text-xs font-display mt-0.5" style={{ color:riskColor(cf.current_risk) }}>
                    {cf.current_severity} ({cf.current_risk.toFixed(2)})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-aegis-muted mb-1">Target</p>
                  <p className="text-lg font-mono font-bold" style={{ color:riskColor(cf.counterfactual_risk) }}>
                    {cf.target_value}{cf.unit}
                  </p>
                  <p className="text-xs font-display mt-0.5" style={{ color:riskColor(cf.counterfactual_risk) }}>
                    {cf.counterfactual_severity} ({cf.counterfactual_risk.toFixed(2)})
                  </p>
                </div>
              </div>
              <div className="px-3 py-2.5 rounded-lg flex items-start gap-2"
                   style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}>
                <Shield className="w-3.5 h-3.5 text-aegis-safe shrink-0 mt-0.5" />
                <p className="text-sm text-aegis-safe/90">{cf.mitigation_hint}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Uncertainty Tab ──────────────────────────────────────────────── */
function UncertaintyTab({ regions, quality, steps }) {
  const qColor = quality > 0.7 ? '#22c55e' : quality > 0.4 ? '#fbbf24' : '#ef4444'
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-aegis-muted leading-relaxed">
        The AI flags its own blind spots. Grey/purple regions indicate where predictions
        are uncertain — commanders should verify these areas manually.
      </p>

      {/* Image quality gauge */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-aegis-text">Post-LBP Image Quality</span>
          <span className="text-lg font-display font-bold" style={{ color:qColor }}>
            {(quality*100).toFixed(0)}%
          </span>
        </div>
        <div className="h-3 bg-aegis-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
               style={{ width:`${quality*100}%`, background:qColor }} />
        </div>
        {steps.length > 0 && (
          <div className="mt-3 space-y-1">
            {steps.map((s,i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-aegis-safe shrink-0" />
                <span className="text-xs text-aegis-muted font-mono">{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {regions.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-aegis-safe text-base font-display uppercase tracking-wider">✓ No Blind Spots Detected</div>
          <div className="text-sm text-aegis-muted mt-1">Full coverage — AI confidence is high</div>
        </div>
      ) : (
        <div className="space-y-3">
          {regions.map((r,i) => {
            const uc = r.color_code === 'purple' ? '#a855f7' : '#94a3b8'
            return (
              <div key={i} className="panel overflow-hidden" style={{ borderColor:uc+'44' }}>
                <div className="px-4 py-2.5 flex items-center justify-between"
                     style={{ background:uc+'0c', borderBottom:'1px solid '+uc+'33' }}>
                  <span className="text-sm font-display font-bold uppercase tracking-wider" style={{ color:uc }}>
                    {r.color_code === 'purple' ? 'Occlusion Blind Spot' : 'Low Confidence Zone'}
                  </span>
                  <span className="text-sm font-mono font-bold" style={{ color:uc }}>
                    {(r.uncertainty_score*100).toFixed(0)}% uncertain
                  </span>
                </div>
                <div className="p-4">
                  <div className="h-2 bg-aegis-bg rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full" style={{ width:`${r.uncertainty_score*100}%`, background:uc }} />
                  </div>
                  <p className="text-sm text-aegis-text/80 leading-relaxed">{r.reason}</p>
                  <p className="text-xs text-aegis-muted font-mono mt-2 italic">→ Manual verification required</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Conflicts Tab ────────────────────────────────────────────────── */
function ConflictsTab({ signals }) {
  if (!signals.length) return (
    <div className="p-6 text-center space-y-3">
      <div className="text-aegis-safe text-base font-display uppercase tracking-wider">✓ No Sensor Conflicts</div>
      <div className="text-sm text-aegis-muted">IoT sensors and visual analysis are in agreement</div>
    </div>
  )
  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-aegis-muted leading-relaxed">
        Cross-modal conflict detection catches malfunctioning sensors before they
        mislead commanders — the #1 real-world AI failure mode.
      </p>
      {signals.map((s,i) => (
        <div key={i} className="panel overflow-hidden" style={{ borderColor:'rgba(239,68,68,0.35)' }}>
          <div className="px-4 py-2.5 flex items-center gap-2.5"
               style={{ background:'rgba(239,68,68,0.08)', borderBottom:'1px solid rgba(239,68,68,0.25)' }}>
            <Zap className="w-4 h-4 text-aegis-critical shrink-0" />
            <span className="text-sm font-display font-bold uppercase tracking-wider text-aegis-critical">
              Conflict — {s.sensor_type}
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg" style={{ background:'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-aegis-muted mb-1 font-mono">IoT Sensor</p>
                <p className="text-lg font-mono font-bold text-white">{s.sensor_value}{s.sensor_unit}</p>
                <p className="text-xs mt-1" style={{ color:riskColor(s.sensor_implied_risk) }}>
                  Implies {(s.sensor_implied_risk*100).toFixed(0)}% risk
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background:'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-aegis-muted mb-1 font-mono">Visual (Grad-CAM)</p>
                <p className="text-lg font-mono font-bold text-white">{(s.visual_implied_risk*100).toFixed(0)}%</p>
                <p className="text-xs mt-1" style={{ color:riskColor(s.visual_implied_risk) }}>
                  Hazard confidence
                </p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-aegis-muted mb-1 font-mono">
                <span>Discrepancy</span>
                <span className="text-aegis-critical font-bold">{(s.discrepancy_score*100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-aegis-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-aegis-critical" style={{ width:`${s.discrepancy_score*100}%` }} />
              </div>
            </div>
            <p className="text-sm text-aegis-text/80 leading-relaxed">{s.message}</p>
            <div className="px-3 py-2.5 rounded-lg text-sm flex items-start gap-2"
                 style={{ background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)' }}>
              <Activity className="w-3.5 h-3.5 text-aegis-warn shrink-0 mt-0.5" />
              <span className="text-aegis-warn/90">{s.recommended_action}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Reasoning Trace Tab ──────────────────────────────────────────── */
function TraceTab({ steps }) {
  const TAG_STYLES = {
    '[SCAN]':          { color:'#00d4ff',  icon:'📡' },
    '[PREPROCESS]':    { color:'#a855f7',  icon:'🔬' },
    '[DETECT]':        { color:'#f97316',  icon:'⚡' },
    '[CORRELATE]':     { color:'#fbbf24',  icon:'🔗' },
    '[CONFLICT':       { color:'#ef4444',  icon:'⚠️' },
    '[VALIDATE]':      { color:'#22c55e',  icon:'✓'  },
    '[FUSE]':          { color:'#3b82f6',  icon:'🧬' },
    '[UNCERTAINTY]':   { color:'#94a3b8',  icon:'👁' },
    '[SCORE]':         { color:'#fbbf24',  icon:'📊' },
    '[COUNTERFACTUAL]':{ color:'#34d399',  icon:'↔' },
    '[RECOMMEND]':     { color:'#22c55e',  icon:'📋' },
    '[AWAIT]':         { color:'#cbd5e1',  icon:'🔐' },
  }

  const getStyle = (step) => {
    for (const [tag, style] of Object.entries(TAG_STYLES)) {
      if (step.startsWith(tag)) return style
    }
    return { color:'#4a6080', icon:'•' }
  }

  const getTag  = (step) => step.split(']')[0] + ']'
  const getBody = (step) => step.slice(step.indexOf(']') + 1).trim()

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-aegis-muted leading-relaxed">
        Step-by-step reasoning — how the AI arrived at this recommendation.
        Every physical action requires commander authorization.
      </p>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-aegis-border" />
        {steps.map((step, i) => {
          const style = getStyle(step)
          const tag   = getTag(step)
          const body  = getBody(step)
          return (
            <div key={i} className="relative flex gap-4 pb-4" style={{ animationDelay:`${i*50}ms` }}>
              <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border text-base"
                   style={{ background:style.color+'15', borderColor:style.color+'40' }}>
                {style.icon}
              </div>
              <div className="flex-1 pt-2 min-w-0">
                <span className="text-xs font-display font-bold mr-1.5" style={{ color:style.color }}>
                  {tag}
                </span>
                <span className="text-sm text-aegis-text/85 font-mono leading-relaxed">{body}</span>
              </div>
            </div>
          )
        })}

        {/* Terminal node */}
        <div className="relative z-10 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-aegis-safe/15 border border-aegis-safe/40 shrink-0">
            <CheckCircle className="w-5 h-5 text-aegis-safe" />
          </div>
          <span className="text-sm font-display font-bold text-aegis-safe uppercase tracking-wider">
            Awaiting Commander Authorization
          </span>
        </div>
      </div>
    </div>
  )
}
