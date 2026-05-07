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

    // Compute which source pages (0-indexed, -1=blank) go on each output sheet.
    // Returns array of { sigIndex, sheetIndex, front:{left,right}, back:{left,right} }
    function computeLayout(pageCount, opts = {}) {
        const { signatureSize = 4, direction = 'ltr' } = opts;

        // 0 = "all-in-one": use a single signature covering the whole book
        const S = signatureSize === 0
            ? Math.ceil(pageCount / 4) * 4
            : signatureSize;

        const padded    = Math.ceil(pageCount / S) * S;
        const numSig    = padded / S;
        const shPerSig  = S / 4;
        const sheets    = [];

        for (let sig = 0; sig < numSig; sig++) {
            const base = sig * S; // 0-indexed start page of this signature

            for (let sh = 0; sh < shPerSig; sh++) {
                // 0-indexed positions in the padded book
                const pFL = base + S - 1 - 2 * sh;
                const pFR = base + 2 * sh;
                const pBL = base + 2 * sh + 1;
                const pBR = base + S - 2 - 2 * sh;

                const idx = p => (p < pageCount) ? p : -1;
                const fl = idx(pFL), fr = idx(pFR);
                const bl = idx(pBL), br = idx(pBR);

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

        // Flat list of output PDF pages (alternating front/back per sheet)
        const outputPages = sheets.flatMap(s => [
            { left: s.front.left, right: s.front.right, side: 'front',
              sigIndex: s.sigIndex, sheetIndex: s.sheetIndex },
            { left: s.back.left,  right: s.back.right,  side: 'back',
              sigIndex: s.sigIndex, sheetIndex: s.sheetIndex },
        ]);

        return { pageCount, padded, numSignatures: numSig,
                 sheetsPerSignature: shPerSig, sheets, outputPages, direction };
    }

    function getPaperSize(name) {
        return PAPER_SIZES[name] || PAPER_SIZES.A4;
    }

    // Creep offset for a sheet at depth `sheetDepth` within a signature of
    // `sheetsPerSig` sheets, with `creepPerSheet` mm per sheet (converted to pts).
    function creepOffset(sheetDepth, sheetsPerSig, creepPerSheetMm) {
        const pts = creepPerSheetMm * 2.8346; // mm → pts
        return (sheetsPerSig - 1 - sheetDepth) * pts;
    }

    return { computeLayout, getPaperSize, PAPER_SIZES, creepOffset };
})();
