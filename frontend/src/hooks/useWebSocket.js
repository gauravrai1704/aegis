/**
 * Aegis-X WebSocket Hook
 * Auto-reconnects, feeds alerts and risk data into Zustand store.
 */

import { useEffect, useRef } from 'react'
import useAegisStore from '../store/aegisStore'

const WS_URL = import.meta.env.VITE_WS_URL
  ? `${import.meta.env.VITE_WS_URL}/ws/stream`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/stream`

const RECONNECT_DELAY = 3000

export function useWebSocket() {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const { setWsStatus, addAlert, setRiskScores, addNotification } = useAegisStore()

  const connect = () => {
    setWsStatus('connecting')
    ws.current = new WebSocket(WS_URL)

    ws.current.onopen = () => {
      setWsStatus('connected')
      console.log('[Aegis-X] WebSocket connected')
    }

    ws.current.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'alert') {
          const alert = msg.payload
          addAlert(alert)
          if (alert.severity === 'critical' || alert.severity === 'high') {
            addNotification({
              type: 'alert',
              severity: alert.severity,
              message: alert.title,
              alertId: alert.id,
            })
          }
        } else if (msg.type === 'risk_update') {
          setRiskScores(msg.payload)
        }
      } catch (e) {
        console.warn('[Aegis-X] WS parse error', e)
      }
    }

    ws.current.onclose = () => {
      setWsStatus('disconnected')
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
    }

    ws.current.onerror = (err) => {
      console.error('[Aegis-X] WS error', err)
      ws.current?.close()
    }
  }

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [])
}
