import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Layout from '../components/Layout'
import WorkflowStepper from '../components/WorkflowStepper'
import UploadStep from '../components/steps/UploadStep'
import TranscribeStep from '../components/steps/TranscribeStep'
import ViewStep from '../components/steps/ViewStep'
import ConvertStep from '../components/steps/ConvertStep'
import CompareStep from '../components/steps/CompareStep'
import ExportStep from '../components/steps/ExportStep'
import { toast } from '../components/Toast'
import { fetchInstruments, fetchConversionPairs, transcribeAudio, convertNotes } from '../api'
import { getStepIndex, STEP_ORDER } from '../lib/workflow'
import { WorkflowStep, Instrument, ConversionPair, NoteEvent } from '../types'

export default function Home() {
  // Core state
  const [step, setStep] = useState<WorkflowStep>('upload')
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [pairs, setPairs] = useState<ConversionPair[]>([])

  // Workflow state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [sourceInstrument, setSourceInstrument] = useState<string>('piano')
  const [targetInstrument, setTargetInstrument] = useState<string>('')
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  const [conversionResult, setConversionResult] = useState<any>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load instruments on mount
  useEffect(() => {
    fetchInstruments().then(setInstruments).catch(console.error)
    fetchConversionPairs().then(setPairs).catch(console.error)
  }, [])

  // Step navigation
  const goToStep = useCallback((s: WorkflowStep) => {
    setStep(s)
    setError(null)
  }, [])

  const goNext = useCallback(() => {
    const currentIdx = getStepIndex(step)
    if (currentIdx < STEP_ORDER.length - 1) {
      goToStep(STEP_ORDER[currentIdx + 1])
    }
  }, [step, goToStep])

  const goBack = useCallback(() => {
    const currentIdx = getStepIndex(step)
    if (currentIdx > 0) {
      goToStep(STEP_ORDER[currentIdx - 1])
    }
  }, [step, goToStep])

  const resetAll = useCallback(() => {
    setStep('upload')
    setAudioFile(null)
    setSourceInstrument('piano')
    setTargetInstrument('')
    setTranscriptionResult(null)
    setConversionResult(null)
    setIsTranscribing(false)
    setIsConverting(false)
    setError(null)
  }, [])

  // Handlers
  const handleTranscribe = useCallback(async () => {
    if (!audioFile) return
    setIsTranscribing(true)
    setError(null)
    try {
      const res = await transcribeAudio(audioFile, sourceInstrument)
      if (res.status === 'error') {
        setError(res.error || '转写失败')
      } else {
        setTranscriptionResult(res)
        toast('转写完成！', 'success')
        goNext()
      }
    } catch (err: any) {
      setError(err.message || '转写失败')
    } finally {
      setIsTranscribing(false)
    }
  }, [audioFile, sourceInstrument, goNext])

  const handleConvert = useCallback(async () => {
    if (!transcriptionResult?.notes || !targetInstrument) return
    setIsConverting(true)
    setError(null)
    try {
      const res = await convertNotes(
        sourceInstrument,
        targetInstrument,
        transcriptionResult.notes,
      )
      setConversionResult(res)
      toast('转换完成！', 'success')
      goNext()
    } catch (err: any) {
      setError(err.message || '转换失败')
    } finally {
      setIsConverting(false)
    }
  }, [transcriptionResult, sourceInstrument, targetInstrument, goNext])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (step === 'upload' && audioFile) goNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, audioFile, goNext])

  return (
    <Layout>
      {/* Workflow stepper */}
      <WorkflowStepper
        currentStep={step}
        onStepClick={(s) => {
          const fromIdx = getStepIndex(step)
          const toIdx = getStepIndex(s)
          if (toIdx <= fromIdx) goToStep(s)
        }}
      />

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <UploadStep
            key="upload"
            audioFile={audioFile}
            onFileSelected={setAudioFile}
            sourceInstrument={sourceInstrument}
            onSourceChange={setSourceInstrument}
            instruments={instruments}
            onNext={() => {
              if (audioFile) {
                goToStep('transcribe')
              }
            }}
          />
        )}

        {step === 'transcribe' && (
          <TranscribeStep
            key="transcribe"
            isTranscribing={isTranscribing}
            transcriptionResult={transcriptionResult}
            error={error}
            onTranscribe={handleTranscribe}
            onRetry={handleTranscribe}
            onNext={() => goToStep('view')}
          />
        )}

        {step === 'view' && (
          <ViewStep
            key="view"
            transcriptionResult={transcriptionResult}
            sourceInstrument={sourceInstrument}
            instruments={instruments}
            onConvert={() => {
              setTargetInstrument('')
              goToStep('convert')
            }}
            onExport={() => goToStep('export')}
            onRestart={resetAll}
          />
        )}

        {step === 'convert' && (
          <ConvertStep
            key="convert"
            instruments={instruments}
            pairs={pairs}
            sourceId={sourceInstrument}
            targetId={targetInstrument}
            onSourceChange={setSourceInstrument}
            onTargetChange={setTargetInstrument}
            isConverting={isConverting}
            onConvert={handleConvert}
            onBack={goBack}
          />
        )}

        {step === 'compare' && (
          <CompareStep
            key="compare"
            originalNotes={transcriptionResult?.notes || []}
            convertedNotes={conversionResult?.notes || []}
            sourceInstrument={sourceInstrument}
            targetInstrument={targetInstrument}
            instruments={instruments}
            conversionResult={conversionResult}
            onExport={() => goToStep('export')}
            onBack={goBack}
            onRestart={resetAll}
          />
        )}

        {step === 'export' && (
          <ExportStep
            key="export"
            transcriptionResult={transcriptionResult}
            conversionResult={conversionResult}
            sourceInstrument={sourceInstrument}
            targetInstrument={targetInstrument}
            onBack={goBack}
            onRestart={resetAll}
          />
        )}
      </AnimatePresence>

      {/* Error display at bottom for non-transcribe steps */}
      {error && step !== 'transcribe' && (
        <div style={{
          marginTop: 16,
          background: '#3a1a1a', border: '1px solid #ff6b6b', borderRadius: 8,
          padding: 12, color: '#ff6b6b', fontSize: 13,
        }}>
          {error}
        </div>
      )}
    </Layout>
  )
}
