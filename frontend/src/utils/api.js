/**
 * Aegis-X API Client — v3.0 Multi-Hazard
 */
const BASE_URL = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  getAlerts:          (limit = 20)       => request(`/api/alerts/?limit=${limit}`),
  getAlert:           (id)               => request(`/api/alerts/${id}`),
  generateAlert:      (sector)           => request(`/api/alerts/generate${sector ? '?sector='+sector : ''}`, { method:'POST' }),
  approveAlert:       (id, commander)    => request(`/api/alerts/${id}/approve`, { method:'POST', body:JSON.stringify({ commander }) }),
  overrideAlert:      (id, reason, cmdr) => request(`/api/alerts/${id}/override`, { method:'POST', body:JSON.stringify({ reason, commander:cmdr }) }),
  getRiskMap:         ()                 => request('/api/risk-map/'),
  getDashboardStats:  ()                 => request('/api/dashboard/stats'),
  getModelStatus:     ()                 => request('/api/dashboard/model-status'),
  analyze:            (sector, data)     => request('/api/analyze/', { method:'POST', body:JSON.stringify({ sector, sensor_data:data }) }),
  getLearningLoop:    ()                 => request('/api/learning-loop/summary'),
  getAuditLog:        (limit=50)         => request(`/api/learning-loop/audit?limit=${limit}`),
  getSpreadForecast:  ()                 => request('/api/spread/forecast'),
  getBriefing:        (id)               => request(`/api/briefing/${id}?include_spread=true`),
  // Scenario
  getScenarios:       ()                 => request('/api/scenario/'),
  getCurrentScenario: ()                 => request('/api/scenario/current'),
  switchScenario:     (scenario)         => request('/api/scenario/switch', { method:'POST', body:JSON.stringify({ scenario }) }),
  getRealData:        ()                 => request('/api/scenario/real-data'),
  health:             ()                 => request('/health'),
}
