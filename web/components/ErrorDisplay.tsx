import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, radii, spacing } from '../lib/theme'

interface ErrorDisplayProps {
  message: string
  onRetry?: () => void
  onBack?: () => void
}

export default function ErrorDisplay({ message, onRetry, onBack }: ErrorDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: colors.errorBg,
        border: `1px solid ${colors.error}`,
        borderRadius: radii.md,
        padding: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <p style={{ color: colors.error, fontSize: 13, marginBottom: 8 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '6px 16px',
                borderRadius: radii.sm,
                border: `1px solid ${colors.error}`,
                background: 'transparent',
                color: colors.error,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '6px 16px',
                borderRadius: radii.sm,
                border: 'none',
                background: colors.bgCard,
                color: colors.textDim,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              返回
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
