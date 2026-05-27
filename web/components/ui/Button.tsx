import React from 'react'
import { motion } from 'framer-motion'
import { colors, radii, spacing, font, duration } from '../../lib/theme'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
  type?: 'button' | 'submit'
}

export default function Button({
  children, onClick, disabled, loading,
  variant = 'primary', size = 'md', style, type = 'button',
}: ButtonProps) {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 14px', fontSize: font.size.sm },
    md: { padding: '10px 24px', fontSize: font.size.md },
    lg: { padding: '14px 32px', fontSize: font.size.lg },
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.gold,
      color: '#0a0a14',
      fontWeight: 600,
    },
    secondary: {
      background: colors.bgCard,
      color: colors.text,
      border: `1px solid ${colors.border}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.textDim,
    },
    danger: {
      background: colors.errorBg,
      color: colors.error,
      border: `1px solid ${colors.error}`,
    },
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      style={{
        border: 'none',
        borderRadius: radii.md,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.5 : 1,
        transition: `all ${duration.fast}s`,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 14, height: 14,
            border: '2px solid currentColor', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.6s linear infinite',
          }} />
          {children}
        </span>
      ) : children}
    </motion.button>
  )
}
