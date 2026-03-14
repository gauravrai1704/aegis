/**
 * Aegis-X — Toast Notifications
 */
import React, { useEffect } from 'react'
import { CheckCircle, AlertTriangle, Info, X, Zap } from 'lucide-react'
import useAegisStore from '../store/aegisStore'

const TYPES = {
  success: { icon:CheckCircle,  color:'#22c55e', bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.3)'  },
  error:   { icon:AlertTriangle,color:'#ef4444', bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)'  },
  info:    { icon:Info,         color:'#00d4ff', bg:'rgba(0,212,255,0.1)',  border:'rgba(0,212,255,0.3)'  },
  alert:   { icon:Zap,          color:'#f97316', bg:'rgba(249,115,22,0.1)', border:'rgba(249,115,22,0.3)' },
}

export default function Notifications() {
  const { notifications, dismissNotification } = useAegisStore()
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 w-88 max-w-sm">
      {notifications.map(n => (
        <Toast key={n.id} n={n} onDismiss={() => dismissNotification(n.id)} />
      ))}
    </div>
  )
}

function Toast({ n, onDismiss }) {
  const cfg  = TYPES[n.type] || TYPES.info
  const Icon = cfg.icon

  useEffect(() => { const t = setTimeout(onDismiss, 5500); return () => clearTimeout(t) }, [])

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border anim-slide-in"
         style={{ background:cfg.bg, borderColor:cfg.border,
                  boxShadow:`0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px ${cfg.border}` }}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color:cfg.color }} />
      <p className="flex-1 text-sm text-aegis-text leading-relaxed">{n.message}</p>
      <button onClick={onDismiss}
        className="shrink-0 text-aegis-muted hover:text-aegis-text transition-colors ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
