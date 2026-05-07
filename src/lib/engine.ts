export type Direction = "ltr" | "rtl";

export interface SheetSide {
  left: number; // source page index, -1 = blank
  right: number;
}

export interface Sheet {
  sigIndex: number;
  sheetIndex: number;
  isCoverSheet?: boolean;
  front: SheetSide;
  back: SheetSide;
}

export interface OutputPage {
  left: number;
  right: number;
  side: "front" | "back";
  sigIndex: number;
  sheetIndex: number;
  isCoverSheet: boolean;
}

export interface BookletLayout {
  pageCount: number;
  padded: number;
  numSignatures: number;
  sheetsPerSignature: number;
  sheets: Sheet[];
  outputPages: OutputPage[];
  direction: Direction;
}

export interface LayoutOptions {
  signatureSize?: number; // 0 = all-in-one
  direction?: Direction;
  separateCover?: boolean;
}

const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A3: { w: 841.89, h: 1190.55 },
  A4: { w: 595.28, h: 841.89 },
  A5: { w: 419.53, h: 595.28 },
  A6: { w: 297.64, h: 419.53 },
  Letter: { w: 612, h: 792 },
  Legal: { w: 612, h: 1008 },
  Tabloid: { w: 792, h: 1224 },
};

export function getPaperSize(name: string) {
  return PAPER_SIZES[name] ?? PAPER_SIZES["A4"]!;
}

function buildInnerSheets(
  origIndices: number[],
  S: number,
  direction: Direction,
): {
  sheets: Sheet[];
  padded: number;
  numSig: number;
  shPerSig: number;
} {
  const n = origIndices.length;
  // Pad to multiple of 4 (min booklet unit), NOT S — avoids unnecessary blanks
  // when the last signature is only partially filled.
  const padded = Math.ceil(n / 4) * 4;
  const sheets: Sheet[] = [];
  let pos = 0;
  let sigIdx = 0;

  while (pos < padded) {
    const rem = padded - pos;
    const sigSize = Math.min(S, rem);
    const shCount = sigSize / 4;

    for (let sh = 0; sh < shCount; sh++) {
      const pick = (p: number) => (p < n ? origIndices[p]! : -1);
      const fl = pick(pos + sigSize - 1 - 2 * sh);
      const fr = pick(pos + 2 * sh);
      const bl = pick(pos + 2 * sh + 1);
      const br = pick(pos + sigSize - 2 - 2 * sh);
      sheets.push(
        direction === "rtl"
          ? {
              sigIndex: sigIdx,
              sheetIndex: sh,
              front: { left: fr, right: fl },
              back: { left: br, right: bl },
            }
          : {
              sigIndex: sigIdx,
              sheetIndex: sh,
              front: { left: fl, right: fr },
              back: { left: bl, right: br },
            },
      );
    }
    pos += sigSize;
    sigIdx += 1;
  }

  return { sheets, padded, numSig: sigIdx, shPerSig: S / 4 };
}

function toResult(
  pageCount: number,
  padded: number,
  numSig: number,
  shPerSig: number,
  direction: Direction,
  sheets: Sheet[],
): BookletLayout {
  const outputPages: OutputPage[] = sheets.flatMap((s) => [
    {
      left: s.front.left,
      right: s.front.right,
      side: "front",
      sigIndex: s.sigIndex,
      sheetIndex: s.sheetIndex,
      isCoverSheet: !!s.isCoverSheet,
    },
    {
      left: s.back.left,
      right: s.back.right,
      side: "back",
      sigIndex: s.sigIndex,
      sheetIndex: s.sheetIndex,
      isCoverSheet: !!s.isCoverSheet,
    },
  ]);
  return {
    pageCount,
    padded,
    numSignatures: numSig,
    sheetsPerSignature: shPerSig,
    sheets,
    outputPages,
    direction,
  };
}

export function computeLayout(
  pageCount: number,
  opts: LayoutOptions = {},
): BookletLayout {
  const { signatureSize = 8, direction = "ltr", separateCover = true } = opts;

  const S =
    signatureSize === 0
      ? Math.ceil(Math.max(pageCount, 4) / 4) * 4
      : signatureSize;

  if (separateCover && pageCount >= 2) {
    const coverFront: SheetSide =
      direction === "rtl"
        ? { left: 0, right: pageCount - 1 }
        : { left: pageCount - 1, right: 0 };

    const coverSheet: Sheet = {
      sigIndex: -1,
      sheetIndex: -1,
      isCoverSheet: true,
      front: coverFront,
      back: { left: -1, right: -1 },
    };

    const innerIndices = Array.from({ length: pageCount - 2 }, (_, i) => i + 1);

    if (innerIndices.length === 0) {
      return toResult(pageCount, 2, 0, 0, direction, [coverSheet]);
    }

    const {
      sheets: inner,
      padded,
      numSig,
      shPerSig,
    } = buildInnerSheets(innerIndices, S, direction);

    return toResult(pageCount, padded + 2, numSig, shPerSig, direction, [
      coverSheet,
      ...inner,
    ]);
  }

  const { sheets, padded, numSig, shPerSig } = buildInnerSheets(
    Array.from({ length: pageCount }, (_, i) => i),
    S,
    direction,
  );
  return toResult(pageCount, padded, numSig, shPerSig, direction, sheets);
}

export function creepOffset(
  sheetDepth: number,
  sheetsPerSig: number,
  creepPerSheetMm: number,
): number {
  if (sheetDepth < 0) return 0;
  const pts = creepPerSheetMm * 2.8346;
  return (sheetsPerSig - 1 - sheetDepth) * pts;
}
