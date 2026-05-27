import { NoteEvent } from '../types'
import { midiToFrequency } from './utils'

type OscType = 'sine' | 'triangle' | 'sawtooth' | 'square'
type Callback = (time: number) => void

export class MidiPlayer {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private oscillators: OscillatorNode[] = []
  private _isPlaying = false
  private _duration = 0
  private _startTime = 0
  private _onProgress: Callback | null = null
  private _onEnd: Callback | null = null
  private _rafId: number | null = null
  private _speed = 1
  private _oscType: OscType = 'sine'

  get isPlaying() { return this._isPlaying }
  get duration() { return this._duration }
  get currentTime() {
    if (!this._isPlaying || !this._startTime) return 0
    return (performance.now() - this._startTime) / 1000
  }

  setSpeed(speed: number) { this._speed = speed }
  setWaveform(type: OscType) { this._oscType = type }

  onProgress(cb: Callback) { this._onProgress = cb }
  onEnd(cb: Callback) { this._onEnd = cb }

  play(notes: NoteEvent[]) {
    if (notes.length === 0) return
    this.stop()

    this.ctx = new AudioContext()
    this.gainNode = this.ctx.createGain()
    this.gainNode.gain.value = 0.15
    this.gainNode.connect(this.ctx.destination)

    this._duration = Math.max(...notes.map(n => n.start + n.duration)) / this._speed
    this._isPlaying = true
    this._startTime = performance.now()

    // Schedule each note using Web Audio timing (not setTimeout)
    const ctx = this.ctx
    const baseTime = ctx.currentTime
    for (const note of notes) {
      if (note.removed) continue
      const startTime = baseTime + note.start / this._speed
      const duration = note.duration / this._speed

      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()

      osc.type = this._oscType
      osc.frequency.value = midiToFrequency(note.midi)
      noteGain.gain.setValueAtTime(0.001, startTime)
      noteGain.gain.linearRampToValueAtTime((note.velocity || 80) / 127, startTime + 0.02)
      noteGain.gain.setValueAtTime((note.velocity || 80) / 127, startTime + duration - 0.05)
      noteGain.gain.linearRampToValueAtTime(0.001, startTime + duration)

      osc.connect(noteGain)
      noteGain.connect(this.gainNode!)

      osc.start(startTime)
      osc.stop(startTime + duration + 0.1)

      this.oscillators.push(osc)
    }

    // Progress tracking
    const updateProgress = () => {
      if (!this._isPlaying) return
      const elapsed = (performance.now() - this._startTime) / 1000
      this._onProgress?.(elapsed)

      if (elapsed >= this._duration) {
        this._isPlaying = false
        this._onEnd?.(elapsed)
        return
      }
      this._rafId = window.requestAnimationFrame(updateProgress)
    }
    this._rafId = window.requestAnimationFrame(updateProgress)
  }

  stop() {
    this._isPlaying = false
    this._startTime = 0

    for (const osc of this.oscillators) {
      try { osc.stop(); osc.disconnect() } catch {}
    }
    this.oscillators = []

    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId)
      this._rafId = null
    }

    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }

    this.gainNode = null
  }

  destroy() {
    this.stop()
    this._onProgress = null
    this._onEnd = null
  }
}
