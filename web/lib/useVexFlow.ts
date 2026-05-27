import { useEffect, useRef, useState } from 'react'
import { Renderer, Stave, StaveNote, Formatter, Voice, Accidental } from 'vexflow'
import { NoteEvent } from '../types'
import { toVexKey, midiToType } from './utils'

const BEATS_PER_MEASURE = 4

interface UseVexFlowOptions {
  width?: number
  height?: number
}

export function useVexFlow(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  notes: NoteEvent[],
  options?: UseVexFlowOptions,
) {
  const [error, setError] = useState<string | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const resizeRef = useRef<ResizeObserver | null>(null)
  const [frameKey, setFrameKey] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || notes.length === 0) return

    // Watch parent resize to re-render canvas
    const parent = canvas.parentElement
    if (parent && !resizeRef.current) {
      resizeRef.current = new ResizeObserver(() => setFrameKey(k => k + 1))
      resizeRef.current.observe(parent)
    }

    try {
      // Clean previous renderer
      if (rendererRef.current) {
        rendererRef.current = null
      }

      // Set canvas size from parent container
      const containerWidth = canvas.parentElement?.clientWidth || 600
      const w = options?.width || containerWidth
      const h = options?.height || 280

      canvas.width = w
      canvas.height = h
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const renderer = new Renderer(canvas, Renderer.Backends.CANVAS)
      rendererRef.current = renderer

      const ctx = renderer.getContext()
      ctx.setFont('Arial', 10)

      // Filter valid notes
      const activeNotes = notes.filter(n => !n.removed).slice(0, 60)
      if (activeNotes.length === 0) {
        setError(null)
        return
      }

      // Group notes into measures
      const measures: NoteEvent[][] = []
      let currentMeasure: NoteEvent[] = []
      let beatCount = 0
      const beatDuration = 0.5 // assumed quarter = 0.5s

      for (const note of activeNotes) {
        const beats = Math.max(1, Math.round(note.duration / beatDuration))
        if (beatCount + beats > BEATS_PER_MEASURE && currentMeasure.length > 0) {
          measures.push(currentMeasure)
          currentMeasure = [note]
          beatCount = beats
        } else {
          currentMeasure.push(note)
          beatCount += beats
        }
      }
      if (currentMeasure.length > 0) measures.push(currentMeasure)

      const staveWidth = Math.min(250, Math.max(180, (w - 50) / Math.min(measures.length, 4)))
      const staveHeight = 80
      const startX = 20
      const startY = 30

      // Draw up to 4 measures per row
      const measuresPerRow = Math.min(4, measures.length)
      const rows = Math.ceil(measures.length / measuresPerRow)

      for (let row = 0; row < rows; row++) {
        const rowMeasures = measures.slice(row * measuresPerRow, (row + 1) * measuresPerRow)
        const y = startY + row * (staveHeight + 20)

        for (let i = 0; i < rowMeasures.length; i++) {
          const x = startX + i * (staveWidth + 10)
          const stave = new Stave(x, y, staveWidth)

          if (row === 0 && i === 0) {
            stave.addClef('treble').addTimeSignature('4/4')
          }

          stave.setContext(ctx).draw()

          // Attempt to render notes
          try {
            const vexNotes = rowMeasures[i]
              .filter(n => !n.removed)
              .slice(0, 4) // Max 4 notes per measure for simplicity
              .map(n => {
                const keys = [toVexKey(n.midi)]
                const dur = midiToType(n.duration)
                try {
                  const sn = new StaveNote({ keys, duration: dur })
                  // Add accidental if needed
                  const noteIdx = n.midi % 12
                  if ([1, 3, 6, 8, 10].includes(noteIdx)) {
                    sn.addModifier(new Accidental('#'))
                  }
                  return sn
                } catch {
                  return new StaveNote({ keys: ['c/4'], duration: 'q' })
                }
              })

            if (vexNotes.length > 0) {
              const voice = new Voice({ numBeats: BEATS_PER_MEASURE, beatValue: 4 })
              voice.addTickables(vexNotes)

              new Formatter().joinVoices([voice]).format([voice], staveWidth - 10)
              voice.draw(ctx, stave)
            }
          } catch {
            // Skip measure rendering on error
          }
        }
      }

      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'VexFlow rendering failed')
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current = null
      }
      if (resizeRef.current) {
        resizeRef.current.disconnect()
        resizeRef.current = null
      }
    }
  }, [notes, options?.width, options?.height, frameKey])

  return { error }
}
