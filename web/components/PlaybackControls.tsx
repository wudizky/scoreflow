import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { NoteEvent } from '../types'
import { MidiPlayer } from '../lib/MidiPlayer'
import { formatDuration } from '../lib/utils'
import { colors, radii, spacing, font } from '../lib/theme'

interface PlaybackControlsProps {
  notes: NoteEvent[]
  autoPlay?: boolean
  compact?: boolean
}

type OscType = 'sine' | 'triangle' | 'sawtooth' | 'square'

const WAVEFORM_LABELS: Record<OscType, string> = {
  sine: '正弦',
  triangle: '三角',
  sawtooth: '锯齿',
  square: '方波',
}

export default function PlaybackControls({ notes, autoPlay, compact }: PlaybackControlsProps) {
  const playerRef = useRef<MidiPlayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [waveform, setWaveform] = useState<OscType>('sine')

  const canPlay = notes.length > 0

  useEffect(() => {
    const p = new MidiPlayer()
    playerRef.current = p

    p.onProgress((t) => setProgress(t))
    p.onEnd(() => {
      setIsPlaying(false)
      setProgress(0)
    })

    return () => {
      p.destroy()
      playerRef.current = null
    }
  }, [])

  // Update duration when notes change
  useEffect(() => {
    if (notes.length > 0) {
      const maxTime = Math.max(...notes.map(n => n.start + n.duration))
      setDuration(maxTime)
    }
  }, [notes])

  const handlePlayPause = () => {
    const p = playerRef.current
    if (!p || !canPlay) return

    if (p.isPlaying) {
      p.stop()
      setIsPlaying(false)
    } else {
      p.setSpeed(speed)
      p.setWaveform(waveform)
      p.play(notes)
      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    playerRef.current?.stop()
    setIsPlaying(false)
    setProgress(0)
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handlePlayPause}
          disabled={!canPlay}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: canPlay ? colors.gold : colors.border,
            color: canPlay ? '#0a0a14' : colors.textMuted,
            cursor: canPlay ? 'pointer' : 'not-allowed',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: radii.lg,
      border: `1px solid ${colors.border}`,
      padding: spacing.md,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        {/* Play/Pause */}
        <motion.button
          onClick={handlePlayPause}
          disabled={!canPlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: canPlay ? colors.gold : colors.border,
            color: canPlay ? '#0a0a14' : colors.textMuted,
            cursor: canPlay ? 'pointer' : 'not-allowed',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </motion.button>

        {/* Stop */}
        <motion.button
          onClick={handleStop}
          disabled={!canPlay}
          whileHover={{ scale: 1.05 }}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: `1px solid ${colors.border}`,
            background: 'transparent', color: colors.textDim,
            cursor: canPlay ? 'pointer' : 'not-allowed', opacity: canPlay ? 1 : 0.4,
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ⏹
        </motion.button>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 4, background: colors.border, borderRadius: 2, position: 'relative' }}>
          <div style={{
            width: `${duration > 0 ? (progress / duration) * 100 : 0}%`,
            height: '100%', background: colors.gold, borderRadius: 2,
            transition: 'width 0.1s linear',
          }} />
        </div>

        {/* Time */}
        <span style={{ color: colors.textDim, fontSize: font.size.xs, fontFamily: font.mono, minWidth: 60 }}>
          {formatDuration(progress)} / {formatDuration(duration)}
        </span>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Speed */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: colors.textMuted, fontSize: font.size.xs }}>速度</span>
          {[0.5, 1, 1.5, 2].map(s => (
            <button
              key={s}
              onClick={() => {
                setSpeed(s)
                playerRef.current?.setSpeed(s)
              }}
              style={{
                padding: '2px 8px', borderRadius: radii.sm, border: 'none',
                background: speed === s ? colors.gold : colors.border,
                color: speed === s ? '#0a0a14' : colors.textDim,
                fontSize: font.size.xs, cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Waveform */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: colors.textMuted, fontSize: font.size.xs }}>音色</span>
          {(Object.entries(WAVEFORM_LABELS) as [OscType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setWaveform(key)
                playerRef.current?.setWaveform(key)
              }}
              style={{
                padding: '2px 8px', borderRadius: radii.sm, border: 'none',
                background: waveform === key ? colors.info : colors.border,
                color: waveform === key ? '#fff' : colors.textDim,
                fontSize: font.size.xs, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
