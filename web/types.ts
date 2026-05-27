export interface Instrument {
  id: string
  name: string
  name_zh: string
  category: string
  range_low: number
  range_high: number
  midi_program: number | null
}

export interface ConversionPair {
  source_id: string
  source_name: string
  target_id: string
  target_name: string
  compatible: boolean
  difficulty: number
  has_preset: boolean
}

export interface NoteEvent {
  midi: number
  start: number
  duration: number
  velocity: number
  confidence?: number
  original_midi?: number
  removed?: boolean
  tempo?: number
}

export type WorkflowStep =
  | 'upload'
  | 'transcribe'
  | 'view'
  | 'convert'
  | 'compare'
  | 'export'
