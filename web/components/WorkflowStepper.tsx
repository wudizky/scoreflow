import React from 'react'
import { motion } from 'framer-motion'
import { WorkflowStep, STEP_LABELS, STEP_ORDER, getStepIndex } from '../lib/workflow'
import { colors, radii, spacing, font } from '../lib/theme'

interface WorkflowStepperProps {
  currentStep: WorkflowStep
  onStepClick?: (step: WorkflowStep) => void
}

export default function WorkflowStepper({ currentStep, onStepClick }: WorkflowStepperProps) {
  const currentIdx = getStepIndex(currentStep)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      marginBottom: spacing.xl,
      padding: `${spacing.sm}px 0`,
      overflow: 'hidden',
    }}>
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture = idx > currentIdx

        const StepIcon = () => {
          if (isCompleted) return '✓'
          if (isCurrent) return `${idx + 1}`
          return `${idx + 1}`
        }

        return (
          <React.Fragment key={step}>
            {/* Connector line */}
            {idx > 0 && (
              <div style={{
                width: 40,
                height: 2,
                background: idx <= currentIdx ? colors.gold : colors.border,
                transition: 'background 0.3s',
                flexShrink: 0,
              }} />
            )}

            {/* Step node */}
            <motion.div
              onClick={() => onStepClick?.(step)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: onStepClick ? 'pointer' : 'default',
              }}
              initial={false}
              animate={isCurrent ? { scale: 1.05 } : { scale: 1 }}
            >
              <motion.div
                animate={isCurrent ? {
                  boxShadow: [`0 0 0 0 ${colors.goldGlow}`, `0 0 12px ${colors.goldGlow}`, `0 0 0 0 ${colors.goldGlow}`],
                } : {}}
                transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  background: isCompleted ? colors.gold : isCurrent ? colors.gold : colors.bgCard,
                  border: `2px solid ${isCurrent || isCompleted ? colors.gold : colors.border}`,
                  color: isCompleted || isCurrent ? '#0a0a14' : colors.textMuted,
                  transition: 'all 0.3s',
                }}
              >
                <StepIcon />
              </motion.div>
              <span style={{
                fontSize: font.size.xs,
                color: isCurrent ? colors.gold : isCompleted ? colors.textDim : colors.textMuted,
                fontWeight: isCurrent ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'color 0.3s',
              }}>
                {STEP_LABELS[step]}
              </span>
            </motion.div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
