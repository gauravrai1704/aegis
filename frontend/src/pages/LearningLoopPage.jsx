/**
 * Aegis-X — Active Learning Loop Dashboard
 */
import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, RefreshCw, Download, CheckCircle,
  Clock, Zap, Brain, Database, RotateCcw,
} from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'

const STAGE_COLOR = { complete:'#22c55e', active:'#00d4ff', pending:'#4a6080' }

export default function LearningLoopPage() {
  const { learningLoop, setLearningLoop } = useAegisStore()
  const [loading,  setLoading]  = useState(false)
  const [auditLog, setAuditLog] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [ll, audit] = await Promise.all([api.getLearningLoop(), api.getAuditLog(25)])
      setLearningLoop(ll)
      setAuditLog(audit)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (!learningLoop) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-aegis-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-aegis-muted">Loading Learning Loop…</span>
      </div>
    </div>
  )

  const ll = learningLoop
  const batchPct = ((ll.total_overrides % 10) / 10) * 100

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="w-5 h-5 text-aegis-accent" />
            <h2 className="font-display text-lg font-bold uppercase tracking-widest text-aegis-accent">
              Active Learning Loop
            </h2>
          </div>
          <p className="text-sm text-aegis-muted max-w-xl">
            Every commander override becomes a labeled training sample fed into the
            XGBoost retraining pipeline — the AI improves with each human decision.
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-ghost flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Decisions', value:ll.total_decisions,          color:'#00d4ff' },
          { label:'Overrides',       value:ll.total_overrides,          color:'#ef4444' },
          { label:'Override Rate',   value:`${ll.override_rate_pct}%`,  color:'#fbbf24' },
          { label:'Est. Accuracy',   value:`${ll.estimated_accuracy}%`, color:'#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full opacity-10"
                   style={{ background:color }} />
            </div>
            <span className="stat-label">{label}</span>
            <span className="stat-value" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Accuracy trend chart ─────────────────────────────── */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-aegis-accent" />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-accent">
              Model Accuracy Trend
            </span>
          </div>
          <span className="text-sm text-aegis-muted">
            Improves with each retrain cycle
          </span>
        </div>
        <div style={{ height:180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ll.performance_trend} margin={{ left:0, right:20, top:4, bottom:4 }}>
              <XAxis dataKey="total_decisions"
                tick={{ fontSize:11, fill:'#4a6080' }} axisLine={false} tickLine={false} />
              <YAxis domain={[50,100]}
                tick={{ fontSize:11, fill:'#4a6080' }} axisLine={false} tickLine={false} />
              <Tooltip content={<PerfTooltip />} />
              <ReferenceLine y={80} stroke="rgba(34,197,94,0.25)" strokeDasharray="5 4" />
              <Line type="monotone" dataKey="accuracy" stroke="#00d4ff" strokeWidth={2.5}
                dot={false} activeDot={{ r:5, fill:'#00d4ff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-aegis-muted text-right mt-1 font-mono">
          — — — 80% target accuracy threshold
        </p>
      </div>

      {/* ── Clusters + Feature blame ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Override reason clusters */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-aegis-accent" />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-accent">
              Override Clusters
            </span>
          </div>
          <p className="text-sm text-aegis-muted mb-4">
            NLP clustering of commander reasons — reveals systematic AI blind spots.
          </p>
          {ll.reason_clusters.some(r => r.count > 0) ? (
            <div className="space-y-3">
              {ll.reason_clusters.map((r,i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background:r.color }} />
                  <span className="text-sm text-aegis-text flex-1 truncate">{r.cluster}</span>
                  <div className="w-28 h-2 bg-aegis-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{ width:`${Math.max(4,(r.count/Math.max(1,ll.total_overrides))*100)}%`, background:r.color }} />
                  </div>
                  <span className="text-sm font-mono font-bold w-5 text-right" style={{ color:r.color }}>
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-aegis-muted">No overrides yet.</p>
              <p className="text-xs text-aegis-muted/60 mt-1">Override an alert to populate.</p>
            </div>
          )}
        </div>

        {/* Feature blame */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-aegis-accent" />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-accent">
              Feature Blame
            </span>
          </div>
          <p className="text-sm text-aegis-muted mb-4">
            SHAP features commanders most often disagreed with.
          </p>
          {Object.keys(ll.feature_blame).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(ll.feature_blame).map(([feat,count],i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-aegis-text flex-1 truncate">{feat}</span>
                  <div className="w-28 h-2 bg-aegis-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-aegis-warn"
                         style={{ width:`${(count/Math.max(1,ll.total_overrides))*100}%` }} />
                  </div>
                  <span className="text-sm font-mono font-bold text-aegis-warn w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-aegis-muted">No feature blame data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Retraining pipeline ──────────────────────────────── */}
      <div className="panel p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="w-4 h-4 text-aegis-accent" />
              <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-accent">
                Retraining Pipeline
              </span>
            </div>
            <p className="text-sm text-aegis-muted">
              {ll.active_learning_framing.method} — {ll.active_learning_framing.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-aegis-muted font-mono">Batch {ll.current_batch}</p>
            <p className="text-sm font-display text-aegis-accent mt-0.5">
              {ll.samples_until_retrain} samples until retrain
            </p>
          </div>
        </div>

        {/* Batch progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-aegis-muted font-mono mb-1.5">
            <span>Batch {ll.current_batch} — {ll.total_overrides % 10}/10 samples</span>
            <span>{batchPct.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-aegis-bg rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-aegis-accent transition-all duration-700 relative overflow-hidden"
                 style={{ width:`${batchPct}%` }}>
              <div className="absolute inset-0 opacity-40"
                   style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)', animation:'shimmer 2s linear infinite', backgroundSize:'200% 100%' }} />
            </div>
          </div>
        </div>

        {/* Pipeline stages — horizontal scrollable */}
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {ll.retraining_pipeline.map((stage,i) => {
            const c = STAGE_COLOR[stage.status]
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2 shrink-0 w-28 text-center px-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border"
                       style={{ borderColor:c+'50', background:c+'12' }}>
                    {stage.status === 'complete'
                      ? <CheckCircle className="w-5 h-5" style={{ color:c }} />
                      : stage.status === 'active'
                      ? <div className="w-3 h-3 rounded-full animate-pulse" style={{ background:c }} />
                      : <Clock className="w-4 h-4" style={{ color:c }} />}
                  </div>
                  <p className="text-xs font-display leading-tight" style={{ color:c }}>
                    {stage.stage}
                  </p>
                  <p className="text-xs text-aegis-muted leading-tight line-clamp-2">
                    {stage.desc}
                  </p>
                </div>
                {i < ll.retraining_pipeline.length - 1 && (
                  <div className="w-5 h-px mt-5 shrink-0"
                       style={{ background:STAGE_COLOR[ll.retraining_pipeline[i+1]?.status]+'50' }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Audit Log ───────────────────────────────────────── */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-aegis-accent" />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-accent">
              Commander Decision Audit Log
            </span>
          </div>
          <button onClick={() => {
              const blob = new Blob([JSON.stringify(auditLog,null,2)],{type:'application/json'})
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'aegis_audit_log.json'
              a.click()
            }}
            className="btn-ghost flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>

        {auditLog.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-aegis-muted">No decisions logged yet.</p>
            <p className="text-xs text-aegis-muted/60 mt-1">Approve or override an alert to populate.</p>
          </div>
        ) : (
          <div className="space-y-0 max-h-56 overflow-y-auto">
            {auditLog.map((entry,i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-aegis-border/40">
                <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background:entry.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="text-sm font-display font-bold" style={{ color:entry.color }}>
                      {entry.type}
                    </span>
                    <span className="text-xs text-aegis-muted font-mono">
                      Sector {entry.sector}
                    </span>
                    <span className="text-xs text-aegis-muted font-mono">
                      Risk {entry.risk_score?.toFixed(2)}
                    </span>
                  </div>
                  {entry.commander_reason && (
                    <p className="text-sm text-aegis-muted/70 truncate">"{entry.commander_reason}"</p>
                  )}
                </div>
                <span className="text-xs text-aegis-muted font-mono shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PerfTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="panel px-3 py-2.5 text-xs shadow-2xl">
      <p className="text-aegis-accent font-mono">Accuracy: {d.accuracy}%</p>
      <p className="text-aegis-muted font-mono">Override rate: {d.override_rate}%</p>
      <p className="text-aegis-muted font-mono">Decisions: {d.total_decisions}</p>
    </div>
  )
}
