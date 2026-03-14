/**
 * Aegis-X — Live Public Data Panel
 * USGS · GDACS · NOAA · NASA FIRMS
 */
import React, { useEffect, useState } from 'react'
import { Satellite, RefreshCw, AlertTriangle, Globe, Flame } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { scenarioColor } from '../utils/helpers'

const GDACS_COLS = { Green:'#22c55e', Orange:'#f97316', Red:'#ef4444' }
const GDACS_ICONS = { EQ:'🌍', FL:'🌊', TC:'🌀', VO:'🌋', TS:'🌐', DR:'☀️' }

export default function RealDataPanel() {
  const { scenario, realData, setRealData } = useAegisStore()
  const [loading, setLoading] = useState(false)
  const color = scenarioColor(scenario)

  const load = async () => {
    setLoading(true)
    try { setRealData(await api.getRealData()) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [scenario])

  const totalEvents =
    (realData?.usgs_earthquakes?.length   || 0) +
    (realData?.gdacs_events?.length        || 0) +
    (realData?.noaa_alerts?.length         || 0) +
    (realData?.nasa_firms_hotspots?.length || 0)

  return (
    <div className="panel h-full flex flex-col" data-scenario={scenario}>
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <Satellite className="w-4 h-4" style={{ color }} />
          <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
            Live Public Data
          </span>
          <span className="text-xs font-mono text-aegis-muted">No API key required</span>
        </div>
        <div className="flex items-center gap-3">
          {totalEvents > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:color }} />
              <span className="text-sm font-mono text-aegis-muted">{totalEvents} events</span>
            </div>
          )}
          <button onClick={load} disabled={loading}
            className="text-aegis-muted hover:text-aegis-text transition-colors p-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {!realData ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="shimmer-box h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Section: USGS Earthquakes */}
            {realData.usgs_earthquakes?.length > 0 && (
              <Section title="USGS Earthquakes" icon="🌍" color="#8b5cf6">
                {realData.usgs_earthquakes.slice(0,5).map((eq,i) => (
                  <EQCard key={i} eq={eq} />
                ))}
              </Section>
            )}

            {/* Section: GDACS Global Alerts */}
            {realData.gdacs_events?.length > 0 && (
              <Section title="GDACS Global Alerts" icon="🌐" color="#06b6d4">
                {realData.gdacs_events.slice(0,6).map((ev,i) => (
                  <GDACSCard key={i} ev={ev} />
                ))}
              </Section>
            )}

            {/* Section: NOAA Weather */}
            {realData.noaa_alerts?.length > 0 && (
              <Section title="NOAA Active Alerts" icon="🌩" color="#3b82f6">
                {realData.noaa_alerts.slice(0,4).map((a,i) => (
                  <NOAACard key={i} alert={a} />
                ))}
              </Section>
            )}

            {/* Section: NASA FIRMS Fire Hotspots */}
            {realData.nasa_firms_hotspots?.length > 0 && (
              <Section title="NASA FIRMS Hotspots" icon="🔥" color="#f97316">
                {realData.nasa_firms_hotspots.slice(0,4).map((h,i) => (
                  <FIRMSCard key={i} hotspot={h} />
                ))}
              </Section>
            )}

            {totalEvents === 0 && (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <Globe className="w-10 h-10 text-aegis-muted/30" strokeWidth={1} />
                <p className="text-sm text-aegis-muted">No active events for this scenario</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {realData && (
        <div className="px-4 py-2.5 border-t border-aegis-border">
          <p className="text-xs text-aegis-muted font-mono truncate">
            Sources: {realData.sources?.join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, color, children }) {
  return (
    <div>
      <div className="px-4 py-2.5 flex items-center gap-2 sticky top-0 z-10"
           style={{ background:'rgba(8,15,28,0.92)', backdropFilter:'blur(8px)',
                    borderBottom:'1px solid rgba(26,45,74,0.6)' }}>
        <span className="text-base leading-none">{icon}</span>
        <span className="text-xs font-display font-bold uppercase tracking-wider" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="divide-y divide-aegis-border/30">{children}</div>
    </div>
  )
}

function EQCard({ eq }) {
  const mag  = parseFloat(eq.magnitude) || 0
  const col  = mag >= 7.5 ? '#ef4444' : mag >= 6 ? '#f97316' : '#fbbf24'
  return (
    <div className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-display text-sm font-bold"
             style={{ background:col+'18', border:`1px solid ${col}40`, color:col }}>
          M{mag.toFixed(1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {eq.tsunami === 1 && (
              <span className="text-xs badge badge-critical">TSUNAMI</span>
            )}
            <span className="text-xs text-aegis-muted font-mono">USGS</span>
          </div>
          <p className="text-sm font-medium text-aegis-text">{eq.place}</p>
          <p className="text-xs text-aegis-muted font-mono mt-0.5">
            Depth {eq.depth_km}km · {new Date(eq.time).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}

function GDACSCard({ ev }) {
  const col  = GDACS_COLS[ev.alertlevel] || '#94a3b8'
  const icon = GDACS_ICONS[ev.eventtype] || '⚠️'
  return (
    <div className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
             style={{ background:col+'15', border:`1px solid ${col}35` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-display font-bold uppercase" style={{ color:col }}>
              {ev.alertlevel}
            </span>
            <span className="text-xs text-aegis-muted">{ev.country}</span>
            <span className="text-xs text-aegis-muted font-mono ml-auto">GDACS</span>
          </div>
          <p className="text-sm text-aegis-text leading-snug">
            {ev.title || `${ev.eventtype} event`}
          </p>
        </div>
      </div>
    </div>
  )
}

function NOAACard({ alert }) {
  const COLS = { Extreme:'#ef4444', Severe:'#f97316', Moderate:'#fbbf24', Minor:'#22c55e' }
  const col  = COLS[alert.severity] || '#94a3b8'
  return (
    <div className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color:col }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-display font-bold uppercase" style={{ color:col }}>
              {alert.severity}
            </span>
            <span className="text-xs text-aegis-muted font-mono ml-auto">NOAA NWS</span>
          </div>
          <p className="text-sm font-medium text-aegis-text">{alert.event}</p>
          <p className="text-xs text-aegis-muted mt-0.5 truncate">{alert.areaDesc}</p>
        </div>
      </div>
    </div>
  )
}

function FIRMSCard({ hotspot }) {
  const frp = parseFloat(hotspot.frp) || 10
  const col  = frp > 100 ? '#ef4444' : frp > 30 ? '#f97316' : '#fbbf24'
  return (
    <div className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
             style={{ background:col+'15', border:`1px solid ${col}35` }}>
          🔥
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-display font-bold" style={{ color:col }}>
              {frp.toFixed(0)} MW FRP
            </span>
            <span className="text-xs text-aegis-muted font-mono ml-auto">NASA FIRMS</span>
          </div>
          <p className="text-sm text-aegis-text font-mono">
            {hotspot.latitude?.toFixed(3)}°N, {hotspot.longitude?.toFixed(3)}°E
          </p>
          <p className="text-xs text-aegis-muted mt-0.5 font-mono">
            Brightness: {hotspot.brightness}K · {hotspot.confidence}
          </p>
        </div>
      </div>
    </div>
  )
}
