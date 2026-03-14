/**
 * Aegis-X Global State Store — v3.0
 */
import { create } from 'zustand'

const useAegisStore = create((set, get) => ({
  wsStatus:    'disconnected',
  setWsStatus: (s) => set({ wsStatus: s }),

  alerts:    [],
  activeAlert: null,
  addAlert:  (alert) => set(state => ({ alerts: [alert, ...state.alerts].slice(0, 50) })),
  setActiveAlert: (alert) => set({ activeAlert: alert }),
  updateAlertStatus: (id, status, reason) => set(state => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, status, override_reason: reason } : a),
    activeAlert: state.activeAlert?.id === id
      ? { ...state.activeAlert, status, override_reason: reason }
      : state.activeAlert,
  })),

  riskScores:    {},
  setRiskScores: (s) => set({ riskScores: s }),

  stats:    null,
  setStats: (s) => set({ stats: s }),

  // Scenario state
  scenario:           'flood',
  scenarioMeta:       null,
  allScenarios:       [],
  scenarioSwitching:  false,
  realData:           null,
  setScenario:        (s) => set({ scenario: s }),
  setScenarioMeta:    (m) => set({ scenarioMeta: m }),
  setAllScenarios:    (a) => set({ allScenarios: a }),
  setScenarioSwitching: (v) => set({ scenarioSwitching: v }),
  setRealData:        (d) => set({ realData: d }),

  learningLoop:  null,
  setLearningLoop: (d) => set({ learningLoop: d }),

  spreadForecast:     null,
  setSpreadForecast:  (d) => set({ spreadForecast: d }),

  briefing:        null,
  briefingLoading: false,
  setBriefing:     (d) => set({ briefing: d }),
  setBriefingLoading: (v) => set({ briefingLoading: v }),

  activePanel:    'dashboard',
  setActivePanel: (p) => set({ activePanel: p }),

  overrideModalOpen: false,
  overrideTargetId:  null,
  openOverrideModal:  (id) => set({ overrideModalOpen:true, overrideTargetId:id }),
  closeOverrideModal: ()   => set({ overrideModalOpen:false, overrideTargetId:null }),

  notifications:       [],
  addNotification:     (n) => set(state => ({ notifications:[...state.notifications,{...n,id:Date.now()}].slice(-6) })),
  dismissNotification: (id) => set(state => ({ notifications:state.notifications.filter(n=>n.id!==id) })),
}))

export default useAegisStore
