import { Instrument, ConversionPair, NoteEvent } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

async function apiCall<T>(fn: () => Promise<Response>): Promise<T> {
  const res = await fn()
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function fetchInstruments(): Promise<Instrument[]> {
  const data = await apiCall<{ instruments: Instrument[] }>(() =>
    fetch(`${API_BASE}/instruments`)
  )
  return data.instruments
}

export async function fetchConversionPairs(): Promise<ConversionPair[]> {
  const data = await apiCall<{ pairs: ConversionPair[] }>(() =>
    fetch(`${API_BASE}/conversion-pairs`)
  )
  return data.pairs
}

export async function transcribeAudio(
  file: File,
  instrument: string,
  separateStems = false,
  outputFormat = 'musicxml'
): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('instrument', instrument)
  formData.append('separate_stems', String(separateStems))
  formData.append('output_format', outputFormat)

  return apiCall(() => fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  }))
}

export async function convertNotes(
  sourceId: string,
  targetId: string,
  notes: NoteEvent[]
): Promise<any> {
  const formData = new FormData()
  formData.append('source_id', sourceId)
  formData.append('target_id', targetId)
  formData.append('notes', JSON.stringify(notes))

  return apiCall(() => fetch(`${API_BASE}/convert`, {
    method: 'POST',
    body: formData,
  }))
}

export async function transcribeAndConvert(
  file: File,
  sourceInstrument: string,
  targetInstrument: string
): Promise<Blob> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('source_instrument', sourceInstrument)
  formData.append('target_instrument', targetInstrument)

  const res = await fetch(`${API_BASE}/audio-to-converted`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
