const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function noteName(midi: number): string {
  return midiToNoteName(midi)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}

export function midiToType(durationQuarters: number): string {
  if (durationQuarters >= 4) return 'w'
  if (durationQuarters >= 2) return 'h'
  if (durationQuarters >= 1) return 'q'
  if (durationQuarters >= 0.5) return '8'
  if (durationQuarters >= 0.25) return '16'
  return '32'
}

export function toVexKey(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const noteIdx = midi % 12
  const naturalNames = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b']
  const accMap: Record<number, string> = { 1: '#', 3: '#', 6: '#', 8: '#', 10: '#' }
  const base = naturalNames[noteIdx]
  const acc = accMap[noteIdx] || ''
  return `${base}${acc}/${octave}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
