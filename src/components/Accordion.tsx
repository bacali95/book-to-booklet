import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Accordion({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted text-sm font-semibold"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
      {open && <div className="px-4 py-3 space-y-4">{children}</div>}
    </div>
  );
}
