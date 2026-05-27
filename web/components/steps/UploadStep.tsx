import React, { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { colors, radii, spacing, font, shadows } from '../../lib/theme'
import { Instrument } from '../../types'
import { fadeIn } from '../../lib/animations'

interface UploadStepProps {
  audioFile: File | null
  onFileSelected: (file: File | null) => void
  sourceInstrument: string
  onSourceChange: (id: string) => void
  instruments: Instrument[]
  onNext: () => void
}

const ALLOWED_TYPES = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm']

export default function UploadStep({
  audioFile, onFileSelected, sourceInstrument,
  onSourceChange, instruments, onNext,
}: UploadStepProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && ALLOWED_TYPES.some(t => file.name.toLowerCase().endsWith(t))) {
      onFileSelected(file)
    }
  }, [onFileSelected])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }, [onFileSelected])

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
      {/* Upload area */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        animate={dragActive ? { scale: 1.02, borderColor: colors.gold } : { scale: 1, borderColor: colors.border }}
        style={{
          border: `2px dashed ${dragActive ? colors.gold : colors.border}`,
          borderRadius: radii.xl,
          padding: spacing.xxl,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'rgba(232,197,71,0.05)' : colors.bgCard,
          transition: 'all 0.2s',
          marginBottom: spacing.lg,
        }}
      >
        <input
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          style={{ display: 'none' }}
          id="audio-upload-input"
        />
        <label htmlFor="audio-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
          <div style={{ fontSize: 48, marginBottom: spacing.md }}>🎵</div>
          <p style={{ fontSize: font.size.lg, color: colors.text, marginBottom: spacing.sm }}>
            {audioFile ? '点击更换文件' : '拖拽音频文件到此处，或点击上传'}
          </p>
          <p style={{ fontSize: font.size.xs, color: colors.textMuted }}>
            MP3 / WAV / M4A / FLAC / OGG / WebM（最大 50MB）
          </p>
        </label>
      </motion.div>

      {/* File info */}
      {audioFile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: colors.bgCard,
            borderRadius: radii.md,
            border: `1px solid ${colors.border}`,
            padding: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📄</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: font.size.sm, fontWeight: 600, color: colors.text }}>
                {audioFile.name}
              </p>
              <p style={{ fontSize: font.size.xs, color: colors.textDim }}>
                {(audioFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={() => onFileSelected(null)}
              style={{
                padding: '4px 12px', borderRadius: radii.sm,
                border: `1px solid ${colors.border}`,
                background: 'transparent', color: colors.textMuted,
                fontSize: 12, cursor: 'pointer',
              }}
            >
              移除
            </button>
          </div>
        </motion.div>
      )}

      {/* Instrument selection */}
      <div style={{ marginBottom: spacing.lg }}>
        <p style={{
          fontSize: font.size.sm, color: colors.textDim,
          marginBottom: spacing.sm, fontWeight: 500,
        }}>
          选择源乐器
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[{ id: 'piano', name: '钢琴', icon: '🎹' },
            { id: 'guitar', name: '吉他', icon: '🎸' },
            { id: 'violin', name: '小提琴', icon: '🎻' },
            { id: 'ukulele', name: '尤克里里', icon: '🪕' },
          ].map(opt => (
            <motion.button
              key={opt.id}
              onClick={() => onSourceChange(opt.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 16px',
                borderRadius: radii.md,
                border: `2px solid ${sourceInstrument === opt.id ? colors.gold : colors.border}`,
                background: sourceInstrument === opt.id ? 'rgba(232,197,71,0.1)' : colors.bgCard,
                color: sourceInstrument === opt.id ? colors.gold : colors.text,
                cursor: 'pointer',
                fontSize: font.size.sm,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{opt.icon}</span>
              {opt.name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Action */}
      <motion.button
        onClick={onNext}
        disabled={!audioFile}
        whileHover={audioFile ? { scale: 1.02 } : {}}
        whileTap={audioFile ? { scale: 0.98 } : {}}
        style={{
          width: '100%', padding: '14px 32px',
          border: 'none', borderRadius: radii.md,
          background: audioFile ? colors.gold : colors.border,
          color: audioFile ? '#0a0a14' : colors.textMuted,
          fontSize: font.size.md, fontWeight: 600,
          cursor: audioFile ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
        }}
      >
        {audioFile ? '开始转写 →' : '请先上传音频文件'}
      </motion.button>
    </motion.div>
  )
}
