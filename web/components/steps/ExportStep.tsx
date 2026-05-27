import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { colors, radii, spacing, font, shadows } from '../../lib/theme'
import { fadeIn, stagger } from '../../lib/animations'
import Button from '../ui/Button'
import { toast } from '../Toast'
import { downloadBlob } from '../../lib/utils'

interface ExportStepProps {
  transcriptionResult: any
  conversionResult: any
  sourceInstrument: string
  targetInstrument: string
  onBack: () => void
  onRestart: () => void
}

type ExportFormat = 'midi' | 'musicxml' | 'pdf'

const FORMAT_OPTIONS: { id: ExportFormat; label: string; icon: string; desc: string; disabled?: boolean }[] = [
  { id: 'midi', label: 'MIDI', icon: '🎵', desc: '标准 MIDI 文件，兼容所有数字音频工作站' },
  { id: 'musicxml', label: 'MusicXML', icon: '🎼', desc: '可打印的乐谱，兼容 Finale/Sibelius/MuseScore' },
  { id: 'pdf', label: 'PDF', icon: '📄', desc: '准备打印的乐谱', disabled: true },
]

export default function ExportStep({
  transcriptionResult, conversionResult,
  sourceInstrument, targetInstrument,
  onBack, onRestart,
}: ExportStepProps) {
  const [format, setFormat] = useState<ExportFormat>('midi')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    const notes = conversionResult?.notes || transcriptionResult?.notes || []
    if (notes.length === 0) {
      toast('没有可导出的音符数据', 'error')
      setExporting(false)
      return
    }
    setExporting(true)
    try {
      // Simulate export for now - in production, call actual API
      await new Promise(r => setTimeout(r, 1000))

      if (format === 'midi') {
        // Call convert-midi endpoint
        const formData = new FormData()
        formData.append('source_id', sourceInstrument)
        formData.append('target_id', targetInstrument || sourceInstrument)
        formData.append('notes', JSON.stringify(notes))

        const res = await fetch('/api/v1/convert-midi', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const blob = await res.blob()
          downloadBlob(blob, `${sourceInstrument}_to_${targetInstrument || sourceInstrument}.mid`)
          toast('MIDI 导出成功！', 'success')
        } else {
          toast('导出失败，请重试', 'error')
        }
      } else {
        toast(`${format.toUpperCase()} 导出功能即将上线`, 'info')
      }
    } catch (err) {
      toast('导出失败: ' + (err as Error).message, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
      <h3 style={{ fontSize: font.size.lg, color: colors.text, marginBottom: spacing.sm }}>
        导出乐谱
      </h3>
      <p style={{ color: colors.textDim, fontSize: font.size.sm, marginBottom: spacing.lg }}>
        选择导出格式并下载
      </p>

      {/* Format cards */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        {FORMAT_OPTIONS.map(opt => (
          <motion.div
            key={opt.id}
            variants={fadeIn}
            onClick={opt.disabled ? undefined : () => setFormat(opt.id)}
            whileHover={opt.disabled ? undefined : { scale: 1.03, y: -2 }}
            style={{
              background: colors.bgCard,
              borderRadius: radii.lg,
              border: `2px solid ${format === opt.id ? colors.gold : colors.border}`,
              padding: spacing.lg,
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              opacity: opt.disabled ? 0.5 : 1,
              boxShadow: format === opt.id ? shadows.glow : undefined,
              textAlign: 'center',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: spacing.sm }}>{opt.icon}</div>
            <h4 style={{ fontWeight: 600, fontSize: font.size.md, marginBottom: spacing.xs }}>
              {opt.label}
              {opt.disabled && <span style={{ color: colors.textMuted, fontSize: 10, marginLeft: 6 }}>即将推出</span>}
            </h4>
            <p style={{ fontSize: font.size.xs, color: colors.textDim }}>{opt.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          onClick={handleExport}
          loading={exporting}
          disabled={exporting}
        >
          💾 下载 {format.toUpperCase()}
        </Button>
        <Button onClick={onBack} variant="secondary">
          ← 返回对比
        </Button>
        <Button onClick={onRestart} variant="ghost">
          重新开始
        </Button>
      </div>
    </motion.div>
  )
}
