import React from 'react'
import { colors, radii } from '../../lib/theme'

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'sheet-music'
  lines?: number
}

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

export default function LoadingSkeleton({ type = 'text', lines = 3 }: LoadingSkeletonProps) {
  const bg = `linear-gradient(90deg, ${colors.bgCard} 25%, ${colors.bgCardHover} 50%, ${colors.bgCard} 75%)`
  const bgSize = '200% 100%'

  if (type === 'sheet-music') {
    return (
      <div>
        <style>{shimmer}</style>
        <div style={{
          background: `${bg}`,
          backgroundSize: bgSize,
          animation: 'shimmer 2s infinite',
          borderRadius: radii.md,
          height: 250,
          width: '100%',
        }} />
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: radii.lg,
        border: `1px solid ${colors.border}`,
        padding: 24,
      }}>
        <style>{shimmer}</style>
        <div style={{
          background: `${bg}`,
          backgroundSize: bgSize,
          animation: 'shimmer 2s infinite',
          borderRadius: radii.sm,
          height: 20,
          width: '60%',
          marginBottom: 12,
        }} />
        <div style={{
          background: `${bg}`,
          backgroundSize: bgSize,
          animation: 'shimmer 2s infinite',
          borderRadius: radii.sm,
          height: 14,
          width: '40%',
        }} />
      </div>
    )
  }

  return (
    <div>
      <style>{shimmer}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          background: `${bg}`,
          backgroundSize: bgSize,
          animation: 'shimmer 2s infinite',
          borderRadius: radii.sm,
          height: 12,
          width: `${60 + Math.random() * 30}%`,
          marginBottom: 8,
        }} />
      ))}
    </div>
  )
}
