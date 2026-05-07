import { useEffect, useRef, useState, useCallback } from "react";
import type { Direction } from "@/lib/engine";
import type { SourcePage } from "@/lib/renderer";

interface Spread {
  left: number;
  right: number;
  isCover?: boolean;
  isBack?: boolean;
}

function buildSpreads(pageCount: number, direction: Direction): Spread[] {
  if (!pageCount) return [];
  const s: Spread[] = [];
  s.push({ left: -1, right: 0, isCover: true });
  for (let i = 1; i <= pageCount - 2; i += 2) {
    const a = i,
      b = i + 1 <= pageCount - 2 ? i + 1 : -1;
    s.push(direction === "rtl" ? { left: b, right: a } : { left: a, right: b });
  }
  if (pageCount > 1) s.push({ left: pageCount - 1, right: -1, isBack: true });
  return s;
}

function BookHalf({
  pageIdx,
  sourcePages,
  width,
  height,
}: {
  pageIdx: number;
  sourcePages: SourcePage[];
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = document.documentElement.dataset.theme === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const S = 2;
    canvas.width = width * S;
    canvas.height = height * S;
    const ctx = canvas.getContext("2d")!;
    if (pageIdx < 0) {
      ctx.fillStyle = isDark ? "#1c1a17" : "#f0ede8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.fillStyle = isDark ? "#2a2720" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const src = sourcePages[pageIdx];
    if (src) {
      const sc = Math.min(
        (width * S) / src.naturalW,
        (height * S) / src.naturalH,
      );
      const dw = src.naturalW * sc,
        dh = src.naturalH * sc;
      ctx.drawImage(
        src.canvas,
        (width * S - dw) / 2,
        (height * S - dh) / 2,
        dw,
        dh,
      );
    }
  }, [pageIdx, sourcePages, width, height, isDark]);

  return <canvas ref={canvasRef} style={{ width, height, display: "block" }} />;
}

interface Props {
  pageCount: number;
  direction: Direction;
  sourcePages: SourcePage[];
}

export function BookViewTab({ pageCount, direction, sourcePages }: Props) {
  const spreads = buildSpreads(pageCount, direction);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [pageCount, direction]);

  const src = sourcePages[0];
  const aspect = src
    ? (src.naturalW || src.canvas.width) / (src.naturalH || src.canvas.height)
    : 1 / Math.SQRT2;
  const H = Math.min(300, Math.max(220, window.innerHeight - 420));
  const W = Math.round(H * aspect);

  const spread = spreads[idx];
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIdx((i) => Math.min(spreads.length - 1, i + 1)),
    [spreads.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        direction === "rtl" ? next() : prev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        direction === "rtl" ? prev() : next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [direction, next, prev]);

  if (!spread) return null;

  const pct = spreads.length > 1 ? (idx / (spreads.length - 1)) * 100 : 0;
  const label = spread.isCover
    ? "Cover"
    : spread.isBack
      ? "Back cover"
      : `Spread ${idx} / ${spreads.length - 2}`;

  const ArrowLeft = () => (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
  const ArrowRight = () => (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );

  const btnCls =
    "w-8 h-8 rounded-lg border border-line bg-e2 text-fg2 flex items-center justify-center cursor-pointer hover:bg-e3 disabled:opacity-30 disabled:cursor-not-allowed transition-all";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-center">
        <div className="flex items-stretch shadow-xl rounded overflow-hidden">
          <div className="relative bg-paper" style={{ width: W, height: H }}>
            <BookHalf
              pageIdx={spread.left}
              sourcePages={sourcePages}
              width={W}
              height={H}
            />
            {spread.left >= 0 && (
              <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-paper-fg/50">
                {spread.left + 1}
              </div>
            )}
          </div>
          <div className="w-[2px] self-stretch bg-line/50" />
          <div className="relative bg-paper" style={{ width: W, height: H }}>
            <BookHalf
              pageIdx={spread.right}
              sourcePages={sourcePages}
              width={W}
              height={H}
            />
            {spread.right >= 0 && (
              <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-paper-fg/50">
                {spread.right + 1}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full max-w-xs">
        <button
          className={btnCls}
          disabled={idx === 0}
          onClick={direction === "rtl" ? next : prev}
        >
          <ArrowLeft />
        </button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full h-1 bg-e3 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[11px] font-mono text-fg3">{label}</div>
        </div>
        <button
          className={btnCls}
          disabled={idx === spreads.length - 1}
          onClick={direction === "rtl" ? prev : next}
        >
          <ArrowRight />
        </button>
      </div>

      <div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-e2 border border-line text-[11px] font-mono text-fg3">
          {direction === "rtl" ? "RTL → spine on right" : "LTR ← spine on left"}
        </span>
      </div>
    </div>
  );
}
