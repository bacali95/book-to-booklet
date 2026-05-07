import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BookletLayout } from '@/lib/engine'
import type { SourcePage } from '@/lib/renderer'

interface Props {
  layout: BookletLayout
  sourcePages: SourcePage[]
  pageCount: number
}

const THUMB_H = 200

function PageThumb({ idx, sourcePages, pageCount }: { idx: number; sourcePages: SourcePage[]; pageCount: number }) {
  const isBlank     = idx < 0
  const isCover     = idx === 0
  const isBackCover = idx === pageCount - 1
  const src         = isBlank ? null : sourcePages[idx]

  const thumbCanvas = useMemo(() => {
    if (!src) return null
    const c   = src.canvas
    const srcH = src.naturalH || c.height
    const srcW = src.naturalW || c.width
    const s    = THUMB_H / srcH
    const el   = document.createElement('canvas')
    el.width   = Math.round(srcW * s)
    el.height  = Math.round(srcH * s)
    el.getContext('2d')!.drawImage(c, 0, 0, el.width, el.height)
    return el
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  return (
    <div className={cn('flex flex-col items-center gap-1', isBlank && 'opacity-50')}>
      {thumbCanvas ? (
        <img
          src={thumbCanvas.toDataURL()}
          alt={`Page ${idx + 1}`}
          className={cn(
            'border border-border rounded shadow-sm object-contain',
            isCover     && 'ring-2 ring-blue-500',
            isBackCover && 'ring-2 ring-purple-500',
          )}
          style={{ height: THUMB_H }}
        />
      ) : (
        <div
          className="border-2 border-dashed border-border rounded bg-muted/30 flex items-center justify-center"
          style={{ width: Math.round(THUMB_H * 0.707), height: THUMB_H }}
        >
          <span className="text-xs text-muted-foreground">blank</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {isBlank ? (
          <span className="text-xs text-muted-foreground">blank</span>
        ) : (
          <span className="text-xs font-medium">p.{idx + 1}</span>
        )}
        {isCover     && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700">Cover</Badge>}
        {isBackCover && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700">Back</Badge>}
      </div>
    </div>
  )
}

export function PageOrderTab({ layout, sourcePages, pageCount }: Props) {
  return (
    <div className="space-y-6 pb-4">
      {layout.sheets.map((sheet, si) => {
        const prevSheet = si > 0 ? layout.sheets[si - 1] : null
        const showSigLabel =
          !sheet.isCoverSheet && (
            prevSheet?.isCoverSheet ||
            (si === 0) ||
            (prevSheet && prevSheet.sigIndex !== sheet.sigIndex)
          )

        return (
          <div key={si} className={cn('space-y-3', sheet.isCoverSheet && 'ring-1 ring-amber-300 rounded-lg p-3')}>
            {sheet.isCoverSheet && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                ★ Cover Sheet — print front only, back is blank
              </p>
            )}
            {showSigLabel && (
              <p className="text-xs font-semibold text-muted-foreground">
                {layout.numSignatures > 1
                  ? `Inner booklet — Signature ${sheet.sigIndex + 1}`
                  : 'Inner booklet'}
              </p>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/40 text-xs font-medium text-muted-foreground">
                {sheet.isCoverSheet ? 'Cover Sheet' : `Sheet ${si + 1}`}
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: sheet.isCoverSheet ? 'Front (print this side only)' : 'Front — side 1', side: sheet.front },
                  { label: sheet.isCoverSheet ? 'Back (leave blank)'           : 'Back — side 2',  side: sheet.back  },
                ].map(({ label, side }) => (
                  <div key={label} className={cn('p-3', sheet.isCoverSheet && label.includes('Back') && 'opacity-40 bg-muted/20')}>
                    <p className="text-xs text-muted-foreground mb-3">{label}</p>
                    <div className="flex gap-4 justify-center">
                      <PageThumb idx={side.left}  sourcePages={sourcePages} pageCount={pageCount} />
                      <PageThumb idx={side.right} sourcePages={sourcePages} pageCount={pageCount} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
