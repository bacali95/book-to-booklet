import { useState } from "react";
import type { BookletSettings, BookletState } from "@/hooks/useBooklet";

/* ── tiny SVG icon helper ── */
const Svg = ({
  d,
  size = 14,
  className = "",
}: {
  d: string;
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    dangerouslySetInnerHTML={{ __html: d }}
  />
);
const IC = {
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  layers:
    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  sliders:
    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  print:
    '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
};

/* ── Section ── */
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: keyof typeof IC;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[10px] border border-line bg-e2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-3 py-2.5 bg-transparent border-none cursor-pointer text-fg hover:bg-e3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Svg d={IC[icon]} size={14} />
          <span className="font-semibold text-[13px]">{title}</span>
        </div>
        <Svg d={open ? IC.chevD : IC.chevR} size={13} className="text-fg3" />
      </button>
      {open && (
        <div className="px-3 pt-3.5 pb-3.5 flex flex-col gap-3.5 border-t border-line-soft">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── SegRow ── */
function SegRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; sub?: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-[0.06em] text-fg2 font-semibold">
        {label}
      </label>
      <div className="grid grid-flow-col auto-cols-fr gap-[3px] bg-e1 p-[3px] rounded-lg border border-line">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`
            flex items-center justify-center gap-1 py-[7px] px-1.5 rounded-md border-none text-[12px] font-medium
            cursor-pointer transition-all leading-tight
            ${value === o.value ? "bg-e3 text-fg shadow-sm" : "bg-transparent text-fg2 hover:text-fg"}
          `}
          >
            <span>{o.label}</span>
            {o.sub && (
              <span className="text-[10px] font-mono text-fg3">{o.sub}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── SelectRow ── */
function SelectRow({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline gap-2">
        <label className="text-[11px] uppercase tracking-[0.06em] text-fg2 font-semibold">
          {label}
        </label>
        {hint && <span className="text-[11px] text-fg3">{hint}</span>}
      </div>
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full py-2 pl-3 pr-8 bg-e1 text-fg border border-line rounded-[7px] text-[13px] font-sans cursor-pointer appearance-none focus:outline-2 focus:outline-accent focus:outline-offset-[-1px]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Svg
          d={IC.chevD}
          size={12}
          className="absolute right-2.5 pointer-events-none text-fg3"
        />
      </div>
    </div>
  );
}

/* ── SliderRow ── */
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = "mm",
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline gap-2">
        <label className="text-[11px] uppercase tracking-[0.06em] text-fg2 font-semibold">
          {label}
        </label>
        <span className="text-[12px] text-fg font-mono font-medium">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {hint && <p className="text-[11px] text-fg3 mt-0.5">{hint}</p>}
    </div>
  );
}

/* ── CheckRow ── */
function CheckRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer py-0.5">
      <span
        className={`w-4 h-4 rounded shrink-0 mt-0.5 grid place-items-center transition-all border-[1.5px] ${
          checked ? "bg-accent border-accent text-white" : "bg-e1 border-line"
        }`}
      >
        {checked && <Svg d={IC.check} size={10} />}
      </span>
      <span>
        <span className="text-[13px] text-fg">{label}</span>
        {hint && <div className="text-[11px] text-fg3 mt-0.5">{hint}</div>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="hidden"
      />
    </label>
  );
}

/* ── Main ── */
interface Props {
  state: BookletState;
  onUpdateSettings: (patch: Partial<BookletSettings>) => void;
  onGenerate: () => void;
}

export function ControlPanel({ state, onUpdateSettings, onGenerate }: Props) {
  const { settings, generating, progress, pageCount, layout } = state;
  const [showAdv, setShowAdv] = useState(false);

  const canGenerate = !!layout && !generating;
  const sheetCount = layout?.sheets.length ?? 0;

  return (
    <aside className="border-r border-line bg-e1 flex flex-col min-h-0 overflow-hidden">
      {/* Scrollable settings */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 flex flex-col gap-2">
        <Section title="Reading & layout" icon="book">
          <SegRow
            label="Reading direction"
            value={settings.direction}
            onChange={(v) =>
              onUpdateSettings({ direction: v as "ltr" | "rtl" })
            }
            options={[
              { value: "ltr", label: "LTR", sub: "←" },
              { value: "rtl", label: "RTL", sub: "→" },
            ]}
          />

          <SelectRow
            label="Pages per signature"
            value={String(settings.signatureSize)}
            onChange={(v) => onUpdateSettings({ signatureSize: Number(v) })}
            hint="Larger = fewer bindings"
            options={[
              { value: "0", label: "Auto — single saddle stitch" },
              { value: "4", label: "1 sheet · 4 pages/sig" },
              { value: "8", label: "2 sheets · 8 pages/sig" },
              { value: "16", label: "4 sheets · 16 pages/sig" },
              { value: "32", label: "8 sheets · 32 pages/sig" },
            ]}
          />

          <SegRow
            label="Duplex flip"
            value={settings.flip}
            onChange={(v) => onUpdateSettings({ flip: v as "long" | "short" })}
            options={[
              { value: "long", label: "Long edge", sub: "default" },
              { value: "short", label: "Short edge" },
            ]}
          />

          {/* Printer callout */}
          <div
            className="flex gap-2 items-start p-3 rounded-lg text-[11.5px] text-fg leading-relaxed"
            style={{
              background: "var(--accent-soft)",
              border:
                "1px solid color-mix(in oklch, var(--accent) 30%, transparent)",
            }}
          >
            <Svg
              d={IC.print}
              size={13}
              className="text-accent mt-0.5 shrink-0"
            />
            <div>
              <strong className="font-semibold">In your printer dialog:</strong>{" "}
              Orientation →{" "}
              <em className="not-italic font-mono font-semibold text-accent">
                Landscape
              </em>
              {" · "}
              Two-sided →{" "}
              <em className="not-italic font-mono font-semibold text-accent">
                Flip on {settings.flip} edge
              </em>
            </div>
          </div>
        </Section>

        <Section title="Paper" icon="layers">
          <SelectRow
            label="Output paper size"
            value={settings.paperSize}
            onChange={(v) => onUpdateSettings({ paperSize: v })}
            options={[
              { value: "A4", label: "A4 — 297 × 210 mm" },
              { value: "Letter", label: "Letter — 11 × 8.5 in" },
              { value: "A3", label: "A3 — 420 × 297 mm" },
              { value: "Tabloid", label: "Tabloid — 17 × 11 in" },
              { value: "Legal", label: "Legal — 14 × 8.5 in" },
              { value: "A5", label: "A5 — 210 × 148 mm" },
            ]}
          />

          <SegRow
            label="Page scaling"
            value={settings.scaling}
            onChange={(v) =>
              onUpdateSettings({ scaling: v as BookletSettings["scaling"] })
            }
            options={[
              { value: "fit", label: "Fit" },
              { value: "fill", label: "Fill" },
              { value: "actual", label: "Actual" },
              { value: "custom", label: "Custom" },
            ]}
          />

          {settings.scaling === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-[0.06em] text-fg2 font-semibold">
                Scale factor
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.customScale}
                  min={0.1}
                  max={3}
                  step={0.05}
                  onChange={(e) =>
                    onUpdateSettings({ customScale: Number(e.target.value) })
                  }
                  className="w-18 py-2 px-2 bg-e1 text-fg border border-line rounded-[7px] text-[13px] font-mono text-center focus:outline-2 focus:outline-accent"
                />
                <span className="text-[11px] text-fg3">× (1.0 = 100%)</span>
              </div>
            </div>
          )}
        </Section>

        <Section title="Margins" icon="sliders">
          <SliderRow
            label="Binding (gutter)"
            value={settings.bindingMarginMm}
            min={0}
            max={30}
            step={1}
            onChange={(v) => onUpdateSettings({ bindingMarginMm: v })}
            hint="Extra space on the inside edge for the fold"
          />
          <SliderRow
            label="Outer margin"
            value={settings.outerMarginMm}
            min={0}
            max={20}
            step={1}
            onChange={(v) => onUpdateSettings({ outerMarginMm: v })}
          />
        </Section>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdv((s) => !s)}
          className={`flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-all border
            ${showAdv ? "border-line text-fg bg-e2" : "border-dashed border-line text-fg2 bg-transparent hover:bg-e2 hover:text-fg hover:border-solid"}`}
        >
          <Svg d={showAdv ? IC.chevD : IC.chevR} size={13} />
          Advanced options
        </button>

        {showAdv && (
          <>
            <Section title="Page numbers & marks" icon="settings">
              <SelectRow
                label="Page numbers"
                value={settings.pageNumbers}
                onChange={(v) =>
                  onUpdateSettings({
                    pageNumbers: v as BookletSettings["pageNumbers"],
                  })
                }
                options={[
                  { value: "none", label: "None" },
                  { value: "bottom-center", label: "Bottom center" },
                  { value: "outer", label: "Outer corner" },
                  { value: "inner", label: "Inner (binding) edge" },
                ]}
              />
              <CheckRow
                label="Separate cover sheet"
                hint="Print front-only, leave back blank"
                checked={settings.separateCover}
                onChange={(v) => onUpdateSettings({ separateCover: v })}
              />
              <CheckRow
                label="Crop / trim marks"
                checked={settings.cropMarks}
                onChange={(v) => onUpdateSettings({ cropMarks: v })}
              />
              <CheckRow
                label="Center fold guide line"
                checked={settings.centerLine}
                onChange={(v) => onUpdateSettings({ centerLine: v })}
              />
              <CheckRow
                label="Mark blank pages (debug)"
                checked={settings.blankPageMark}
                onChange={(v) => onUpdateSettings({ blankPageMark: v })}
              />
            </Section>

            <Section title="Blank pages" icon="grid">
              <SegRow
                label="Fill"
                value={settings.blankColor}
                onChange={(v) =>
                  onUpdateSettings({ blankColor: v as "white" | "gray" })
                }
                options={[
                  { value: "white", label: "White" },
                  { value: "gray", label: "Light gray" },
                ]}
              />
            </Section>

            <Section
              title="Quality & creep"
              icon="settings"
              defaultOpen={false}
            >
              <SelectRow
                label="Render quality"
                value={String(settings.quality)}
                onChange={(v) => onUpdateSettings({ quality: Number(v) })}
                options={[
                  { value: "1.5", label: "Draft (1.5×, fast)" },
                  { value: "2", label: "High (2×, recommended)" },
                  { value: "3", label: "Ultra (3×, slow)" },
                ]}
              />
              <SliderRow
                label="Creep compensation"
                value={settings.creepMm}
                min={0}
                max={3}
                step={0.1}
                onChange={(v) => onUpdateSettings({ creepMm: v })}
                hint="Shifts inner pages outward to compensate for paper thickness"
              />
            </Section>
          </>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="shrink-0 border-t border-line p-3.5 bg-e1 flex flex-col gap-2">
        {progress && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1 bg-e3 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-200"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-fg3 font-mono text-center">
              {progress.text}
            </p>
          </div>
        )}

        {layout && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-e2 border border-line rounded-lg">
            <span className="text-[26px] font-semibold font-mono text-accent leading-none tracking-tight">
              {sheetCount}
            </span>
            <div className="flex flex-col text-[12px] leading-snug">
              <span>sheets · {pageCount} pages</span>
              <span className="text-fg3 font-mono text-[11px]">
                {settings.paperSize} · duplex on {settings.flip} edge
              </span>
            </div>
          </div>
        )}

        <button
          disabled={!canGenerate}
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-accent text-accent-fg border border-accent rounded-[10px] text-[14px] font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          {generating ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Svg d={IC.download} size={15} />
          )}
          {generating ? "Generating…" : "Generate Booklet PDF"}
        </button>
      </div>
    </aside>
  );
}
