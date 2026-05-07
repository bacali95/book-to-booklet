import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Direction } from "@/lib/engine";
import type { SourcePage } from "@/lib/renderer";

interface Spread {
  left: number; // source page index, -1 = blank
  right: number;
  isCover?: boolean;
  isBack?: boolean;
}

function buildSpreads(pageCount: number, direction: Direction): Spread[] {
  if (!pageCount) return [];
  const s: Spread[] = [];
  s.push({ left: -1, right: 0, isCover: true });
  for (let i = 1; i <= pageCount - 2; i += 2) {
    const a = i;
    const b = i + 1 <= pageCount - 2 ? i + 1 : -1;
    s.push(direction === "rtl" ? { left: b, right: a } : { left: a, right: b });
  }
  if (pageCount > 1) s.push({ left: pageCount - 1, right: -1, isBack: true });
  return s;
}

interface HalfProps {
  pageIdx: number;
  sourcePages: SourcePage[];
  width: number;
  height: number;
  isDark: boolean;
}

function BookHalf({ pageIdx, sourcePages, width, height, isDark }: HalfProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SCALE = 2;
    canvas.width = width * SCALE;
    canvas.height = height * SCALE;
    const ctx = canvas.getContext("2d")!;

    if (pageIdx < 0) {
      ctx.fillStyle = isDark ? "#1c1c1e" : "#f0f0f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.fillStyle = isDark ? "#2a2a2c" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const src = sourcePages[pageIdx];
    if (src) {
      const srcC = src.canvas;
      const srcW = src.naturalW || srcC.width;
      const srcH = src.naturalH || srcC.height;
      const sc = Math.min((width * SCALE) / srcW, (height * SCALE) / srcH);
      const dw = srcW * sc;
      const dh = srcH * sc;
      const dx = (width * SCALE - dw) / 2;
      const dy = (height * SCALE - dh) / 2;
      ctx.drawImage(srcC, dx, dy, dw, dh);
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
  const isDark = document.documentElement.classList.contains("dark");

  // Reset to first spread when content changes
  useEffect(() => {
    setIdx(0);
  }, [pageCount, direction]);

  // Compute page half size from first source page aspect ratio
  const src = sourcePages[0];
  const aspect = src
    ? (src.naturalW || src.canvas.width) / (src.naturalH || src.canvas.height)
    : 1 / Math.SQRT2;
  const H = Math.min(420, Math.max(280, window.innerHeight - 380));
  const W = Math.round(H * aspect);

  const spread = spreads[idx];
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIdx((i) => Math.min(spreads.length - 1, i + 1)),
    [spreads.length],
  );
  const first = useCallback(() => setIdx(0), []);
  const last = useCallback(() => setIdx(spreads.length - 1), [spreads.length]);

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
      if (e.key === " ") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [direction, next, prev]);

  if (!spread) return null;

  const dirLabel =
    direction === "rtl"
      ? "→ Right-to-Left (RTL) · spine on right"
      : "← Left-to-Right (LTR) · spine on left";

  const spreadLabel = spread.isCover
    ? "Front Cover"
    : spread.isBack
      ? "Back Cover"
      : direction === "rtl"
        ? `p.${spread.right >= 0 ? spread.right + 1 : "—"} & p.${spread.left >= 0 ? spread.left + 1 : "—"}`
        : `p.${spread.left >= 0 ? spread.left + 1 : "—"} & p.${spread.right >= 0 ? spread.right + 1 : "—"}`;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
        {dirLabel}
      </span>

      {/* Book spread */}
      <div
        className="flex items-stretch"
        style={{
          boxShadow:
            "0 2px 4px rgba(0,0,0,.12), 0 6px 18px rgba(0,0,0,.22), 0 20px 50px rgba(0,0,0,.18)",
          transform: "rotateX(3deg)",
          transformOrigin: "bottom center",
          transition: "transform .3s ease",
        }}
      >
        {/* Left half */}
        <div
          className="relative cursor-pointer"
          style={{ boxShadow: "inset -8px 0 20px -6px rgba(0,0,0,.22)" }}
          onClick={direction === "rtl" ? next : prev}
        >
          <BookHalf
            pageIdx={spread.left}
            sourcePages={sourcePages}
            width={W}
            height={H}
            isDark={isDark}
          />
          {spread.left >= 0 && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
              p.{spread.left + 1}
            </span>
          )}
        </div>

        {/* Spine */}
        <div
          className="w-2.5 shrink-0"
          style={{
            background:
              "linear-gradient(to right, #a0a0a0 0%, #d8d8d8 35%, #e8e8e8 50%, #c8c8c8 70%, #909090 100%)",
            height: H,
          }}
        />

        {/* Right half */}
        <div
          className="relative cursor-pointer"
          style={{ boxShadow: "inset 8px 0 20px -6px rgba(0,0,0,.22)" }}
          onClick={direction === "rtl" ? prev : next}
        >
          <BookHalf
            pageIdx={spread.right}
            sourcePages={sourcePages}
            width={W}
            height={H}
            isDark={isDark}
          />
          {spread.right >= 0 && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
              p.{spread.right + 1}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={first}
          disabled={idx === 0}
          title="First spread"
        >
          ⏮
        </Button>
        <Button
          variant="outline"
          onClick={direction === "rtl" ? next : prev}
          disabled={idx === 0}
        >
          ← Prev
        </Button>
        <span className="text-sm text-muted-foreground min-w-[160px] text-center">
          {idx + 1} / {spreads.length} — {spreadLabel}
        </span>
        <Button
          variant="outline"
          onClick={direction === "rtl" ? prev : next}
          disabled={idx === spreads.length - 1}
        >
          Next →
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={last}
          disabled={idx === spreads.length - 1}
          title="Last spread"
        >
          ⏭
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Use ← → arrow keys or click to navigate
      </p>
    </div>
  );
}
