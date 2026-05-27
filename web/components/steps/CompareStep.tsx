import React from 'react'
import { motion } from 'framer-motion'
import { colors, spacing, font } from '../../lib/theme'
import { fadeIn } from '../../lib/animations'
import SheetMusicViewer from '../SheetMusicViewer'
import PlaybackControls from '../PlaybackControls'
import Button from '../ui/Button'

interface CompareStepProps {
  originalNotes: any[]
  convertedNotes: any[]
  sourceInstrument: string
  targetInstrument: string
  instruments: { id: string; name: string }[]
  conversionResult: any
  onExport: () => void
  onBack: () => void
  onRestart: () => void
}

export default function CompareStep({
  originalNotes, convertedNotes,
  sourceInstrument, targetInstrument,
  instruments, conversionResult,
  onExport, onBack, onRestart,
}: CompareStepProps) {
  const srcName = instruments.find(i => i.id === sourceInstrument)?.name || sourceInstrument
  const tgtName = instruments.find(i => i.id === targetInstrument)?.name || targetInstrument

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
      {/* Stats */}
      {conversionResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: colors.bgCard, borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: spacing.md, marginBottom: spacing.lg,
            display: 'flex', gap: spacing.lg, flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>🎵</div>
            <p style={{ fontSize: font.size.xs, color: colors.textDim }}>转换后音符</p>
            <p style={{ fontWeight: 700, color: colors.gold, fontSize: font.size.lg }}>
              {conversionResult.note_count}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>🗑️</div>
            <p style={{ fontSize: font.size.xs, color: colors.textDim }}>已移除音符</p>
            <p style={{ fontWeight: 700, color: colors.error, fontSize: font.size.lg }}>
              {conversionResult.removed_notes}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>📊</div>
            <p style={{ fontSize: font.size.xs, color: colors.textDim }}>保持率</p>
            <p style={{ fontWeight: 700, color: colors.success, fontSize: font.size.lg }}>
              {conversionResult.note_count > 0
                ? Math.round((1 - conversionResult.removed_notes / conversionResult.note_count) * 100)
                : 0}%
            </p>
          </div>
        </motion.div>
      )}

      {/* Side by side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: spacing.md,
        marginBottom: spacing.lg,
      }}>
        <div>
          <SheetMusicViewer notes={originalNotes} title={`🎵 ${srcName}（原始）`} />
          <div style={{ marginTop: spacing.sm }}>
            <PlaybackControls notes={originalNotes} compact />
          </div>
        </div>
        <div>
          <SheetMusicViewer
            notes={convertedNotes || []}
            title={`🔄 ${tgtName}（转换）`}
          />
          <div style={{ marginTop: spacing.sm }}>
            <PlaybackControls notes={convertedNotes || []} compact />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button onClick={onExport}>
          💾 导出转换结果
        </Button>
        <Button onClick={onBack} variant="secondary">
          ← 返回选择乐器
        </Button>
        <Button onClick={onRestart} variant="ghost">
          重新开始
        </Button>
      </div>
    </motion.div>
  )
}
