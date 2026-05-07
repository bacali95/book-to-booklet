import { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { BookletSettings } from '@/hooks/useBooklet'

interface Props {
  pageCount: number
  pdfFile: File | null
  settings: BookletSettings
  onLoadPdf: (file: File) => void
  onLoadText: (text: string, settings: BookletSettings) => void
  onClear: () => void
  onSettingsChange: (patch: Partial<BookletSettings>) => void
}

export function InputSection({ pageCount, pdfFile, settings, onLoadPdf, onLoadText, onClear, onSettingsChange }: Props) {
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [textValue, setTextValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleFile = useCallback((file: File) => {
    if (file.type === 'application/pdf') onLoadPdf(file)
  }, [onLoadPdf])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onTextChange = (val: string) => {
    setTextValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onLoadText(val, settings), 600)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const hasPdf = !!pdfFile && pageCount > 0

  return (
    <div className="space-y-4">
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

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span>or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Paste text content</Label>
        <textarea
          value={textValue}
          onChange={e => onTextChange(e.target.value)}
          rows={5}
          placeholder={'Paste your book content here…\n\nBlank lines separate paragraphs.'}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[100px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex gap-3 items-center">
          <Label className="text-xs">Font</Label>
          <Select value={settings.textFont} onValueChange={v => v != null && onSettingsChange({ textFont: v })}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="sans-serif">Sans-serif</SelectItem>
              <SelectItem value="monospace">Monospace</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-xs">Size</Label>
          <input
            type="number"
            value={settings.textFontSize}
            min={6} max={24}
            onChange={e => onSettingsChange({ textFontSize: Number(e.target.value) })}
            className="w-16 h-8 rounded-md border border-input bg-background px-2 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground">pt</span>
        </div>
      </div>
    </div>
  )
}
