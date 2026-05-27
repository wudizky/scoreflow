import React from 'react'
import { motion } from 'framer-motion'
import { colors, radii, spacing, font, shadows } from '../lib/theme'
import { INSTRUMENT_ICONS, CATEGORY_LABELS } from '../lib/instrumentIcons'
import Badge from './ui/Badge'

interface InstrumentCardProps {
  id: string
  name: string
  nameZh: string
  category: string
  rangeLow: number
  rangeHigh: number
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export default function InstrumentCard({
  id, name, nameZh, category, rangeLow, rangeHigh,
  selected, onClick, disabled,
}: InstrumentCardProps) {
  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { scale: 1.03, y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      style={{
        background: selected ? `${colors.bgCard}` : colors.bgCard,
        borderRadius: radii.lg,
        border: `2px solid ${selected ? colors.gold : colors.border}`,
        padding: spacing.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: selected ? shadows.glow : shadows.card,
        transition: 'all 0.2s',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 20, height: 20, borderRadius: '50%',
          background: colors.gold, color: '#0a0a14',
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>
          ✓
        </div>
      )}

      <div style={{ fontSize: 36, marginBottom: 8 }}>
        {INSTRUMENT_ICONS[id] || '🎵'}
      </div>

      <div style={{ fontWeight: 600, fontSize: font.size.md, color: colors.text, marginBottom: 2 }}>
        {name}
      </div>
      <div style={{ fontSize: font.size.xs, color: colors.textMuted, marginBottom: 6 }}>
        {nameZh}
      </div>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Badge variant={category}>
          {CATEGORY_LABELS[category] || category}
        </Badge>
      </div>

      <div style={{
        fontSize: font.size.xs, color: colors.textDim, marginTop: 6,
        fontFamily: font.mono,
      }}>
        {getRangeLabel(rangeLow)}–{getRangeLabel(rangeHigh)}
      </div>
    </motion.div>
  )
}

function getRangeLabel(midi: number): string {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  return `${NOTES[midi % 12]}${octave}`
}
