import React from 'react'
import { motion } from 'framer-motion'
import { colors, spacing, font } from '../../lib/theme'
import { fadeIn } from '../../lib/animations'
import InstrumentSelector from '../InstrumentSelector'
import Button from '../ui/Button'
import { Instrument, ConversionPair } from '../../types'

interface ConvertStepProps {
  instruments: Instrument[]
  pairs: ConversionPair[]
  sourceId: string
  targetId: string
  onSourceChange: (id: string) => void
  onTargetChange: (id: string) => void
  isConverting: boolean
  onConvert: () => void
  onBack: () => void
}

export default function ConvertStep({
  instruments, pairs, sourceId, targetId,
  onSourceChange, onTargetChange,
  isConverting, onConvert, onBack,
}: ConvertStepProps) {
  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
      <h3 style={{ fontSize: font.size.lg, color: colors.text, marginBottom: spacing.sm }}>
        选择目标乐器
      </h3>
      <p style={{ color: colors.textDim, fontSize: font.size.sm, marginBottom: spacing.lg }}>
        将转写后的乐谱转换为其他乐器的演奏谱
      </p>

      <InstrumentSelector
        instruments={instruments}
        sourceId={sourceId}
        targetId={targetId}
        onSourceChange={onSourceChange}
        onTargetChange={onTargetChange}
        pairs={pairs}
      />

      <div style={{
        display: 'flex', gap: spacing.sm, marginTop: spacing.lg,
        justifyContent: 'center',
      }}>
        <Button onClick={onBack} variant="ghost">
          返回
        </Button>
        <Button
          onClick={onConvert}
          disabled={!sourceId || !targetId || sourceId === targetId}
          loading={isConverting}
        >
          {sourceId === targetId ? '请选择不同乐器' : '转换并对比'}
        </Button>
      </div>
    </motion.div>
  )
}
