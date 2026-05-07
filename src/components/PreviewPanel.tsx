import { useState } from "react";
import { PageOrderTab } from "./preview/PageOrderTab";
import { SheetTableTab } from "./preview/SheetTableTab";
import { BookViewTab } from "./preview/BookViewTab";
import type { BookletState } from "@/hooks/useBooklet";

type Tab = "sheets" | "book" | "table";

export function PreviewPanel({ state }: { state: BookletState }) {
  const [tab, setTab] = useState<Tab>("sheets");
  const { layout, sourcePages, pageCount } = state;

  if (!layout) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-fg3 min-h-0">
        <svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-30"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <p className="text-[14px]">Upload a PDF to see the booklet layout</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; sub: string; icon: string }[] = [
    {
      id: "sheets",
      label: "Print sheets",
      sub: "what comes out of the printer",
      icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    },
    {
      id: "book",
      label: "Folded booklet",
      sub: "what it looks like when read",
      icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    },
    {
      id: "table",
      label: "Table",
      sub: "page assignment list",
      icon: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    },
  ];

  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-1 px-5 py-3 border-b border-line bg-e1">
        <div className="flex gap-[3px] bg-e2 border border-line rounded-[10px] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-[13px] font-medium border-none cursor-pointer transition-all
                ${tab === t.id ? "bg-e3 text-fg shadow-sm" : "bg-transparent text-fg2 hover:text-fg"}`}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: t.icon }}
              />
              {t.label}
              <span
                className={`text-[11px] font-mono font-normal ${tab === t.id ? "text-fg2" : "text-fg3"}`}
              >
                {t.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {tab === "sheets" && (
          <PageOrderTab
            layout={layout}
            sourcePages={sourcePages}
            pageCount={pageCount}
          />
        )}
        {tab === "book" && (
          <BookViewTab
            pageCount={pageCount}
            direction={layout.direction}
            sourcePages={sourcePages}
          />
        )}
        {tab === "table" && <SheetTableTab layout={layout} />}
      </div>
    </div>
  );
}
