import React from 'react'
import { motion } from 'framer-motion'
import { Instrument, ConversionPair } from '../types'
import InstrumentCard from './InstrumentCard'
import { colors, spacing, font } from '../lib/theme'
import { DIFFICULTY_LABELS } from '../lib/instrumentIcons'
import { stagger } from '../lib/animations'
import { groupBy } from '../lib/utils'

interface InstrumentSelectorProps {
  instruments: Instrument[]
  sourceId: string
  targetId: string
  onSourceChange: (id: string) => void
  onTargetChange: (id: string) => void
  pairs?: ConversionPair[]
}

export default function InstrumentSelector({
  instruments, sourceId, targetId,
  onSourceChange, onTargetChange, pairs,
}: InstrumentSelectorProps) {
  const grouped = groupBy(instruments, (i) => i.category)
  const categoryOrder = ['keyboard', 'string', 'plucked', 'wind']

  const getDifficulty = (src: string, tgt: string): number => {
    return pairs?.find(p => p.source_id === src && p.target_id === tgt)?.difficulty ?? 3
  }

  const difficulty = sourceId && targetId ? getDifficulty(sourceId, targetId) : null

  return (
    <div>
      {/* Selection labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.md, gap: spacing.md, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: font.size.sm, color: colors.textDim }}>
          源乐器: <strong style={{ color: sourceId ? colors.gold : colors.textMuted }}>
            {sourceId ? instruments.find(i => i.id === sourceId)?.name : '未选择'}
          </strong>
        </div>

        <motion.div
          whileHover={{ scale: 1.1 }}
          style={{ fontSize: 20, color: colors.textMuted, cursor: 'pointer' }}
          onClick={() => {
            if (sourceId && targetId) {
              onSourceChange(targetId)
              onTargetChange(sourceId)
            }
          }}
        >
          ↔
        </motion.div>

        <div style={{ fontSize: font.size.sm, color: colors.textDim }}>
          目标乐器: <strong style={{ color: targetId ? colors.gold : colors.textMuted }}>
            {targetId ? instruments.find(i => i.id === targetId)?.name : '未选择'}
          </strong>
        </div>
      </div>

      {/* Difficulty */}
      {difficulty && (
        <div style={{
          textAlign: 'center', marginBottom: spacing.md,
          fontSize: font.size.sm, color: colors.textDim,
        }}>
          转换难度: <strong style={{ color: difficulty <= 2 ? colors.success : difficulty <= 3 ? colors.gold : colors.error }}>
            {'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)} {DIFFICULTY_LABELS[difficulty]}
          </strong>
        </div>
      )}

      {/* Instrument cards grouped by category */}
      {categoryOrder.map(cat => {
        const items = grouped[cat]
        if (!items?.length) return null
        return (
          <div key={cat} style={{ marginBottom: spacing.lg }}>
            <h4 style={{
              color: colors.textMuted, fontSize: font.size.xs,
              textTransform: 'uppercase', marginBottom: spacing.sm,
              letterSpacing: 1,
            }}>
              {cat === 'keyboard' ? '⌨️ 键盘' :
               cat === 'string' ? '🎻 弦乐' :
               cat === 'plucked' ? '🪶 弹拨' :
               cat === 'wind' ? '🎷 管乐' : cat}
            </h4>
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: spacing.sm,
              }}
            >
              {items.map(inst => {
                const isSource = inst.id === sourceId
                const isTarget = inst.id === targetId
                const isDisabled = inst.id === sourceId || inst.id === targetId
                return (
                  <InstrumentCard
                    key={inst.id}
                    id={inst.id}
                    name={inst.name}
                    nameZh={inst.name_zh}
                    category={inst.category}
                    rangeLow={inst.range_low}
                    rangeHigh={inst.range_high}
                    selected={isSource || isTarget}
                    disabled={isSource || isTarget}
                    onClick={() => {
                      if (inst.id === sourceId || inst.id === targetId) return
                      if (!sourceId) onSourceChange(inst.id)
                      else onTargetChange(inst.id)
                    }}
                  />
                )
              })}
            </motion.div>
          </div>
        )
      })}

      {instruments.length === 0 && (
        <p style={{ color: colors.textMuted, textAlign: 'center', padding: spacing.xl }}>
          加载乐器中...
        </p>
      )}
    </div>
  )
}
