export type WorkflowStep =
  | 'upload'
  | 'transcribe'
  | 'view'
  | 'convert'
  | 'compare'
  | 'export'

export const STEP_LABELS: Record<WorkflowStep, string> = {
  upload: '上传音频',
  transcribe: 'AI 转写',
  view: '查看乐谱',
  convert: '转换乐器',
  compare: '对比结果',
  export: '导出',
}

export const STEP_ORDER: WorkflowStep[] = [
  'upload', 'transcribe', 'view', 'convert', 'compare', 'export',
]

export function getStepIndex(step: WorkflowStep): number {
  return STEP_ORDER.indexOf(step)
}

export function canGoNext(step: WorkflowStep, state: Record<string, any>): boolean {
  switch (step) {
    case 'upload':
      return !!state.audioFile
    case 'transcribe':
      return !!state.transcriptionResult
    case 'view':
      return true
    case 'convert':
      return !!state.conversionResult
    case 'compare':
      return true
    case 'export':
      return true
    default:
      return false
  }
}
