import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
  title?: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function ToggleGroup<T extends string>({ options, value, onChange, className }: Props<T>) {
  return (
    <div className={cn('flex rounded-md border border-border overflow-hidden', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
