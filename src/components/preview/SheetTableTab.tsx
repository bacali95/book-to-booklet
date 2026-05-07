import type { BookletLayout } from '@/lib/engine'
import { cn } from '@/lib/utils'

interface Props {
  layout: BookletLayout
}

export function SheetTableTab({ layout }: Props) {
  const fmt = (idx: number) =>
    idx >= 0
      ? <span>{`p.${idx + 1}`}</span>
      : <span className="text-muted-foreground italic">blank</span>

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-3 gap-2 text-sm">
        {[
          ['Total pages',   layout.pageCount],
          ['Padded to',     layout.padded],
          ['Signatures',    layout.numSignatures],
          ['Sheets/sig',    layout.sheetsPerSignature],
          ['Output pages',  layout.outputPages.length],
          ['Direction',     layout.direction.toUpperCase()],
        ].map(([label, value]) => (
          <div key={label as string} className="flex flex-col gap-0.5 rounded-md border border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-semibold">{value as string}</span>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>Sheet</th>
              <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>Sig</th>
              <th className="px-3 py-2 text-center font-semibold border-l border-border" colSpan={2}>Front (side 1)</th>
              <th className="px-3 py-2 text-center font-semibold border-l border-border" colSpan={2}>Back (side 2)</th>
            </tr>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-1.5 text-left border-l border-border">Left</th>
              <th className="px-3 py-1.5 text-left">Right</th>
              <th className="px-3 py-1.5 text-left border-l border-border">Left</th>
              <th className="px-3 py-1.5 text-left">Right</th>
            </tr>
          </thead>
          <tbody>
            {layout.sheets.map((sheet, i) => (
              <tr key={i} className={cn('border-b border-border last:border-0', sheet.isCoverSheet && 'bg-amber-50 dark:bg-amber-950/20')}>
                <td className="px-3 py-2 font-medium">
                  {sheet.isCoverSheet ? <span className="text-amber-700 dark:text-amber-400">Cover</span> : i + 1}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{sheet.sigIndex + 1}</td>
                <td className="px-3 py-2 border-l border-border">{fmt(sheet.front.left)}</td>
                <td className="px-3 py-2">{fmt(sheet.front.right)}</td>
                <td className="px-3 py-2 border-l border-border">{fmt(sheet.back.left)}</td>
                <td className="px-3 py-2">{fmt(sheet.back.right)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
