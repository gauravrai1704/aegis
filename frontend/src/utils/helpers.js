/**
 * Aegis-X Utility Helpers — v3.0
 */

export const SCENARIO_COLORS = {
  flood:      '#3b82f6',
  wildfire:   '#f97316',
  earthquake: '#8b5cf6',
  tsunami:    '#06b6d4',
  cyclone:    '#a855f7',
  landslide:  '#78716c',
  volcanic:   '#dc2626',
}
export const SCENARIO_ICONS = {
  flood:'🌊', wildfire:'🔥', earthquake:'🌍',
  tsunami:'🌐', cyclone:'🌀', landslide:'⛰️', volcanic:'🌋',
}

export function scenarioColor(s) { return SCENARIO_COLORS[s] || '#00d4ff' }
export function scenarioIcon(s)  { return SCENARIO_ICONS[s]  || '⚠️'     }

export function riskColor(score) {
  if (score >= 0.8) return '#ef4444'
  if (score >= 0.6) return '#f97316'
  if (score >= 0.3) return '#fbbf24'
  return '#22c55e'
}
export function riskLabel(score) {
  if (score >= 0.8) return 'CRITICAL'
  if (score >= 0.6) return 'HIGH'
  if (score >= 0.3) return 'MEDIUM'
  return 'LOW'
}
export function severityColor(sev) {
  return { critical:'#ef4444', high:'#f97316', medium:'#fbbf24', low:'#22c55e' }[sev] || '#4a6080'
}
export function severityBg(sev) {
  return { critical:'rgba(239,68,68,0.12)', high:'rgba(249,115,22,0.12)',
           medium:'rgba(251,191,36,0.12)',  low:'rgba(34,197,94,0.12)' }[sev] || 'transparent'
}
export function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US',{ hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' })
}
export function formatRelative(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}
