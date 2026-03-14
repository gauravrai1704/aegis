/**
 * Aegis-X — NATO SMEAC Mission Briefing
 */
import React, { useEffect, useState } from 'react'
import { FileText, Download, Shield, Target, Zap, Package, Radio, RefreshCw } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { riskColor, scenarioColor } from '../utils/helpers'

const SMEAC = {
  S: { label:'Situation',        icon:Shield,   color:'#f97316' },
  M: { label:'Mission',          icon:Target,   color:'#00d4ff' },
  E: { label:'Execution',        icon:Zap,      color:'#fbbf24' },
  A: { label:'Admin & Logistics',icon:Package,  color:'#a855f7' },
  C: { label:'Command & Signal', icon:Radio,    color:'#22c55e' },
}

export default function BriefingPage() {
  const { activeAlert, briefing, briefingLoading, setBriefing, setBriefingLoading, scenario } = useAegisStore()
  const [section, setSection] = useState('S')
  const color = scenarioColor(scenario)

  const load = async (id) => {
    if (!id) return
    setBriefingLoading(true)
    try { setBriefing(await api.getBriefing(id)) } catch {}
    setBriefingLoading(false)
  }

  useEffect(() => {
    if (activeAlert?.id) load(activeAlert.id)
  }, [activeAlert?.id])

  // ── Empty state ──────────────────────────────────────────
  if (!activeAlert) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <FileText className="w-12 h-12 text-aegis-muted/40 mx-auto" strokeWidth={1} />
        <div>
          <p className="text-sm text-aegis-muted">Select an alert to generate briefing</p>
          <p className="text-xs text-aegis-accent/50 font-display uppercase tracking-wider mt-1">
            NATO SMEAC Format
          </p>
        </div>
      </div>
    </div>
  )

  // ── Loading state ────────────────────────────────────────
  if (briefingLoading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor:color }} />
        <span className="text-sm text-aegis-muted">Generating mission briefing…</span>
      </div>
    </div>
  )

  if (!briefing) return (
    <div className="h-full flex items-center justify-center">
      <button onClick={() => load(activeAlert.id)}
        className="btn-primary flex items-center gap-2">
        <FileText className="w-4 h-4" /> Generate Briefing
      </button>
    </div>
  )

  const b = briefing

  const exportText = () => {
    const text = [
      `AEGIS-X MISSION BRIEFING — ${b.format}`,
      `Alert: ${b.alert_id} | Sector: ${b.sector} | Severity: ${b.severity}`,
      `Generated: ${new Date(b.generated).toLocaleString()}`,
      ``,
      `━━━ SITUATION ━━━`,
      b.situation.threat,
      `Primary Driver: ${b.situation.primary_driver}`,
      `Confidence: ${b.situation.model_confidence} | Reliability: ${b.situation.xai_reliability}`,
      b.situation.caution,
      ``,
      `━━━ MISSION ━━━`,
      b.mission.objective,
      ...(b.mission.priority_actions||[]).map(a => `  [P${a.priority}] ${a.action} — ${a.unit}`),
      ``,
      `━━━ EXECUTION ━━━`,
      ...(b.execution.mitigation_targets||[]).map(t => `  ${t.target}: ${t.current} → ${t.required}\n  ${t.action}`),
      b.execution.spread_warning || '',
      ``,
      `━━━ ADMIN ━━━`,
      ...(b.admin.uncertainty_zones||[]).map(z => `  ${z.reason}`),
      ``,
      `━━━ COMMAND ━━━`,
      b.command.decision_authority,
      b.command.ai_role,
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text],{type:'text/plain'}))
    a.download = `briefing_${b.alert_id}.txt`
    a.click()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" data-scenario={scenario}>

      {/* ── Header bar ──────────────────────────────────────── */}
      <div className="panel-header shrink-0 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4" style={{ color }} />
          <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
            Mission Briefing
          </span>
          <span className="text-xs font-display px-2 py-0.5 rounded border border-aegis-border text-aegis-muted">
            {b.format}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-aegis-muted font-mono">
            {b.sector} · {b.severity}
          </span>
          <button onClick={() => load(activeAlert.id)}
            className="text-aegis-muted hover:text-aegis-text transition-colors p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportText} className="btn-ghost flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── SMEAC section tabs ──────────────────────────────── */}
      <div className="flex border-b border-aegis-border shrink-0">
        {Object.entries(SMEAC).map(([key, cfg]) => {
          const Icon = cfg.icon
          const active = section === key
          return (
            <button key={key} onClick={() => setSection(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                active ? 'border-b-2' : 'text-aegis-muted hover:text-aegis-text'
              }`}
              style={ active ? { borderColor:cfg.color, color:cfg.color } : {} }>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-display uppercase tracking-wider">{key}</span>
            </button>
          )
        })}
      </div>

      {/* ── Section header ──────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-aegis-border/50 flex items-center gap-2 shrink-0"
           style={{ background:SMEAC[section].color+'08' }}>
        {React.createElement(SMEAC[section].icon, { className:'w-4 h-4', style:{ color:SMEAC[section].color } })}
        <span className="font-display text-sm font-bold uppercase tracking-wider"
              style={{ color:SMEAC[section].color }}>
          {SMEAC[section].label}
        </span>
      </div>

      {/* ── Section content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        {section === 'S' && <SituationSection s={b.situation} />}
        {section === 'M' && <MissionSection   m={b.mission}   />}
        {section === 'E' && <ExecutionSection e={b.execution} />}
        {section === 'A' && <AdminSection     a={b.admin}     />}
        {section === 'C' && <CommandSection   c={b.command}   />}
      </div>
    </div>
  )
}

/* ── Section components ─────────────────────────────────────────── */

function Row({ label, value, valueColor }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-aegis-border/40">
      <span className="text-sm text-aegis-muted w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium" style={ valueColor ? { color:valueColor } : { color:'#e2e8f0' } }>
        {value}
      </span>
    </div>
  )
}

function SituationSection({ s }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ background:'rgba(249,115,22,0.07)', border:'1px solid rgba(249,115,22,0.2)' }}>
        <p className="text-sm leading-relaxed text-white/90">{s.threat}</p>
      </div>
      {s.sensor_conflicts > 0 && (
        <div className="p-3 rounded-xl" style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm text-aegis-critical font-medium">⚠ {s.caution}</p>
        </div>
      )}
      <Row label="Primary Driver"   value={s.primary_driver} />
      <Row label="Confidence"       value={s.model_confidence} />
      <Row label="XAI Reliability"  value={s.xai_reliability} />
      <Row label="Sensor Conflicts" value={`${s.sensor_conflicts} detected`} />
      <Row label="AI Blind Spots"   value={`${s.ai_blind_spots} flagged`} />
      <Row label="Image Quality"    value={s.image_quality} />
    </div>
  )
}

function MissionSection({ m }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.15)' }}>
        <p className="text-sm leading-relaxed text-white/90">{m.objective}</p>
      </div>
      <div>
        <p className="text-sm text-aegis-muted uppercase tracking-wider font-mono mb-3">Priority Actions</p>
        <div className="space-y-3">
          {(m.priority_actions||[]).map((a,i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-aegis-border/40">
              <span className="text-xs font-display px-2 py-1 border border-aegis-border rounded text-aegis-muted shrink-0">
                P{a.priority}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white leading-snug">{a.action}</p>
                <p className="text-xs text-aegis-muted font-mono mt-1">{a.unit} · {a.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExecutionSection({ e }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-aegis-muted uppercase tracking-wider font-mono">Mitigation Targets (Counterfactual)</p>
      {(e.mitigation_targets||[]).map((t,i) => (
        <div key={i} className="panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-display font-bold text-white">{t.target}</span>
            <span className="text-sm font-mono text-aegis-safe">{t.current} → {t.required}</span>
          </div>
          <p className="text-sm text-aegis-accent">{t.expected_outcome}</p>
          <p className="text-sm text-aegis-muted">{t.action}</p>
        </div>
      ))}
      {e.spread_warning && (
        <div className="p-4 rounded-xl" style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)' }}>
          <p className="text-sm text-aegis-gold/90 leading-relaxed">{e.spread_warning}</p>
        </div>
      )}
    </div>
  )
}

function AdminSection({ a }) {
  return (
    <div className="space-y-4">
      {(a.uncertainty_zones||[]).length > 0 && (
        <div>
          <p className="text-sm text-aegis-muted uppercase tracking-wider font-mono mb-3">AI Uncertainty Zones</p>
          {a.uncertainty_zones.map((z,i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-aegis-border/40">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 mt-1 shrink-0" />
              <p className="text-sm text-aegis-text/80">{z.reason}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <p className="text-sm text-aegis-muted uppercase tracking-wider font-mono mb-3">Pre-Processing Applied</p>
        {(a.preprocessing_applied||[]).map((s,i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-aegis-safe shrink-0" />
            <p className="text-sm text-aegis-text/80 font-mono">{s}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommandSection({ c }) {
  return (
    <div className="space-y-0">
      <Row label="Decision Authority" value={c.decision_authority} />
      <Row label="AI Role"            value={c.ai_role} />
      <Row label="Override Protocol"  value={c.override_protocol} />
      <Row label="AI System"          value={c.ai_system} />
      <Row label="Classification"     value={c.classification} valueColor="#22c55e" />
      <Row label="Alert ID"           value={c.alert_id} />
      <Row label="Generated"          value={new Date(c.briefing_generated).toLocaleString()} />
    </div>
  )
}
