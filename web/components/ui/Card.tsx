import React from 'react'
import { motion } from 'framer-motion'
import { colors, radii, spacing, shadows } from '../../lib/theme'
import { scaleIn } from '../../lib/animations'

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  hoverable?: boolean
  selected?: boolean
  onClick?: () => void
  padding?: string
}

export default function Card({
  children, style, hoverable, selected, onClick, padding,
}: CardProps) {
  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      onClick={onClick}
      style={{
        background: colors.bgCard,
        borderRadius: radii.lg,
        border: `1px solid ${selected ? colors.gold : colors.border}`,
        padding: padding || spacing.xl + 'px',
        boxShadow: selected ? shadows.glow : shadows.card,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all 0.2s',
        ...style,
      }}
      whileHover={hoverable ? { y: -2, borderColor: colors.goldDim } : undefined}
    >
      {children}
    </motion.div>
  )
}
