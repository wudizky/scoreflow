import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, radii } from '../lib/theme'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0
let addToastFn: ((msg: string, type: ToastItem['type']) => void) | null = null

export function toast(message: string, type: ToastItem['type'] = 'info') {
  addToastFn?.(message, type)
}

const TYPE_COLORS: Record<ToastItem['type'], { bg: string; text: string }> = {
  success: { bg: '#1a3a1a', text: '#4caf50' },
  error: { bg: '#3a1a1a', text: '#ff6b6b' },
  info: { bg: '#1a1a2e', text: '#e8c547' },
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++toastId
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const colors = TYPE_COLORS[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.text}`,
                borderRadius: radii.md,
                padding: '12px 20px',
                color: colors.text,
                fontSize: 13,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                minWidth: 200,
                maxWidth: 360,
              }}
            >
              {t.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
