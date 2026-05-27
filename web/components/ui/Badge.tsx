import React from 'react'

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  keyboard: { bg: '#2a1a3a', text: '#ce93d8' },
  string: { bg: '#1a2a3a', text: '#64b5f6' },
  plucked: { bg: '#1a3a2a', text: '#81c784' },
  wind: { bg: '#3a2a1a', text: '#ffb74d' },
  easy: { bg: '#1a3a1a', text: '#4caf50' },
  medium: { bg: '#3a3a1a', text: '#e8c547' },
  hard: { bg: '#3a1a1a', text: '#ff6b6b' },
}

interface BadgeProps {
  children: React.ReactNode
  variant?: string
  style?: React.CSSProperties
}

export default function Badge({ children, variant, style }: BadgeProps) {
  const colors = variant ? BADGE_COLORS[variant] : { bg: '#222', text: '#888' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      background: colors.bg,
      color: colors.text,
      ...style,
    }}>
      {children}
    </span>
  )
}
