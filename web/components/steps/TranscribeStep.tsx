import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { colors, radii, spacing, font } from '../../lib/theme'
import { pulse } from '../../lib/animations'
import ErrorDisplay from '../ErrorDisplay'

interface TranscribeStepProps {
  isTranscribing: boolean
  transcriptionResult: any
  error: string | null
  onTranscribe: () => void
  onRetry: () => void
  onNext: () => void
}

const STATUS_MESSAGES = [
  '正在分析音频...',
  '分离音轨中...',
  '识别音符中...',
  '生成乐谱...',
  '即将完成...',
]

export default function TranscribeStep({
  isTranscribing, transcriptionResult, error,
  onTranscribe, onRetry, onNext,
}: TranscribeStepProps) {
  const [statusIdx, setStatusIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (isTranscribing) {
      setStatusIdx(0)
      timerRef.current = setInterval(() => {
        setStatusIdx(prev => Math.min(prev + 1, STATUS_MESSAGES.length - 1))
      }, 2000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setStatusIdx(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isTranscribing])

  // Auto-transcribe on mount (only once)
  const hasAutoFired = useRef(false)
  useEffect(() => {
    if (!hasAutoFired.current && !isTranscribing && !transcriptionResult && !error) {
      hasAutoFired.current = true
      onTranscribe()
    }
  }, [isTranscribing, transcriptionResult, error, onTranscribe])

  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={onRetry}
        onBack={() => {}}
      />
    )
  }

  if (isTranscribing) {
    return (
      <div style={{
        textAlign: 'center', padding: spacing.xxl,
      }}>
        <motion.div
          variants={pulse}
          animate="animate"
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: `4px solid ${colors.gold}`,
            borderTopColor: 'transparent',
            margin: '0 auto 24px',
          }}
        />
        <p style={{ color: colors.gold, fontSize: font.size.md, fontWeight: 500 }}>
          {STATUS_MESSAGES[statusIdx]}
        </p>
        <p style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 8 }}>
          AI 正在处理中，请稍候...
        </p>
      </div>
    )
  }

  if (transcriptionResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 48, marginBottom: spacing.md }}>✅</div>
        <h3 style={{ color: colors.success, fontSize: font.size.lg, marginBottom: spacing.sm }}>
          转写完成！
        </h3>
        <p style={{ color: colors.textDim, fontSize: font.size.sm, marginBottom: spacing.lg }}>
          检测到 <strong style={{ color: colors.gold }}>
          {transcriptionResult.full_note_count || transcriptionResult.note_count}</strong> 个音符
        </p>
        <motion.button
          onClick={onNext}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '12px 32px', border: 'none', borderRadius: radii.md,
            background: colors.gold, color: '#0a0a14',
            fontSize: font.size.md, fontWeight: 600, cursor: 'pointer',
          }}
        >
          查看乐谱 →
        </motion.button>
      </motion.div>
    )
  }

  return null
}
