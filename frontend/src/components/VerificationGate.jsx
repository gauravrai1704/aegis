/**
 * Aegis-X Human Verification Gate — v3.1
 */
import React, { useState } from 'react'
import { Lock, X, CheckCircle, AlertTriangle } from 'lucide-react'
import useAegisStore from '../store/aegisStore'
import { api } from '../utils/api'
import { severityColor } from '../utils/helpers'
import clsx from 'clsx'

export default function VerificationGate() {
  const { activeAlert, updateAlertStatus, openOverrideModal, addNotification } = useAegisStore()
  const [approving, setApproving] = useState(false)

  if (!activeAlert) return null
  if (activeAlert.status !== 'pending') return <StatusBadge alert={activeAlert} />

  const col = severityColor(activeAlert.severity)

  const handleApprove = async () => {
    setApproving(true)
    try {
      await api.approveAlert(activeAlert.id, 'Commander')
      updateAlertStatus(activeAlert.id, 'approved')
      addNotification({ type:'success', message:`Actions approved for Sector ${activeAlert.sector}` })
    } catch {
      addNotification({ type:'error', message:'Approval failed — retry' })
    } finally { setApproving(false) }
  }

  return (
    <div className="panel overflow-hidden" style={{ borderColor: col + '40' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-aegis-border flex items-center gap-3"
           style={{ background: col + '0a' }}>
        <Lock className="w-4 h-4 shrink-0" style={{ color: col }} />
        <span className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: col }}>
          Human Verification Gate
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: col, animation:'pulse2 1.5s ease-in-out infinite' }} />
          <span className="text-xs font-mono text-aegis-muted">Awaiting Authorization</span>
        </div>
      </div>

      {/* Queued actions */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs text-aegis-muted font-mono uppercase tracking-wider mb-2">
          Queued Actions ({activeAlert.recommended_actions?.length})
        </p>
        {activeAlert.recommended_actions?.slice(0,3).map(action => (
          <div key={action.id} className="flex items-start gap-3 py-2 border-b border-aegis-border/40">
            <span className="text-xs font-display px-2 py-0.5 border border-aegis-border rounded text-aegis-muted shrink-0">
              P{action.priority}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white leading-snug">{action.action}</div>
              <div className="text-xs text-aegis-muted font-mono mt-0.5">{action.estimated_impact}</div>
            </div>
            <div className="text-xs text-aegis-accent font-mono shrink-0">{action.unit}</div>
          </div>
        ))}
      </div>

      {/* Approve / Override */}
      <div className="px-4 pb-4 flex gap-3">
        <button onClick={handleApprove} disabled={approving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border font-display text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ borderColor:'#22c55e', color:'#22c55e', background:'rgba(34,197,94,0.1)' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(34,197,94,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(34,197,94,0.1)'}>
          {approving
            ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-green-400" />
            : <CheckCircle className="w-4 h-4" />}
          {approving ? 'Executing…' : 'Approve & Execute'}
        </button>

        <button onClick={() => openOverrideModal(activeAlert.id)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border font-display text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
          style={{ borderColor:'#f97316', color:'#f97316', background:'rgba(249,115,22,0.1)' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(249,115,22,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(249,115,22,0.1)'}>
          <X className="w-4 h-4" /> Override
        </button>
      </div>

      <div className="px-4 pb-3 text-xs text-aegis-muted/60 text-center font-mono">
        Override decisions are logged as Expert Feedback to improve model accuracy.
      </div>
    </div>
  )
}

function StatusBadge({ alert }) {
  const isApproved = alert.status === 'approved'
  return (
    <div className={clsx(
      'panel px-4 py-4 flex items-center gap-3',
      isApproved ? 'border-green-500/30' : 'border-orange-500/30'
    )}>
      {isApproved
        ? <CheckCircle className="w-5 h-5 text-aegis-safe shrink-0" />
        : <AlertTriangle className="w-5 h-5 text-aegis-warn shrink-0" />}
      <div>
        <div className={clsx('text-sm font-display font-bold uppercase tracking-wider', isApproved ? 'text-aegis-safe' : 'text-aegis-warn')}>
          {isApproved ? 'Actions Approved & Executing' : 'Recommendation Overridden'}
        </div>
        {alert.override_reason && (
          <div className="text-xs text-aegis-muted font-mono mt-0.5 truncate">
            "{alert.override_reason}"
          </div>
        )}
      </div>
    </div>
  )
}

export function OverrideModal() {
  const { overrideModalOpen, overrideTargetId, closeOverrideModal, updateAlertStatus, addNotification } = useAegisStore()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!overrideModalOpen) return null

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await api.overrideAlert(overrideTargetId, reason, 'Commander')
      updateAlertStatus(overrideTargetId, 'overridden', reason)
      addNotification({ type:'info', message:'Override logged. Model will learn from this decision.' })
      closeOverrideModal()
      setReason('')
    } catch { addNotification({ type:'error', message:'Override failed.' }) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel w-full max-w-md mx-4 shadow-2xl glow-warn anim-pop">
        <div className="px-5 py-4 border-b border-aegis-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-aegis-warn" />
            <span className="font-display text-sm font-bold uppercase tracking-wider text-aegis-warn">
              Override AI Recommendation
            </span>
          </div>
          <button onClick={closeOverrideModal} className="text-aegis-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-aegis-muted leading-relaxed">
            Your override reason is logged as a labeled training sample and fed into the
            Active Learning retraining pipeline to improve future predictions.
          </p>
          <div>
            <label className="block text-xs text-aegis-muted font-mono uppercase tracking-wider mb-2">
              Override Reason (required)
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g., Ground team confirms sensor malfunction — road is actually clear…"
              rows={3}
              className="w-full bg-aegis-bg border border-aegis-border rounded-lg p-3 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-aegis-warn/50 placeholder:text-aegis-muted/40"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={!reason.trim() || submitting}
              className="flex-1 py-2.5 font-display text-sm font-bold uppercase tracking-wider rounded-lg border border-aegis-warn text-aegis-warn bg-aegis-warn/10 hover:bg-aegis-warn/18 transition-all disabled:opacity-40 active:scale-[0.97]">
              {submitting ? 'Logging…' : 'Confirm Override'}
            </button>
            <button onClick={closeOverrideModal}
              className="px-5 py-2.5 font-display text-sm uppercase tracking-wider rounded-lg border border-aegis-border text-aegis-muted hover:text-white transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
