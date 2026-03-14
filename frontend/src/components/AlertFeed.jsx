/**
 * Aegis-X Alert Feed — v3.1
 */
import React from 'react'
import { Bell, ChevronRight, Clock, Zap } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { severityColor, severityBg, formatRelative, scenarioColor, scenarioIcon } from '../utils/helpers'
import clsx from 'clsx'

export default function AlertFeed() {
  const { alerts, setActiveAlert, activeAlert, scenario } = useAegisStore()
  const color = scenarioColor(scenario)

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4" style={{ color }} />
          <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
            Alert Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <div className="w-2 h-2 rounded-full bg-aegis-critical" style={{ animation:'pulse2 1.5s ease-in-out infinite' }} />
          )}
          <span className="text-xs text-aegis-muted font-mono">{alerts.length} total</span>
        </div>
      </div>

      {/* Feed */}
      {alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
               style={{ background: color+'15', border:`1px solid ${color}30` }}>
            <Bell className="w-6 h-6 opacity-40" style={{ color }} />
          </div>
          <div>
            <p className="text-sm text-aegis-muted">Monitoring active</p>
            <p className="text-xs text-aegis-muted/60 mt-1">Alerts appear here in real-time</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {alerts.map((alert, i) => (
            <AlertCard key={alert.id} alert={alert} index={i}
              isActive={activeAlert?.id === alert.id}
              onClick={() => setActiveAlert(alert)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert, isActive, onClick, index }) {
  const col    = severityColor(alert.severity)
  const sIcon  = scenarioIcon(alert.hazard_type)
  const hasConflict = (alert.xai_explanation?.conflict_signals?.length || 0) > 0

  return (
    <button onClick={onClick}
      className={clsx(
        'w-full text-left border-b transition-colors duration-100 anim-slide-up',
        'hover:bg-white/[0.025]',
        isActive ? 'bg-aegis-accent/[0.04]' : ''
      )}
      style={{
        borderBottomColor: 'rgba(26,45,74,0.5)',
        borderLeft: isActive ? `3px solid ${col}` : '3px solid transparent',
        animationDelay: `${Math.min(index * 35, 300)}ms`,
        padding: '13px 18px',
      }}>
      <div className="flex items-start gap-3">
        {/* Hazard icon */}
        <div className="text-2xl leading-none mt-0.5 shrink-0">{sIcon}</div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-white leading-snug">
              {alert.title}
            </p>
            <ChevronRight className="w-4 h-4 text-aegis-muted shrink-0 mt-0.5" />
          </div>

          {/* Sector + summary */}
          <p className="text-xs text-aegis-muted font-mono mb-2.5 truncate">
            Sector {alert.sector} · {(alert.xai_explanation?.summary || '').slice(0, 52)}…
          </p>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
            <span className="badge" style={{
              borderColor: alert.status === 'pending' ? '#00d4ff40' : alert.status === 'approved' ? '#22c55e40' : '#f9731640',
              background:  alert.status === 'pending' ? 'rgba(0,212,255,0.08)' : alert.status === 'approved' ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.08)',
              color:       alert.status === 'pending' ? '#00d4ff' : alert.status === 'approved' ? '#22c55e' : '#f97316',
            }}>
              {alert.status}
            </span>
            {hasConflict && (
              <span className="badge badge-critical">
                <Zap className="w-2.5 h-2.5" />conflict
              </span>
            )}
            <span className="text-xs text-aegis-muted ml-auto flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {formatRelative(alert.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
