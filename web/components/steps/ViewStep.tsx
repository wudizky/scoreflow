import React from 'react'
import { motion } from 'framer-motion'
import { colors, spacing, font } from '../../lib/theme'
import { fadeIn, slideUp } from '../../lib/animations'
import SheetMusicViewer from '../SheetMusicViewer'
import PlaybackControls from '../PlaybackControls'
import Button from '../ui/Button'

interface ViewStepProps {
  transcriptionResult: any
  sourceInstrument: string
  instruments: { id: string; name: string; name_zh: string }[]
  onConvert: () => void
  onExport: () => void
  onRestart: () => void
}

export default function ViewStep({
  transcriptionResult, sourceInstrument,
  instruments, onConvert, onExport, onRestart,
}: ViewStepProps) {
  if (!transcriptionResult) return null

  const notes = transcriptionResult.notes || []
  const instName = instruments.find(i => i.id === sourceInstrument)
    ?.name || sourceInstrument

  return (
    <motion.div variants={slideUp} initial="initial" animate="animate" exit="exit">
      {/* Status banner */}
      <motion.div
        variants={fadeIn}
        style={{
          background: colors.bgCard,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          padding: spacing.md,
          marginBottom: spacing.lg,
          display: 'flex',
          gap: spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span style={{ color: colors.textMuted, fontSize: font.size.xs }}>状态</span>
          <p style={{ fontWeight: 600, color: colors.success, fontSize: font.size.sm }}>
            {transcriptionResult.status}
          </p>
        </div>
        <div>
          <span style={{ color: colors.textMuted, fontSize: font.size.xs }}>乐器</span>
          <p style={{ fontWeight: 600, fontSize: font.size.sm }}>{instName}</p>
        </div>
        <div>
          <span style={{ color: colors.textMuted, fontSize: font.size.xs }}>音符数</span>
          <p style={{ fontWeight: 600, color: colors.gold, fontSize: font.size.sm }}>
            {transcriptionResult.full_note_count || transcriptionResult.note_count}
          </p>
        </div>
        {transcriptionResult.pdf_path && (
          <div>
            <span style={{ color: colors.textMuted, fontSize: font.size.xs }}>PDF</span>
            <p style={{ fontWeight: 600, color: colors.success, fontSize: font.size.sm }}>已生成</p>
          </div>
        )}
      </motion.div>

      {/* Sheet music */}
      <div style={{ marginBottom: spacing.lg }}>
        <SheetMusicViewer notes={notes} title={`${instName} 乐谱`} />
      </div>

      {/* Playback */}
      <div style={{ marginBottom: spacing.lg }}>
        <PlaybackControls notes={notes} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Button onClick={onConvert}>
          🔄 转换到其他乐器
        </Button>
        <Button onClick={onExport} variant="secondary">
          💾 导出乐谱
        </Button>
        <Button onClick={onRestart} variant="ghost">
          重新开始
        </Button>
      </div>
    </motion.div>
  )
}
