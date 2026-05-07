import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getPaperSize, creepOffset, type BookletLayout, type Direction } from './engine'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface SourcePage {
  canvas: HTMLCanvasElement
  naturalW: number
  naturalH: number
}


export async function loadPdfPages(
  file: File,
  quality: number,
  onProgress?: (done: number, total: number) => void,
): Promise<SourcePage[]> {
  const buffer = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages: SourcePage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page     = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: quality })
    const canvas   = document.createElement('canvas')
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    pages.push({ canvas, naturalW: viewport.width / quality, naturalH: viewport.height / quality })
    onProgress?.(i, pdf.numPages)
  }
  return pages
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92): Uint8Array {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const b64     = dataUrl.split(',')[1]!
  const binary  = atob(b64)
  const bytes   = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export interface GenerateOptions {
  paperSize?: string
  scaling?: 'fit' | 'fill' | 'actual' | 'custom'
  customScale?: number
  bindingMarginMm?: number
  outerMarginMm?: number
  cropMarks?: boolean
  centerLine?: boolean
  blankColor?: 'white' | 'gray'
  pageNumbers?: 'none' | 'bottom-center' | 'outer' | 'inner'
  creepMm?: number
  direction?: Direction
  onProgress?: (done: number, total: number) => void
}

export async function generateBookletPdf(
  sourcePages: SourcePage[],
  layout: BookletLayout,
  opts: GenerateOptions = {},
): Promise<Blob> {
  const {
    paperSize       = 'A4',
    scaling         = 'fit',
    customScale     = 1,
    bindingMarginMm = 10,
    outerMarginMm   = 5,
    cropMarks       = false,
    centerLine      = false,
    blankColor      = 'white',
    pageNumbers     = 'none',
    creepMm         = 0,
    direction       = 'ltr',
    onProgress,
  } = opts

  const doc   = await PDFDocument.create()
  const font  = await doc.embedFont(StandardFonts.Helvetica)

  const paper = getPaperSize(paperSize)
  const outW  = paper.h   // landscape
  const outH  = paper.w
  const halfW = outW / 2

  const MM    = (v: number) => v * 2.8346
  const bindM = MM(bindingMarginMm)
  const outM  = MM(outerMarginMm)
  const CROP  = 6

  let done = 0

  for (const op of layout.outputPages) {
    const page = doc.addPage([outW, outH])
    const { left: lIdx, right: rIdx, sheetIndex } = op

    const shPerSig = layout.sheetsPerSignature
    const creepPts = creepOffset(sheetIndex, shPerSig, creepMm)
    const lCreep   = direction === 'rtl' ? -creepPts : creepPts
    const rCreep   = -lCreep

    const drawPage = async (pageIdx: number, xOff: number, isRight: boolean) => {
      const bm      = bindM + (isRight ? rCreep : lCreep)
      const usableW = halfW - bm - outM
      const usableH = outH - 2 * outM

      if (pageIdx === -1) {
        if (blankColor === 'gray') {
          page.drawRectangle({ x: xOff, y: 0, width: halfW, height: outH,
            color: rgb(0.93, 0.93, 0.93) })
        }
        return
      }

      const src  = sourcePages[pageIdx]!
      const srcW = src.naturalW
      const srcH = src.naturalH

      let pw: number, ph: number
      if (scaling === 'fit') {
        const s = Math.min(usableW / srcW, usableH / srcH)
        pw = srcW * s; ph = srcH * s
      } else if (scaling === 'fill') {
        const s = Math.max(usableW / srcW, usableH / srcH)
        pw = srcW * s; ph = srcH * s
      } else if (scaling === 'custom') {
        pw = srcW * customScale; ph = srcH * customScale
      } else {
        pw = srcW; ph = srcH
      }

      const xStart = isRight ? xOff + bm : xOff + outM
      const px = xStart + (usableW - pw) / 2
      const py = outM   + (usableH - ph) / 2

      const img = await doc.embedJpg(canvasToJpeg(src.canvas))
      page.drawImage(img, { x: px, y: py, width: pw, height: ph })
    }

    await drawPage(lIdx, 0, false)
    await drawPage(rIdx, halfW, true)

    if (centerLine) {
      page.drawLine({ start: { x: halfW, y: 0 }, end: { x: halfW, y: outH },
        thickness: 0.5, color: rgb(0.7, 0.7, 0.7), dashArray: [4, 4] })
    }

    if (cropMarks) {
      const gray = rgb(0.4, 0.4, 0.4)
      const lns: [[number, number], [number, number]][] = [
        [[0, 0], [CROP, 0]], [[0, 0], [0, CROP]],
        [[outW, 0], [outW - CROP, 0]], [[outW, 0], [outW, CROP]],
        [[0, outH], [CROP, outH]], [[0, outH], [0, outH - CROP]],
        [[outW, outH], [outW - CROP, outH]], [[outW, outH], [outW, outH - CROP]],
        [[halfW, 0], [halfW, CROP]], [[halfW, outH], [halfW, outH - CROP]],
      ]
      for (const [[x1, y1], [x2, y2]] of lns) {
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 },
          thickness: 0.5, color: gray })
      }
    }

    if (pageNumbers !== 'none') {
      const drawNum = (idx: number, xOff: number, isRight: boolean) => {
        if (idx < 0) return
        const num = String(idx + 1)
        const fs  = 7
        let x: number, y: number
        if (pageNumbers === 'bottom-center') {
          x = xOff + halfW / 2
          y = outM - 2
        } else if (pageNumbers === 'outer') {
          x = isRight ? xOff + halfW - outM : xOff + outM
          y = outM / 2
        } else {
          x = isRight ? xOff + bindM + 4 : xOff + halfW - bindM - 4
          y = outM / 2
        }
        page.drawText(num, { x, y, size: fs, font, color: rgb(0.3, 0.3, 0.3) })
      }
      drawNum(lIdx, 0, false)
      drawNum(rIdx, halfW, true)
    }

    done++
    onProgress?.(done, layout.outputPages.length)
  }

  const bytes = await doc.save()
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}
