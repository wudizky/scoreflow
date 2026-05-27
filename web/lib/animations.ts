import { Variants } from 'framer-motion'

export const fadeIn: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export const slideUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

export const stagger: Variants = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
}

export const pulse: Variants = {
  animate: {
    opacity: [1, 0.4, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const rotate: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
}
