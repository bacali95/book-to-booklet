import { useState, useCallback, useRef } from 'react'
import { computeLayout, type BookletLayout, type Direction } from '@/lib/engine'
import { loadPdfPages, generateBookletPdf, type SourcePage } from '@/lib/renderer'

export type ScalingMode = 'fit' | 'fill' | 'actual' | 'custom'
export type FlipMode = 'long' | 'short'
export type PageNumbersMode = 'none' | 'bottom-center' | 'outer' | 'inner'
export type BlankColor = 'white' | 'gray'

export interface BookletSettings {
  direction: Direction
  signatureSize: number
  flip: FlipMode
  paperSize: string
  scaling: ScalingMode
  customScale: number
  bindingMarginMm: number
  outerMarginMm: number
  pageNumbers: PageNumbersMode
  separateCover: boolean
  cropMarks: boolean
  centerLine: boolean
  blankPageMark: boolean
  blankColor: BlankColor
  quality: number
  creepMm: number
}

export const DEFAULT_SETTINGS: BookletSettings = {
  direction: 'ltr',
  signatureSize: 8,
  flip: 'long',
  paperSize: 'A4',
  scaling: 'fit',
  customScale: 1,
  bindingMarginMm: 10,
  outerMarginMm: 5,
  pageNumbers: 'none',
  separateCover: true,
  cropMarks: false,
  centerLine: false,
  blankPageMark: false,
  blankColor: 'white',
  quality: 2,
  creepMm: 0,
}

export interface BookletState {
  sourcePages: SourcePage[]
  pageCount: number
  layout: BookletLayout | null
  generating: boolean
  progress: { pct: number; text: string } | null
  settings: BookletSettings
  pdfFile: File | null
}

export function useBooklet() {
  const [state, setState] = useState<BookletState>({
    sourcePages: [],
    pageCount: 0,
    layout: null,
    generating: false,
    progress: null,
    settings: DEFAULT_SETTINGS,
    pdfFile: null,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const updateSettings = useCallback((patch: Partial<BookletSettings>) => {
    setState(s => {
      const next = { ...s.settings, ...patch }
      const layout = s.pageCount > 0
        ? computeLayout(s.pageCount, {
            signatureSize: next.signatureSize,
            direction:     next.direction,
            separateCover: next.separateCover,
          })
        : null
      return { ...s, settings: next, layout }
    })
  }, [])

  const recomputeLayout = useCallback((pageCount: number, settings: BookletSettings) => {
    if (!pageCount) return null
    return computeLayout(pageCount, {
      signatureSize: settings.signatureSize,
      direction:     settings.direction,
      separateCover: settings.separateCover,
    })
  }, [])

  const loadPdf = useCallback(async (file: File) => {
    setState(s => ({ ...s, progress: { pct: 0, text: 'Loading PDF…' } }))
    try {
      const pages = await loadPdfPages(file, 2, (done, total) => {
        setState(s => ({
          ...s,
          progress: { pct: (done / total) * 100, text: `Loading page ${done}/${total}…` },
        }))
      })
      setState(s => {
        const layout = recomputeLayout(pages.length, s.settings)
        return { ...s, sourcePages: pages, pageCount: pages.length, layout, pdfFile: file, progress: null }
      })
    } catch (err) {
      setState(s => ({ ...s, progress: null }))
      throw err
    }
  }, [recomputeLayout])

  const clearSource = useCallback(() => {
    setState(s => ({ ...s, sourcePages: [], pageCount: 0, layout: null, pdfFile: null, progress: null }))
  }, [])

  const generate = useCallback(async () => {
    const { sourcePages, layout, settings, pdfFile, generating } = stateRef.current
    if (generating || !layout) return

    setState(s => ({ ...s, generating: true, progress: { pct: 0, text: 'Generating booklet…' } }))

    try {
      let pages = sourcePages
      if (settings.quality !== 2 && pdfFile) {
        setState(s => ({ ...s, progress: { pct: 0, text: 'Re-rendering at chosen quality…' } }))
        pages = await loadPdfPages(pdfFile, settings.quality, (d, t) => {
          setState(s => ({
            ...s,
            progress: { pct: (d / t) * 40, text: `Rendering page ${d}/${t}…` },
          }))
        })
      }

      const blob = await generateBookletPdf(pages, layout, {
        paperSize:       settings.paperSize,
        scaling:         settings.scaling,
        customScale:     settings.customScale,
        bindingMarginMm: settings.bindingMarginMm,
        outerMarginMm:   settings.outerMarginMm,
        cropMarks:       settings.cropMarks,
        centerLine:      settings.centerLine,
        blankColor:      settings.blankColor,
        pageNumbers:     settings.pageNumbers,
        creepMm:         settings.creepMm,
        direction:       settings.direction,
        onProgress: (done, total) => {
          setState(s => ({
            ...s,
            progress: { pct: 40 + (done / total) * 60, text: `Imposing page ${done}/${total}…` },
          }))
        },
      })

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = 'booklet.pdf'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } finally {
      setState(s => ({ ...s, generating: false, progress: null }))
    }
  }, [])

  return { state, updateSettings, loadPdf, clearSource, generate }
}
