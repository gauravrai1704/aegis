/**
 * Aegis-X Root App — v3.0 Multi-Hazard + Real Maps
 */
import React, { useEffect } from 'react'
import NavBar from './components/NavBar'
import Notifications from './components/Notifications'
import { OverrideModal } from './components/VerificationGate'
import CommandDashboard from './pages/CommandDashboard'
import LearningLoopPage from './pages/LearningLoopPage'
import SpreadModelPage  from './pages/SpreadModelPage'
import BriefingPage     from './pages/BriefingPage'
import RealMap          from './components/RealMap'
import RealDataPanel    from './components/RealDataPanel'
import AlertFeed        from './components/AlertFeed'
import XAIPanel         from './components/XAIPanel'
import VerificationGate from './components/VerificationGate'
import { useWebSocket } from './hooks/useWebSocket'
import useAegisStore from './store/aegisStore'
import { api } from './utils/api'

function PageContent() {
  const { activePanel } = useAegisStore()

  switch (activePanel) {
    case 'map':
      return (
        <div className="h-full p-3 grid gap-3" style={{ gridTemplateColumns:'1fr 290px' }}>
          <RealMap />
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0"><AlertFeed /></div>
          </div>
        </div>
      )
    case 'realdata':
      return (
        <div className="h-full p-3 grid gap-3" style={{ gridTemplateColumns:'1fr 290px' }}>
          <RealDataPanel />
          <AlertFeed />
        </div>
      )
    case 'alerts':
      return <div className="h-full p-3"><AlertFeed /></div>
    case 'xai':
      return (
        <div className="h-full p-3 grid gap-3" style={{ gridTemplateColumns:'280px 1fr 300px' }}>
          <AlertFeed />
          <XAIPanel />
          <div className="flex flex-col gap-3"><VerificationGate /></div>
        </div>
      )
    case 'spread':
      return (
        <div className="h-full p-3 grid gap-3" style={{ gridTemplateColumns:'1fr 280px' }}>
          <SpreadModelPage />
          <AlertFeed />
        </div>
      )
    case 'loop':
      return (
        <div className="h-full p-3 grid gap-3" style={{ gridTemplateColumns:'1fr 280px' }}>
          <LearningLoopPage />
          <AlertFeed />
        </div>
      )
    case 'briefing':
      return (
        <div className="h-full p-3 grid gap-3" style={{ gridTemplateColumns:'280px 1fr' }}>
          <AlertFeed />
          <BriefingPage />
        </div>
      )
    default:
      return <CommandDashboard />
  }
}

export default function App() {
  useWebSocket()

  // Bootstrap scenario metadata
  const { setScenario, setAllScenarios, setScenarioMeta } = useAegisStore()
  useEffect(() => {
    api.getScenarios().then(data => {
      setAllScenarios(data.available)
      setScenario(data.current)
      setScenarioMeta(data.meta[data.current])
    }).catch(() => {})
  }, [])

  const { scenario } = useAegisStore()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-aegis-bg scan-overlay"
         data-scenario={scenario}>
      {/* Dynamic ambient glow based on scenario */}
      <div className="fixed inset-0 pointer-events-none z-0 scenario-glow opacity-10"
           style={{ background:`radial-gradient(ellipse at 20% 0%, var(--s-color, #00d4ff) 0%, transparent 60%)` }} />

      <NavBar />
      <main className="flex-1 overflow-hidden relative z-10">
        <PageContent />
      </main>
      <Notifications />
      <OverrideModal />
    </div>
  )
}
