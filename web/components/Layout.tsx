import React from 'react'
import { colors, spacing } from '../lib/theme'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
    }}>
      <header style={{
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 20px',
      }}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}>
              <span style={{ color: colors.gold }}>Score</span>
              <span style={{ color: colors.text }}>Flow</span>
            </h1>
            <p style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>
              AI 跨乐器乐谱转写
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: 12 }}>
              v0.1
            </span>
          </div>
        </div>
      </header>
      <main style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: `${spacing.xl}px ${spacing.md}px`,
        width: '100%',
        flex: 1,
      }}>
        {children}
      </main>
      <footer style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 20px',
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: 11,
      }}>
        ScoreFlow — AI-Powered Music Transcription
      </footer>
    </div>
  )
}
