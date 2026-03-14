/**
 * Aegis-X Real Map — Leaflet (npm) + Dark CartoDB Tiles
 * Properly imported from npm — no window.L dependency.
 * Uses CartoDB Dark Matter tiles (free, no key, renders beautifully dark).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Map, RefreshCw, AlertTriangle } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { riskColor, riskLabel, scenarioColor } from '../utils/helpers'

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SECTOR_COORDS = {
  A1: { lat:29.770, lng:-95.380, name:'Riverside District',  pop:12400 },
  A2: { lat:29.760, lng:-95.370, name:'Downtown Core',       pop:45000 },
  B1: { lat:29.750, lng:-95.400, name:'Industrial Corridor', pop:3200  },
  B2: { lat:29.780, lng:-95.360, name:'Bayou Heights',       pop:8900  },
  C1: { lat:29.740, lng:-95.350, name:'East Medical Center', pop:21000 },
  C2: { lat:29.760, lng:-95.420, name:'Westchase Zone',      pop:15600 },
  D1: { lat:29.730, lng:-95.330, name:'Port Terminal',       pop:1800  },
  D2: { lat:29.800, lng:-95.390, name:'North Woodland',      pop:9700  },
}

const SCENARIO_CENTERS = {
  flood:      { lat:29.76,  lng:-95.37, zoom:12 },
  wildfire:   { lat:37.77,  lng:-122.41,zoom:10 },
  earthquake: { lat:35.68,  lng:139.69, zoom:9  },
  tsunami:    { lat:35.68,  lng:139.69, zoom:8  },
  cyclone:    { lat:14.59,  lng:121.00, zoom:8  },
  landslide:  { lat:27.71,  lng:85.31,  zoom:10 },
  volcanic:   { lat:-8.34,  lng:115.51, zoom:11 },
}

// Tile providers — all free, no API key
const TILE_PROVIDERS = {
  dark: {
    url:   'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr:  '© CartoDB · © OpenStreetMap contributors',
    label: 'Dark',
  },
  osm: {
    url:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr:  '© OpenStreetMap contributors',
    label: 'Street',
  },
  topo: {
    url:   'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr:  '© OpenTopoMap contributors',
    label: 'Topo',
  },
}

export default function RealMap() {
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const tileLayerRef   = useRef(null)
  const overlayRef     = useRef(null)

  const { riskScores, setRiskScores, setActiveAlert, scenario, realData, alerts } = useAegisStore()
  const [loading,   setLoading]   = useState(false)
  const [analyzing, setAnalyzing] = useState(null)
  const [tileKey,   setTileKey]   = useState('dark')
  const color = scenarioColor(scenario)

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return
    if (!mapRef.current) return

    const center = SCENARIO_CENTERS[scenario] || SCENARIO_CENTERS.flood
    const map = L.map(mapRef.current, {
      center:             [center.lat, center.lng],
      zoom:               center.zoom,
      zoomControl:        false,
      attributionControl: false,
    })

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)

    // Dark CartoDB tile layer — the key fix
    const tile = L.tileLayer(TILE_PROVIDERS.dark.url, {
      attribution:       TILE_PROVIDERS.dark.attr,
      subdomains:        'abcd',
      maxZoom:           19,
      crossOrigin:       true,
    })
    tile.addTo(map)
    tileLayerRef.current  = tile
    overlayRef.current    = L.layerGroup().addTo(map)
    mapInstanceRef.current = map

    // Force a size recalculation after mount
    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      tileLayerRef.current   = null
      overlayRef.current     = null
    }
  }, []) // eslint-disable-line

  // ── Swap tile layer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !tileLayerRef.current) return
    map.removeLayer(tileLayerRef.current)
    const p   = TILE_PROVIDERS[tileKey]
    const tile = L.tileLayer(p.url, {
      attribution: p.attr,
      subdomains:  tileKey === 'dark' ? 'abcd' : 'abc',
      maxZoom:     19,
      crossOrigin: true,
    })
    tile.addTo(map)
    tileLayerRef.current = tile
  }, [tileKey])

  // ── Pan to scenario centre on switch ────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    const c = SCENARIO_CENTERS[scenario] || SCENARIO_CENTERS.flood
    map.flyTo([c.lat, c.lng], c.zoom, { duration: 1.2 })
  }, [scenario])

  // ── Redraw overlays ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map     = mapInstanceRef.current
    const overlay = overlayRef.current
    if (!map || !overlay) return

    overlay.clearLayers()

    const sectorRisks = { ...riskScores }

    // Sector circles
    Object.entries(SECTOR_COORDS).forEach(([id, pos]) => {
      const risk  = sectorRisks[id] ?? 0.15
      const col   = riskColor(risk)
      const isAna = analyzing === id

      // Outer pulse ring (risk zone)
      L.circle([pos.lat, pos.lng], {
        radius:      600 + risk * 1400,
        color:       col,
        fillColor:   col,
        fillOpacity: 0.06 + risk * 0.12,
        weight:      0,
        interactive: false,
      }).addTo(overlay)

      // Sector circle (clickable)
      const ring = L.circle([pos.lat, pos.lng], {
        radius:      350,
        color:       col,
        fillColor:   col,
        fillOpacity: 0.22 + risk * 0.18,
        weight:      isAna ? 3 : 1.5,
        dashArray:   isAna ? '6 4' : null,
      })
      ring.bindPopup(sectorPopupHTML(id, pos, risk, col), {
        maxWidth: 260,
        className: 'aegis-popup',
      })
      ring.on('click', () => handleSectorClick(id))
      ring.addTo(overlay)

      // Sector label via DivIcon
      const labelIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            display:flex;flex-direction:column;align-items:center;gap:2px;
            pointer-events:none;
          ">
            <div style="
              font-family:'Orbitron',monospace;font-size:11px;font-weight:700;
              color:${col};text-shadow:0 0 10px ${col}99,0 1px 3px rgba(0,0,0,0.9);
              background:rgba(4,8,15,0.82);padding:2px 7px;border-radius:5px;
              border:1px solid ${col}55;letter-spacing:0.1em;
            ">${id}</div>
            <div style="
              font-family:'IBM Plex Mono',monospace;font-size:10px;
              color:${col}cc;text-shadow:0 1px 3px rgba(0,0,0,0.9);
            ">${(risk * 100).toFixed(0)}%</div>
          </div>`,
        iconAnchor: [22, -8],
      })
      L.marker([pos.lat, pos.lng], { icon: labelIcon, interactive: false }).addTo(overlay)
    })

    // USGS Earthquake markers
    realData?.usgs_earthquakes?.forEach(eq => {
      if (!eq.lat || !eq.lon) return
      const mag  = parseFloat(eq.magnitude) || 5
      const col  = mag >= 7.5 ? '#ef4444' : mag >= 6 ? '#f97316' : '#fbbf24'
      const size = 6 + mag * 3
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${col}44;border:2px solid ${col};
          box-shadow:0 0 ${Math.round(mag * 5)}px ${col}88;
          display:flex;align-items:center;justify-content:center;
          font-family:'Orbitron',monospace;font-size:7px;
          color:${col};font-weight:700;
        ">${mag.toFixed(1)}</div>`,
        iconAnchor: [size / 2, size / 2],
      })
      L.marker([eq.lat, eq.lon], { icon })
        .bindPopup(`<b style="color:${col}">M${mag.toFixed(1)}</b><br/><span style="color:#cbd5e1;font-size:12px">${eq.place}</span>${eq.tsunami ? '<br/><span style="color:#ef4444;font-size:11px">⚠ TSUNAMI WATCH</span>' : ''}<br/><span style="color:#64748b;font-size:10px">USGS</span>`)
        .addTo(overlay)
    })

    // GDACS events
    realData?.gdacs_events?.forEach(ev => {
      const lat = parseFloat(ev.lat), lon = parseFloat(ev.lon)
      if (isNaN(lat) || isNaN(lon)) return
      const COLS = { Green: '#22c55e', Orange: '#f97316', Red: '#ef4444' }
      const EI   = { EQ: '🌍', FL: '🌊', TC: '🌀', VO: '🌋', TS: '🌐' }
      const gCol = COLS[ev.alertlevel] || '#94a3b8'
      const icon = L.divIcon({
        className: '',
        html: `<div style="font-size:20px;line-height:1;filter:drop-shadow(0 0 6px ${gCol})">${EI[ev.eventtype] || '⚠️'}</div>`,
        iconAnchor: [12, 12],
      })
      L.marker([lat, lon], { icon })
        .bindPopup(`<b style="color:${gCol}">${ev.alertlevel} — ${ev.eventtype}</b><br/><span style="color:#cbd5e1;font-size:12px">${ev.country}</span><br/><span style="color:#64748b;font-size:10px">GDACS</span>`)
        .addTo(overlay)
    })

    // NASA FIRMS hotspots
    realData?.nasa_firms_hotspots?.forEach(h => {
      const frp = parseFloat(h.frp) || 10
      const col = frp > 100 ? '#ef4444' : frp > 30 ? '#f97316' : '#fbbf24'
      const sz  = 5 + Math.min(frp / 18, 14)
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${col}99;border:1.5px solid ${col};box-shadow:0 0 8px ${col}77;"></div>`,
        iconAnchor: [sz / 2, sz / 2],
      })
      L.marker([h.latitude, h.longitude], { icon })
        .bindPopup(`<b style="color:${col}">🔥 ${frp.toFixed(0)} MW FRP</b><br/><span style="color:#64748b;font-size:10px">NASA FIRMS</span>`)
        .addTo(overlay)
    })

  }, [riskScores, realData, scenario, analyzing])

  const handleSectorClick = useCallback(async (id) => {
    setAnalyzing(id)
    try {
      const res = await api.analyze(id, {})
      setActiveAlert(res.alert)
    } catch {}
    setAnalyzing(null)
  }, [setActiveAlert])

  const loadMap = async () => {
    setLoading(true)
    try {
      const data = await api.getRiskMap()
      const scores = {}
      data.zones.forEach(z => { scores[z.sector_id] = z.risk_score })
      setRiskScores(scores)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadMap() }, [scenario])

  const conflictSectors = new Set(
    alerts.flatMap(a => (a.xai_explanation?.conflict_signals || []).map(() => a.sector))
  )

  return (
    <div className="panel h-full flex flex-col" data-scenario={scenario}>
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <Map className="w-4 h-4" style={{ color }} />
          <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color }}>
            Tactical Risk Map
          </span>
          <span className="text-xs text-aegis-muted font-mono">· OpenStreetMap · Live</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Tile switcher */}
          <div className="flex items-center gap-1 bg-aegis-bg rounded-lg p-0.5 border border-aegis-border">
            {Object.entries(TILE_PROVIDERS).map(([k, p]) => (
              <button key={k} onClick={() => setTileKey(k)}
                className={`px-2.5 py-1 rounded-md text-xs font-display uppercase tracking-wider transition-all ${
                  tileKey === k
                    ? 'text-aegis-accent bg-aegis-accent/15 border border-aegis-accent/40'
                    : 'text-aegis-muted hover:text-aegis-text'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {conflictSectors.size > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aegis-critical/10 border border-aegis-critical/40">
              <AlertTriangle className="w-3.5 h-3.5 text-aegis-critical" />
              <span className="text-xs font-display text-aegis-critical">{conflictSectors.size} conflict{conflictSectors.size > 1 ? 's' : ''}</span>
            </div>
          )}
          <button onClick={loadMap} disabled={loading}
            className="text-aegis-muted hover:text-aegis-text transition-colors p-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Leaflet map container — explicit height required */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />

        {/* Scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 z-[500]">
          <div className="absolute inset-x-0 h-px"
               style={{
                 background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                 animation: 'scanLine 8s linear infinite',
               }} />
        </div>

        {/* Loading overlay */}
        {(loading || analyzing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[1000]">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border"
                 style={{ background:'rgba(12,22,37,0.95)', borderColor: color + '60' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                   style={{ borderColor: color }} />
              <span className="text-sm font-display" style={{ color }}>
                {analyzing ? `Analyzing Sector ${analyzing}…` : 'Loading map data…'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-aegis-border flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {[['CRITICAL','#ef4444'],['HIGH','#f97316'],['MEDIUM','#fbbf24'],['LOW','#22c55e']].map(([l,c])=>(
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background:c }} />
              <span className="text-xs font-display" style={{ color:c }}>{l}</span>
            </div>
          ))}
        </div>
        {realData?.usgs_earthquakes?.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-400/60" />
            <span className="text-xs text-aegis-muted">USGS Seismic</span>
          </div>
        )}
        {realData?.gdacs_events?.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-aegis-muted">🌐 GDACS Events</span>
          </div>
        )}
        <span className="text-xs text-aegis-muted ml-auto">Click sector ring to analyze</span>
      </div>
    </div>
  )
}

function sectorPopupHTML(id, pos, risk, col) {
  return `
    <div style="font-family:'IBM Plex Mono',monospace;min-width:200px;padding:4px">
      <div style="font-family:'Orbitron',monospace;color:${col};font-size:14px;font-weight:700;margin-bottom:8px;letter-spacing:0.05em">
        ${id} — ${pos.name}
      </div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><td style="color:#64748b;padding:2px 0">Risk Score</td>
            <td style="color:${col};font-weight:700;text-align:right">${(risk*100).toFixed(0)}% (${riskLabel(risk)})</td></tr>
        <tr><td style="color:#64748b;padding:2px 0">Population</td>
            <td style="color:#cbd5e1;text-align:right">${pos.pop.toLocaleString()}</td></tr>
      </table>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #1a2d4a;color:#475569;font-size:10px">
        Click to run full XAI analysis
      </div>
    </div>`
}
