// PDF rendering (PDF.js → canvas) and booklet PDF generation (pdf-lib)
const Renderer = (() => {

    /* ── Text → Canvas pages ─────────────────────────────────────── */

    function renderTextPages(text, opts = {}) {
        const {
            fontFamily  = 'serif',
            fontSize    = 11,
            lineHeight  = 1.6,
            direction   = 'ltr',
            pageWidthPt  = 419.53,   // A5
            pageHeightPt = 595.28,
            marginPt     = 40,
            scale        = 2,
        } = opts;

        const PX = v => v * scale;
        const W  = PX(pageWidthPt);
        const H  = PX(pageHeightPt);
        const M  = PX(marginPt);
        const FS = PX(fontSize);
        const LH = FS * lineHeight;

        const makeCanvas = () => {
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#000';
            ctx.font = `${FS}px ${fontFamily}`;
            ctx.direction = direction;
            ctx.textAlign = direction === 'rtl' ? 'right' : 'left';
            return { c, ctx };
        };

        const wrapLine = (ctx, text, maxW) => {
            const words = text.split(' ');
            const lines = [];
            let cur = '';
            for (const w of words) {
                const test = cur ? cur + ' ' + w : w;
                if (ctx.measureText(test).width > maxW && cur) {
                    lines.push(cur);
                    cur = w;
                } else {
                    cur = test;
                }
            }
            if (cur) lines.push(cur);
            return lines;
        };

        const pages   = [];
        let { c, ctx } = makeCanvas();
        const maxW  = W - 2 * M;
        let y = M + FS;

        const flush = () => {
            pages.push(c);
            ({ c, ctx } = makeCanvas());
            y = M + FS;
        };

        const drawLine = (line) => {
            if (y + LH > H - M) flush();
            const x = direction === 'rtl' ? W - M : M;
            ctx.fillText(line, x, y);
            y += LH;
        };

        const paragraphs = text.split(/\n\s*\n/);
        for (const para of paragraphs) {
            const raw = para.replace(/\n/g, ' ').trim();
            if (!raw) { y += LH; continue; }
            const lines = wrapLine(ctx, raw, maxW);
            for (const line of lines) drawLine(line);
            y += LH * 0.5; // paragraph spacing
        }

        pages.push(c);
        return pages; // array of HTMLCanvasElement
    }

    /* ── PDF.js → Canvas pages ───────────────────────────────────── */

    async function loadPdfPages(file, quality, onProgress) {
        const buffer = await file.arrayBuffer();
        const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pages  = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page     = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: quality });
            const canvas   = document.createElement('canvas');
            canvas.width   = viewport.width;
            canvas.height  = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            pages.push({ canvas, naturalW: viewport.width / quality, naturalH: viewport.height / quality });
            onProgress && onProgress(i, pdf.numPages);
        }
        return pages;
    }

    /* ── Booklet PDF generation ───────────────────────────────────── */

    // Convert canvas to JPEG Uint8Array (base64 path for broad compatibility)
    function canvasToJpeg(canvas, quality = 0.92) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const b64     = dataUrl.split(',')[1];
        const binary  = atob(b64);
        const bytes   = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes; // synchronous — no network, no blob
    }

    async function generateBookletPdf(sourcePages, layout, opts = {}) {
        const {
            paperSize      = 'A4',
            scaling        = 'fit',
            customScale    = 1,
            bindingMarginMm= 10,
            outerMarginMm  = 5,
            cropMarks      = false,
            centerLine     = false,
            blankColor     = 'white',
            pageNumbers    = 'none',
            creepMm        = 0,
            direction      = 'ltr',
            onProgress,
        } = opts;

        const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;
        const doc    = await PDFDocument.create();
        const font   = await doc.embedFont(StandardFonts.Helvetica);

        const paper  = BookletEngine.getPaperSize(paperSize);
        // Output page = landscape (two book pages side by side)
        const outW   = paper.h;
        const outH   = paper.w;
        const halfW  = outW / 2;

        const MM = v => v * 2.8346; // mm → pts
        const bindM = MM(bindingMarginMm);
        const outM  = MM(outerMarginMm);
        const CROP  = 6; // crop mark length pts

        const total  = layout.outputPages.length;
        let   done   = 0;

        for (const op of layout.outputPages) {
            const page = doc.addPage([outW, outH]);
            const { left: lIdx, right: rIdx, side, sigIndex, sheetIndex } = op;

            // Creep: shift pages inward for thick signatures
            const shDepth  = sheetIndex;
            const shPerSig = layout.sheetsPerSignature;
            const creepPts = BookletEngine.creepOffset(shDepth, shPerSig, creepMm);
            const lCreep   = direction === 'rtl' ? -creepPts : creepPts;
            const rCreep   = -lCreep;

            // Draw one page (left or right half)
            const drawPage = async (pageIdx, xOff, isRight) => {
                const bm      = bindM + (isRight ? rCreep : lCreep);
                const usableW = halfW - bm - outM;
                const usableH = outH - 2 * outM;

                if (pageIdx === -1) {
                    // Blank page
                    if (blankColor === 'gray') {
                        page.drawRectangle({ x: xOff, y: 0, width: halfW, height: outH,
                            color: rgb(0.93, 0.93, 0.93) });
                    }
                    return;
                }

                const src = sourcePages[pageIdx];
                const srcCanvas = src.canvas || src;
                const srcW = src.naturalW || srcCanvas.width;
                const srcH = src.naturalH || srcCanvas.height;

                // Compute placed dimensions
                let pw, ph, px, py;
                if (scaling === 'fit') {
                    const scale = Math.min(usableW / srcW, usableH / srcH);
                    pw = srcW * scale; ph = srcH * scale;
                } else if (scaling === 'fill') {
                    const scale = Math.max(usableW / srcW, usableH / srcH);
                    pw = srcW * scale; ph = srcH * scale;
                } else if (scaling === 'custom') {
                    pw = srcW * customScale; ph = srcH * customScale;
                } else {
                    pw = srcW; ph = srcH;
                }

                // Center within the available area of each half
                // Left half: inner edge = binding, outer edge = left margin
                // Right half: inner edge = binding, outer edge = right margin
                const innerEdge = bm;             // space from center-fold side
                const xStart    = isRight ? xOff + innerEdge : xOff + outM;
                px = xStart + (usableW - pw) / 2;
                py = outM   + (usableH - ph) / 2;

                const jpegBytes = canvasToJpeg(srcCanvas);
                const img       = await doc.embedJpg(jpegBytes);
                page.drawImage(img, { x: px, y: py, width: pw, height: ph });
            };

            await drawPage(lIdx, 0, false);
            await drawPage(rIdx, halfW, true);

            // Center fold line
            if (centerLine) {
                page.drawLine({ start: { x: halfW, y: 0 }, end: { x: halfW, y: outH },
                    thickness: 0.5, color: rgb(0.7, 0.7, 0.7), dashArray: [4, 4] });
            }

            // Crop marks
            if (cropMarks) {
                const gray = rgb(0.4, 0.4, 0.4);
                const lns  = [
                    [[0, 0], [CROP, 0]], [[0, 0], [0, CROP]],
                    [[outW, 0], [outW - CROP, 0]], [[outW, 0], [outW, CROP]],
                    [[0, outH], [CROP, outH]], [[0, outH], [0, outH - CROP]],
                    [[outW, outH], [outW - CROP, outH]], [[outW, outH], [outW, outH - CROP]],
                    [[halfW, 0], [halfW, CROP]], [[halfW, outH], [halfW, outH - CROP]],
                ];
                for (const [[x1,y1],[x2,y2]] of lns) {
                    page.drawLine({ start:{x:x1,y:y1}, end:{x:x2,y:y2},
                        thickness: 0.5, color: gray });
                }
            }

            // Page numbers
            if (pageNumbers !== 'none') {
                const drawNum = (idx, xOff, isRight) => {
                    if (idx < 0) return;
                    const num = String(idx + 1);
                    const fs  = 7;
                    let x, y;
                    if (pageNumbers === 'bottom-center') {
                        x = xOff + halfW / 2;
                        y = outM - 2;
                    } else if (pageNumbers === 'outer') {
                        x = isRight ? xOff + halfW - outM : xOff + outM;
                        y = outM / 2;
                    } else { // inner
                        x = isRight ? xOff + (bindM + 4) : xOff + halfW - (bindM + 4);
                        y = outM / 2;
                    }
                    page.drawText(num, { x, y, size: fs, font,
                        color: rgb(0.3, 0.3, 0.3) });
                };
                drawNum(lIdx, 0, false);
                drawNum(rIdx, halfW, true);
            }

            done++;
            onProgress && onProgress(done, total);
        }

        const bytes = await doc.save();
        return new Blob([bytes], { type: 'application/pdf' });
    }

    return { renderTextPages, loadPdfPages, generateBookletPdf };
})();
