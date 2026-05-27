import React, { useRef, useState } from 'react'
import { NoteEvent } from '../types'
import { useVexFlow } from '../lib/useVexFlow'
import { noteName } from '../lib/utils'
import { colors, radii, spacing, font } from '../lib/theme'
import { motion, AnimatePresence } from 'framer-motion'

interface SheetMusicViewerProps {
  notes: NoteEvent[]
  title?: string
}

export default function SheetMusicViewer({ notes, title }: SheetMusicViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { error } = useVexFlow(canvasRef, notes)
  const [showData, setShowData] = useState(false)
  const [containerWidth, setContainerWidth] = useState(800)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeNotes = notes.filter(n => !n.removed)

  return (
    <div ref={containerRef}>
      {/* Title */}
      {title && (
        <h4 style={{ color: colors.textDim, fontSize: font.size.sm, marginBottom: spacing.sm }}>
          {title}
        </h4>
      )}

      {/* Empty state */}
      {notes.length === 0 ? (
        <div style={{
          background: colors.bgCard, borderRadius: radii.lg,
          border: `1px dashed ${colors.border}`,
          padding: spacing.xxl, textAlign: 'center',
          color: colors.textMuted, fontSize: font.size.sm,
        }}>
          乐谱将在转录后显示在此处
        </div>
      ) : (
        <>
          {/* Error overlay */}
          {error && (
            <div style={{
              background: colors.errorBg, color: colors.error,
              padding: '8px 12px', borderRadius: radii.sm,
              fontSize: font.size.xs, marginBottom: spacing.sm,
            }}>
              乐谱渲染错误: {error}（显示简化视图）
            </div>
          )}

          {/* Canvas for VexFlow - width set dynamically by useVexFlow hook */}
          <div ref={containerRef} style={{
            background: `${colors.bgCard}`, borderRadius: radii.md,
            padding: spacing.sm, marginBottom: spacing.sm,
            overflow: 'hidden',
          }}>
            <canvas
              ref={canvasRef}
              style={{ display: 'block' }}
            />
          </div>

          {/* Summary stats */}
          <div style={{
            display: 'flex', gap: spacing.md, flexWrap: 'wrap',
            marginBottom: spacing.md, fontSize: font.size.xs, color: colors.textDim,
          }}>
            <span>音符: <strong style={{ color: colors.gold }}>{activeNotes.length}</strong></span>
            <span>已移除: <strong style={{ color: colors.error }}>
              {notes.length - activeNotes.length}
            </strong></span>
          </div>
        </>
      )}

      {/* Toggle note data table */}
      <button
        onClick={() => setShowData(!showData)}
        style={{
          background: 'none', border: 'none', color: colors.textMuted,
          fontSize: font.size.xs, cursor: 'pointer', padding: '4px 0',
        }}
      >
        {showData ? '▲ 隐藏音符数据' : '▼ 显示音符数据'}
      </button>

      <AnimatePresence>
        {showData && activeNotes.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              maxHeight: 180, overflowY: 'auto',
              fontFamily: font.mono, fontSize: font.size.xs,
              background: colors.bgCard, borderRadius: radii.sm,
              padding: spacing.sm, marginTop: spacing.xs,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {['音名', 'MIDI', '开始', '时长', '力度'].map(h => (
                      <th key={h} style={{
                        padding: '4px 6px', textAlign: 'left',
                        color: colors.textMuted, fontWeight: 500, fontSize: 10,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeNotes.slice(0, 50).map((n, i) => (
                    <tr key={i} style={{
                      borderBottom: `1px solid ${colors.border}`,
                      color: n.removed ? colors.error : colors.textDim,
                    }}>
                      <td style={{ padding: '3px 6px' }}>{noteName(n.midi)}</td>
                      <td style={{ padding: '3px 6px' }}>{n.midi}</td>
                      <td style={{ padding: '3px 6px' }}>{n.start.toFixed(2)}s</td>
                      <td style={{ padding: '3px 6px' }}>{n.duration.toFixed(2)}s</td>
                      <td style={{ padding: '3px 6px' }}>{n.velocity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeNotes.length > 50 && (
                <p style={{ padding: 8, color: colors.textMuted, textAlign: 'center', fontSize: 10 }}>
                  ... 还有 {activeNotes.length - 50} 个音符
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
