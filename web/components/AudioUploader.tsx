import React, { useCallback, useState } from 'react'

interface AudioUploaderProps {
  onFileSelected: (file: File) => void
}

export default function AudioUploader({ onFileSelected }: AudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && /\.(mp3|wav|m4a|flac|ogg)$/i.test(file.name)) {
      onFileSelected(file)
    }
  }, [onFileSelected])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }, [onFileSelected])

  return (
    <div
      className={`uploader ${dragActive ? 'active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      style={{
        border: '2px dashed #666',
        borderRadius: 12,
        padding: 48,
        textAlign: 'center',
        cursor: 'pointer',
        background: dragActive ? '#1a1a2e' : '#0f0f1a',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        accept=".mp3,.wav,.m4a,.flac,.ogg"
        onChange={handleChange}
        style={{ display: 'none' }}
        id="audio-input"
      />
      <label htmlFor="audio-input" style={{ cursor: 'pointer' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
        <p style={{ fontSize: 16, color: '#aaa' }}>
          Drop audio file here or click to upload
        </p>
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          MP3, WAV, M4A, FLAC, OGG (max 50MB)
        </p>
      </label>
    </div>
  )
}
