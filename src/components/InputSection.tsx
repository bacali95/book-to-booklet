import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  pageCount: number
  pdfFile: File | null
  onLoadPdf: (file: File) => void
  onClear: () => void
}

export function InputSection({ pageCount, pdfFile, onLoadPdf, onClear }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (file.type === 'application/pdf') onLoadPdf(file)
  }, [onLoadPdf])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const hasPdf = !!pdfFile && pageCount > 0

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Input</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {hasPdf ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-medium">{pdfFile.name}</span>
          <span className="text-muted-foreground shrink-0">{pageCount} pages</span>
          <Button size="icon" variant="ghost" className="size-6" onClick={onClear}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8',
            'cursor-pointer transition-colors text-muted-foreground hover:border-primary/50 hover:bg-muted/30',
            dragging && 'border-primary bg-primary/5',
          )}
        >
          <Upload className="size-8 opacity-50" />
          <p className="text-sm font-medium">Drop PDF here or click to browse</p>
          <p className="text-xs">Accepts: PDF files</p>
        </div>
      )}
    </div>
  )
}
