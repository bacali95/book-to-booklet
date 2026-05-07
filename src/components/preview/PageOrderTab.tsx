import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { BookletLayout } from "@/lib/engine";
import type { SourcePage } from "@/lib/renderer";

interface Props {
  layout: BookletLayout;
  sourcePages: SourcePage[];
  pageCount: number;
}

const THUMB_H = 110;

function PageThumb({
  idx,
  sourcePages,
  pageCount,
}: {
  idx: number;
  sourcePages: SourcePage[];
  pageCount: number;
}) {
  const { t } = useTranslation();
  const isBlank = idx < 0;
  const isCover = idx === 0;
  const isBack = idx === pageCount - 1 && pageCount > 1;
  const src = isBlank ? null : sourcePages[idx];

  const imgSrc = useMemo(() => {
    if (!src) return null;
    const c = src.canvas;
    const srcH = src.naturalH || c.height;
    const srcW = src.naturalW || c.width;
    const s = THUMB_H / srcH;
    const el = document.createElement("canvas");
    el.width = Math.round(srcW * s);
    el.height = Math.round(srcH * s);
    el.getContext("2d")!.drawImage(c, 0, 0, el.width, el.height);
    return el.toDataURL();
  }, [src]);

  const thumbW = Math.round(THUMB_H * 0.707);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative overflow-hidden rounded border ${isBlank ? "border-dashed border-line bg-e2" : "border-line bg-paper shadow-sm"}`}
        style={{ width: imgSrc ? undefined : thumbW, height: THUMB_H }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`p.${idx + 1}`}
            className="block"
            style={{ width: "auto", height: THUMB_H }}
          />
        ) : isBlank ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-fg3">
            {t("pageOrder.blank")}
          </div>
        ) : (
          <>
            <div className="p-2 pt-3 flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[3px] bg-fg3/20 rounded-full"
                  style={{ width: `${48 + Math.sin(idx + i) * 26}%` }}
                />
              ))}
            </div>
            <div className="absolute bottom-1 end-1 text-[9px] font-mono bg-e3/80 text-fg2 px-1 rounded">
              {idx + 1}
            </div>
          </>
        )}
        {!isBlank && imgSrc && (
          <div className="absolute bottom-1 end-1 text-[9px] font-mono bg-black/30 text-white px-1 rounded">
            {idx + 1}
          </div>
        )}
        {isCover && (
          <div className="absolute top-1 start-1 text-[9px] font-semibold bg-accent text-accent-fg px-1 rounded leading-4">
            {t("pageOrder.coverLabel")}
          </div>
        )}
        {isBack && (
          <div className="absolute top-1 start-1 text-[9px] font-semibold bg-fg3/60 text-white px-1 rounded leading-4">
            {t("pageOrder.backLabel")}
          </div>
        )}
      </div>
    </div>
  );
}

function SheetCard({
  sheet,
  sourcePages,
  pageCount,
  isCover,
}: {
  sheet: BookletLayout["sheets"][number];
  sourcePages: SourcePage[];
  pageCount: number;
  isCover: boolean;
}) {
  const { t } = useTranslation();
  const sheetNum = sheet.sheetIndex >= 0 ? sheet.sheetIndex + 1 : undefined;
  const fmt = (n: number) => (n >= 0 ? `p.${n + 1}` : t("pageOrder.blank"));

  return (
    <div
      className="rounded-[14px] overflow-hidden border"
      style={
        isCover
          ? {
              background: "color-mix(in oklch, var(--accent) 6%, var(--bg-e1))",
              borderColor:
                "color-mix(in oklch, var(--accent) 30%, transparent)",
            }
          : { background: "var(--bg-e1)", borderColor: "var(--line)" }
      }
    >
      <div
        className="px-4 py-3 border-b"
        style={{
          borderColor: isCover
            ? "color-mix(in oklch, var(--accent) 20%, transparent)"
            : "var(--line)",
        }}
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold text-fg">
          {isCover
            ? t("pageOrder.coverSheet")
            : t("sheetTable.sheet", { num: sheetNum })}
          {isCover && (
            <span
              className="text-[11px] font-mono font-normal px-1.5 py-0.5 rounded"
              style={{
                background:
                  "color-mix(in oklch, var(--accent) 15%, transparent)",
                color: "var(--accent)",
              }}
            >
              {t("pageOrder.printsFrontOnly")}
            </span>
          )}
        </div>
      </div>
      <div className="flex divide-y divide-line">
        {[
          { labelKey: "pageOrder.front", side: sheet.front, isFront: true },
          { labelKey: "pageOrder.back", side: sheet.back, isFront: false },
        ].map(({ labelKey, side, isFront }) => (
          <div
            key={labelKey}
            className="px-4 py-3 flex flex-col gap-2 w-full"
            style={isCover && !isFront ? { opacity: 0.35 } : undefined}
          >
            <div className="flex items-center gap-1.5 text-[12px] text-fg2 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${isFront ? "bg-accent" : "bg-fg3"}`}
              />
              {t(labelKey)}
              <span className="ms-auto text-[11px] font-mono text-fg3">
                {t("pageOrder.side", { num: isFront ? 1 : 2 })}
              </span>
            </div>
            <div className="flex items-center w-full justify-center">
              <PageThumb
                idx={side.left}
                sourcePages={sourcePages}
                pageCount={pageCount}
              />
              <div className="w-px self-stretch bg-line-soft" />
              <PageThumb
                idx={side.right}
                sourcePages={sourcePages}
                pageCount={pageCount}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-fg3 px-1">
              <span>{fmt(side.left)}</span>
              <span>{fmt(side.right)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageOrderTab({ layout, sourcePages, pageCount }: Props) {
  const { t } = useTranslation();
  const coverSheet = layout.sheets.find((s) => s.isCoverSheet);
  const innerSheets = layout.sheets.filter((s) => !s.isCoverSheet);

  return (
    <div className="flex flex-col gap-6">
      {coverSheet && (
        <div
          className="flex flex-col gap-3 p-4 rounded-[14px] border"
          style={{
            background: "color-mix(in oklch, var(--accent) 5%, var(--bg-e1))",
            borderColor: "color-mix(in oklch, var(--accent) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg2">
            <span className="text-accent">★</span>
            <strong className="text-fg font-semibold">
              {t("pageOrder.coverSheet")}
            </strong>
            <span>{t("pageOrder.coverInstruction")}</span>
          </div>
          <SheetCard
            sheet={coverSheet}
            sourcePages={sourcePages}
            pageCount={pageCount}
            isCover
          />
        </div>
      )}

      {innerSheets.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-[13px] font-semibold text-fg">
            <span>{t("pageOrder.innerBooklet")}</span>
            <span className="text-[12px] font-normal font-mono text-fg3">
              {t("pageOrder.sheets", { count: innerSheets.length })} ·{" "}
              {t("pageOrder.printDoubleSided")}
            </span>
          </div>
          {innerSheets.map((sheet, i) => (
            <SheetCard
              key={i}
              sheet={sheet}
              sourcePages={sourcePages}
              pageCount={pageCount}
              isCover={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
