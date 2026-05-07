// Core booklet layout algorithm
const BookletEngine = (() => {
    const PAPER_SIZES = {
        A3:      { w: 841.89,  h: 1190.55 },
        A4:      { w: 595.28,  h: 841.89  },
        A5:      { w: 419.53,  h: 595.28  },
        A6:      { w: 297.64,  h: 419.53  },
        Letter:  { w: 612,     h: 792     },
        Legal:   { w: 612,     h: 1008    },
        Tabloid: { w: 792,     h: 1224    },
    };

    function getPaperSize(name) { return PAPER_SIZES[name] || PAPER_SIZES.A4; }

    // Build inner booklet sheets from an array of original page indices.
    // Pages beyond the array length become blank (-1).
    function buildInnerSheets(origIndices, S, direction) {
        const n       = origIndices.length;
        const padded  = Math.ceil(n / S) * S;
        const numSig  = padded / S;
        const shPerSig = S / 4;
        const sheets  = [];

        for (let sig = 0; sig < numSig; sig++) {
            const base = sig * S;
            for (let sh = 0; sh < shPerSig; sh++) {
                const pick = pos => pos < n ? origIndices[pos] : -1;
                const fl = pick(base + S - 1 - 2*sh);
                const fr = pick(base + 2*sh);
                const bl = pick(base + 2*sh + 1);
                const br = pick(base + S - 2 - 2*sh);
                sheets.push(direction === 'rtl'
                    ? { sigIndex: sig, sheetIndex: sh,
                        front: { left: fr, right: fl },
                        back:  { left: br, right: bl } }
                    : { sigIndex: sig, sheetIndex: sh,
                        front: { left: fl, right: fr },
                        back:  { left: bl, right: br } }
                );
            }
        }
        return { sheets, padded, numSig, shPerSig };
    }

    // Compute which source pages (0-indexed, -1=blank) go on each output sheet.
    //
    // separateCover=true (default):
    //   Sheet 0 = cover: front=[p.N, p.1], back=[blank, blank]
    //   Remaining sheets = inner booklet of pages 2..N-1
    //
    // separateCover=false:
    //   Standard saddle-stitch: all pages in one booklet
    function computeLayout(pageCount, opts = {}) {
        const { signatureSize = 4, direction = 'ltr', separateCover = true } = opts;

        const S = signatureSize === 0
            ? Math.ceil(Math.max(pageCount, 4) / 4) * 4
            : signatureSize;

        if (separateCover && pageCount >= 2) {
            // ── Cover sheet ──────────────────────────────────────
            // LTR: left=p.N (back cover), right=p.1 (front cover)
            // RTL: left=p.1 (front cover), right=p.N (back cover)
            const coverFront = direction === 'rtl'
                ? { left: 0,              right: pageCount - 1 }
                : { left: pageCount - 1,  right: 0             };

            const coverSheet = {
                sigIndex: -1, sheetIndex: -1, isCoverSheet: true,
                front: coverFront,
                back:  { left: -1, right: -1 },   // intentionally blank
            };

            // ── Inner pages: indices 1 .. pageCount-2 ───────────
            const innerIndices = Array.from({ length: pageCount - 2 }, (_, i) => i + 1);

            if (innerIndices.length === 0) {
                const sheets = [coverSheet];
                return toResult(pageCount, 2, 0, 0, direction, sheets);
            }

            const { sheets: inner, padded, numSig, shPerSig } =
                buildInnerSheets(innerIndices, S, direction);

            const allSheets = [coverSheet, ...inner];
            return toResult(pageCount, padded + 2, numSig, shPerSig, direction, allSheets);
        }

        // ── Standard mode: entire book in one pass ───────────────
        const { sheets, padded, numSig, shPerSig } =
            buildInnerSheets(
                Array.from({ length: pageCount }, (_, i) => i),
                S, direction
            );
        return toResult(pageCount, padded, numSig, shPerSig, direction, sheets);
    }

    function toResult(pageCount, padded, numSig, shPerSig, direction, sheets) {
        const outputPages = sheets.flatMap(s => [
            { left: s.front.left, right: s.front.right, side: 'front',
              sigIndex: s.sigIndex, sheetIndex: s.sheetIndex, isCoverSheet: !!s.isCoverSheet },
            { left: s.back.left,  right: s.back.right,  side: 'back',
              sigIndex: s.sigIndex, sheetIndex: s.sheetIndex, isCoverSheet: !!s.isCoverSheet },
        ]);
        return { pageCount, padded, numSignatures: numSig,
                 sheetsPerSignature: shPerSig, sheets, outputPages, direction };
    }

    function creepOffset(sheetDepth, sheetsPerSig, creepPerSheetMm) {
        if (sheetDepth < 0) return 0; // cover sheet has no creep
        const pts = creepPerSheetMm * 2.8346;
        return (sheetsPerSig - 1 - sheetDepth) * pts;
    }

    return { computeLayout, getPaperSize, PAPER_SIZES, creepOffset };
})();
