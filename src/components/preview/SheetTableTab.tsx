import type { BookletLayout } from "@/lib/engine";

interface Props {
  layout: BookletLayout;
}

export function SheetTableTab({ layout }: Props) {
  const fmt = (idx: number) =>
    idx >= 0 ? (
      <span>{`p.${idx + 1}`}</span>
    ) : (
      <em className="not-italic text-fg3">blank</em>
    );

  const rows: {
    sheet: string;
    side: "front" | "back";
    left: number;
    right: number;
    note?: string;
    isCover: boolean;
  }[] = [];
  for (const sheet of layout.sheets) {
    const label = sheet.isCoverSheet
      ? "Cover"
      : `Sheet ${sheet.sheetIndex + 1}`;
    rows.push({
      sheet: label,
      side: "front",
      left: sheet.front.left,
      right: sheet.front.right,
      note: sheet.isCoverSheet ? "print only" : undefined,
      isCover: !!sheet.isCoverSheet,
    });
    rows.push({
      sheet: label,
      side: "back",
      left: sheet.back.left,
      right: sheet.back.right,
      note: sheet.isCoverSheet ? "leave blank" : undefined,
      isCover: !!sheet.isCoverSheet,
    });
  }

  const thCls =
    "text-left py-2 px-3 text-[11px] font-semibold text-fg3 uppercase tracking-wide border-b border-line whitespace-nowrap";
  const tdCls = "py-2 px-3 border-b border-line-soft";

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={thCls}>Sheet</th>
            <th className={thCls}>Side</th>
            <th className={thCls}>Left page</th>
            <th className={thCls}>Right page</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={
                r.isCover
                  ? {
                      background:
                        "color-mix(in oklch, var(--accent) 5%, transparent)",
                    }
                  : undefined
              }
            >
              <td className={`${tdCls} font-semibold text-fg`}>{r.sheet}</td>
              <td className={tdCls}>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                    r.side === "front"
                      ? "bg-accent/15 text-accent"
                      : "bg-fg3/15 text-fg2"
                  }`}
                >
                  {r.side.charAt(0).toUpperCase() + r.side.slice(1)}
                </span>
              </td>
              <td className={`${tdCls} font-mono text-fg2`}>{fmt(r.left)}</td>
              <td className={`${tdCls} font-mono text-fg2`}>{fmt(r.right)}</td>
              <td className={`${tdCls} text-[11px] font-mono text-fg3 italic`}>
                {r.note ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
