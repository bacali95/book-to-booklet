// UI controller
(async () => {
    /* ── State ───────────────────────────────────────────────────── */
    const state = {
        sourcePages:   [],   // { canvas, naturalW, naturalH } or canvas elements
        pageCount:     0,
        layout:        null,
        inputMode:     'pdf', // 'pdf' | 'text'
        generating:    false,
    };

    /* ── DOM refs ─────────────────────────────────────────────────── */
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);

    const dropZone       = $('dropZone');
    const fileInput      = $('fileInput');
    const fileInfo       = $('fileInfo');
    const fileName       = $('fileName');
    const pageCountEl    = $('pageCount');
    const clearFileBtn   = $('clearFile');
    const textInput      = $('textInput');
    const generateBtn    = $('generateBtn');
    const progressBar    = $('progressBar');
    const progressFill   = $('progressFill');
    const progressText   = $('progressText');
    const emptyState     = $('emptyState');
    const previewContent = $('previewContent');
    const pageOrderGrid  = $('pageOrderGrid');
    const sheetLayoutList= $('sheetLayoutList');
    const themeToggle    = $('themeToggle');

    /* ── Settings helpers ─────────────────────────────────────────── */
    const setting = id => $(`${id}`)?.value;
    const checked  = id => $(`${id}`)?.checked;

    function getOptions() {
        const sigRaw = parseInt(setting('signatureSize') || '4');
        return {
            signatureSize:    sigRaw,
            direction:        getToggleValue('directionToggle'),
            separateCover:    checked('separateCover'),
            paperSize:        setting('outputPaperSize') || 'A4',
            scaling:          setting('pageScaling') || 'fit',
            customScale:      parseFloat(setting('customScale') || '1'),
            bindingMarginMm:  parseFloat($('bindingMargin')?.value || '10'),
            outerMarginMm:    parseFloat($('outerMargin')?.value || '5'),
            cropMarks:        checked('cropMarks'),
            centerLine:       checked('centerLine'),
            blankColor:       getToggleValue('blankColorToggle'),
            pageNumbers:      setting('pageNumbers') || 'none',
            creepMm:          parseFloat($('creepCompensation')?.value || '0'),
            quality:          parseFloat(setting('renderQuality') || '2'),
        };
    }

    /* ── Toggle groups ────────────────────────────────────────────── */
    function getToggleValue(groupId) {
        const active = document.querySelector(`#${groupId} .toggle-btn.active`);
        return active ? active.dataset.value : null;
    }

    $$('.toggle-group').forEach(group => {
        group.addEventListener('click', e => {
            const btn = e.target.closest('.toggle-btn');
            if (!btn) return;
            group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onSettingsChange();
        });
    });

    /* ── Accordion ────────────────────────────────────────────────── */
    $$('.accordion-header').forEach(btn => {
        btn.addEventListener('click', () => {
            const body     = $( btn.dataset.target );
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', !expanded);
            body.classList.toggle('hidden', expanded);
            btn.querySelector('.accordion-icon').textContent = expanded ? '▸' : '▾';
        });
    });

    /* ── Tab switching ────────────────────────────────────────────── */
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            $(`tab${capitalize(btn.dataset.tab)}`).classList.add('active');
        });
    });

    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    /* ── Theme ────────────────────────────────────────────────────── */
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(dark) {
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }
    applyTheme(localStorage.getItem('theme') === 'dark' || (
        !localStorage.getItem('theme') && prefersDark.matches));

    themeToggle.addEventListener('click', () => {
        applyTheme(document.documentElement.dataset.theme !== 'dark');
    });

    /* ── File upload ──────────────────────────────────────────────── */
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    dropZone.addEventListener('click',  () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave',  () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f?.type === 'application/pdf') loadFile(f);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) loadFile(fileInput.files[0]);
    });
    clearFileBtn.addEventListener('click', clearSource);

    async function loadFile(file) {
        clearSource();
        state.inputMode = 'pdf';
        showProgress(true, 'Loading PDF…');
        try {
            const pages = await Renderer.loadPdfPages(file, 2,
                (done, total) => setProgress(done / total * 50, `Loading page ${done}/${total}…`));
            state.sourcePages = pages;
            state.pageCount   = pages.length;
            fileName.textContent  = file.name;
            pageCountEl.textContent = `${pages.length} pages`;
            fileInfo.classList.remove('hidden');
            dropZone.classList.add('hidden');
            onSettingsChange();
        } catch (err) {
            alert('Failed to load PDF: ' + err.message);
        } finally {
            showProgress(false);
        }
    }

    function clearSource() {
        state.sourcePages = [];
        state.pageCount   = 0;
        state.layout      = null;
        fileInput.value   = '';
        fileInfo.classList.add('hidden');
        dropZone.classList.remove('hidden');
        setEmpty(true);
        generateBtn.disabled = true;
    }

    /* ── Text input ───────────────────────────────────────────────── */
    textInput.addEventListener('input', debounce(onTextChange, 600));

    function onTextChange() {
        const text = textInput.value.trim();
        if (!text) { clearSource(); return; }
        state.inputMode = 'text';
        const opts = getOptions();
        const pages = Renderer.renderTextPages(text, {
            fontFamily: setting('textFont') || 'serif',
            fontSize:   parseFloat(setting('textFontSize') || '11'),
            direction:  opts.direction,
        });
        state.sourcePages = pages.map(c => ({ canvas: c, naturalW: c.width / 2, naturalH: c.height / 2 }));
        state.pageCount   = pages.length;
        fileInfo.classList.add('hidden');
        dropZone.classList.add('hidden');
        fileName.textContent    = 'Text input';
        pageCountEl.textContent = `${pages.length} pages`;
        onSettingsChange();
    }

    /* ── Settings change ──────────────────────────────────────────── */
    ['outputPaperSize','signatureSize','pageScaling','customScale',
     'pageNumbers','renderQuality','textFont','textFontSize'
    ].forEach(id => $(id)?.addEventListener('change', onSettingsChange));

    ['bindingMargin','outerMargin','creepCompensation'].forEach(id => {
        const el = $(id);
        if (!el) return;
        const display = $(`${id}Value`);
        el.addEventListener('input', () => {
            if (display) display.textContent = el.value;
            onSettingsChange();
        });
    });

    ['cropMarks','blankPageMark','centerLine','separateCover'].forEach(id =>
        $(id)?.addEventListener('change', onSettingsChange));

    $('pageScaling').addEventListener('change', () => {
        $('customScaleGroup').classList.toggle('hidden',
            $('pageScaling').value !== 'custom');
    });

    function onSettingsChange() {
        if (!state.pageCount) return;
        const opts = getOptions();
        try {
            state.layout = BookletEngine.computeLayout(state.pageCount, {
                signatureSize: opts.signatureSize,
                direction:     opts.direction,
                separateCover: opts.separateCover,
            });
            renderPreview(state.layout, state.pageCount, opts.direction);
            generateBtn.disabled = false;
        } catch (e) {
            console.error(e);
        }
    }

    /* ── Preview ──────────────────────────────────────────────────── */
    function setEmpty(empty) {
        emptyState.classList.toggle('hidden', !empty);
        previewContent.classList.toggle('hidden', empty);
    }

    function renderPreview(layout, pageCount, direction) {
        setEmpty(false);
        renderPageOrderGrid(layout, pageCount);
        renderSheetLayout(layout, pageCount, direction);
        updateBookView();
    }

    function renderPageOrderGrid(layout, pageCount) {
        pageOrderGrid.innerHTML = '';

        const THUMB_H  = 220;
        const lastPage = pageCount - 1;

        const makeHalf = (idx) => {
            const isBlank     = idx < 0;
            const isCover     = idx === 0;
            const isBackCover = idx === lastPage;

            const div = document.createElement('div');
            div.className = 'order-page' + (isBlank ? ' order-page-blank' : '');
            div.title = isBlank ? 'Blank padding page' : `Page ${idx + 1}`;

            // Thumbnail or blank rect
            if (!isBlank) {
                const src = state.sourcePages[idx];
                if (src) {
                    const c      = src.canvas || src;
                    const srcH   = src.naturalH || c.height;
                    const srcW   = src.naturalW || c.width;
                    const scale  = THUMB_H / srcH;
                    const thumb  = document.createElement('canvas');
                    thumb.width  = Math.round(srcW * scale);
                    thumb.height = Math.round(srcH * scale);
                    thumb.getContext('2d').drawImage(c, 0, 0, thumb.width, thumb.height);
                    thumb.className = 'order-thumb';
                    if (isCover)     thumb.classList.add('thumb-cover');
                    if (isBackCover) thumb.classList.add('thumb-back-cover');
                    div.appendChild(thumb);
                }
            } else {
                const rect = document.createElement('div');
                rect.className = 'order-blank-rect';
                div.appendChild(rect);
            }

            // Label row
            const meta = document.createElement('div');
            meta.className = 'order-page-meta';
            if (isBlank) {
                meta.innerHTML = '<span class="order-page-num blank-num">blank</span>';
            } else {
                meta.innerHTML = `<span class="order-page-num">p.${idx + 1}</span>`;
                if (isCover)
                    meta.innerHTML += '<span class="cover-badge badge-cover">Cover</span>';
                else if (isBackCover)
                    meta.innerHTML += '<span class="cover-badge badge-back">Back</span>';
            }
            div.appendChild(meta);
            return div;
        };

        const makeSide = (label, leftIdx, rightIdx) => {
            const side = document.createElement('div');
            side.className = 'order-side';

            const lbl = document.createElement('div');
            lbl.className = 'order-side-label';
            lbl.textContent = label;
            side.appendChild(lbl);

            const pages = document.createElement('div');
            pages.className = 'order-side-pages';
            // Engine already places pages at correct physical positions for both LTR and RTL
            pages.appendChild(makeHalf(leftIdx));
            pages.appendChild(makeHalf(rightIdx));
            side.appendChild(pages);
            return side;
        };

        layout.sheets.forEach((sheet, si) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'order-sheet-wrapper' + (sheet.isCoverSheet ? ' is-cover-sheet' : '');

            // Section header
            if (sheet.isCoverSheet) {
                const lbl = document.createElement('div');
                lbl.className = 'order-sig-label cover-sheet-label';
                lbl.textContent = '★ Cover Sheet — print front only, back is blank';
                wrapper.appendChild(lbl);
            } else if (layout.numSignatures > 1 &&
                (si === 0 || sheet.sigIndex !== layout.sheets[si - 1]?.sigIndex ||
                 layout.sheets[si - 1]?.isCoverSheet)) {
                const sigLbl = document.createElement('div');
                sigLbl.className = 'order-sig-label';
                sigLbl.textContent = layout.numSignatures > 1
                    ? `Inner booklet — Signature ${sheet.sigIndex + 1}`
                    : 'Inner booklet';
                wrapper.appendChild(sigLbl);
            } else if (si === 1 && layout.sheets[0]?.isCoverSheet) {
                const sigLbl = document.createElement('div');
                sigLbl.className = 'order-sig-label';
                sigLbl.textContent = 'Inner booklet';
                wrapper.appendChild(sigLbl);
            }

            const sheetRow = document.createElement('div');
            sheetRow.className = 'order-sheet';

            const sheetNum = document.createElement('div');
            sheetNum.className = 'order-sheet-num';
            sheetNum.textContent = sheet.isCoverSheet ? 'Cover Sheet' : `Sheet ${si}`;
            sheetRow.appendChild(sheetNum);

            const sides = document.createElement('div');
            sides.className = 'order-sheet-sides';

            const frontLabel = sheet.isCoverSheet ? 'Front (print this side only)' : 'Front — side 1';
            const backLabel  = sheet.isCoverSheet ? 'Back (leave blank)' : 'Back — side 2';
            sides.appendChild(makeSide(frontLabel, sheet.front.left, sheet.front.right));
            sides.appendChild(makeSide(backLabel,  sheet.back.left,  sheet.back.right));
            sheetRow.appendChild(sides);

            wrapper.appendChild(sheetRow);
            pageOrderGrid.appendChild(wrapper);
        });
    }

    function renderSheetLayout(layout, pageCount, direction) {
        sheetLayoutList.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'layout-header';
        header.innerHTML = `
            <span>Total pages: <b>${pageCount}</b></span>
            <span>Padded to: <b>${layout.padded}</b></span>
            <span>Signatures: <b>${layout.numSignatures}</b></span>
            <span>Sheets per sig: <b>${layout.sheetsPerSignature}</b></span>
            <span>Output pages: <b>${layout.outputPages.length}</b></span>
            <span>Direction: <b>${direction.toUpperCase()}</b></span>
        `;
        sheetLayoutList.appendChild(header);

        const table = document.createElement('table');
        table.className = 'layout-table';
        table.innerHTML = `<thead><tr>
            <th>Sheet</th><th>Sig</th>
            <th colspan="2">Front (print side 1)</th>
            <th colspan="2">Back (print side 2)</th>
        </tr><tr>
            <th></th><th></th>
            <th>Left</th><th>Right</th>
            <th>Left</th><th>Right</th>
        </tr></thead><tbody></tbody>`;

        const tbody = table.querySelector('tbody');
        layout.sheets.forEach((sheet, i) => {
            const fmtPage = idx => idx >= 0 ? `p.${idx + 1}` : '<span class="blank">blank</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${sheet.sigIndex + 1}</td>
                <td>${fmtPage(sheet.front.left)}</td>
                <td>${fmtPage(sheet.front.right)}</td>
                <td>${fmtPage(sheet.back.left)}</td>
                <td>${fmtPage(sheet.back.right)}</td>
            `;
            tbody.appendChild(tr);
        });

        sheetLayoutList.appendChild(table);
    }

    /* ── Book View ────────────────────────────────────────────────── */
    const bookState = { spreads: [], idx: 0 };

    // Build spread descriptors: {left, right} = 0-based page indices, -1 = blank
    function buildSpreads(pageCount, direction) {
        const s = [];
        if (!pageCount) return s;

        // Spread 0: cover (p.1 always on right — single page visible)
        s.push({ left: -1, right: 0, isCover: true });

        // Inner pages: indices 1..pageCount-2
        for (let i = 1; i <= pageCount - 2; i += 2) {
            const a = i;
            const b = (i + 1 <= pageCount - 2) ? i + 1 : -1;
            // LTR: lower # on left (read left then right)
            // RTL: lower # on right (read right then left)
            s.push(direction === 'rtl' ? { left: b, right: a } : { left: a, right: b });
        }

        // Last spread: back cover on left (single page)
        if (pageCount > 1) s.push({ left: pageCount - 1, right: -1, isBack: true });

        return s;
    }

    function updateBookView() {
        if (!state.pageCount || !state.layout) {
            $('bookEmpty').classList.remove('hidden');
            $('bookMain').classList.add('hidden');
            return;
        }
        $('bookEmpty').classList.add('hidden');
        $('bookMain').classList.remove('hidden');

        const dir = state.layout.direction;
        bookState.spreads = buildSpreads(state.pageCount, dir);
        bookState.idx     = 0;

        // Direction badge
        $('bookDirBadge').textContent = dir === 'rtl'
            ? '→ Right-to-Left (RTL) · spine on right'
            : '← Left-to-Right (LTR) · spine on left';

        // Size the page halves from first source page aspect ratio
        const src = state.sourcePages[0];
        const aspect = src
            ? (src.naturalW || (src.canvas||src).width) / (src.naturalH || (src.canvas||src).height)
            : 1 / Math.SQRT2;
        const H = Math.min(420, Math.floor((window.innerHeight - 360)));
        const W = Math.round(H * aspect);
        document.documentElement.style.setProperty('--bk-w', W + 'px');
        document.documentElement.style.setProperty('--bk-h', H + 'px');

        renderBookSpread();
    }

    function renderBookSpread() {
        const { spreads, idx } = bookState;
        const spread = spreads[idx];
        if (!spread) return;

        drawBookPage($('bookCanvasLeft'),  $('bookHalfLeft'),  $('bookLabelLeft'),  spread.left);
        drawBookPage($('bookCanvasRight'), $('bookHalfRight'), $('bookLabelRight'), spread.right);

        // Info line
        const isCover = spread.isCover;
        const isBack  = spread.isBack;
        const label   = isCover ? 'Front Cover'
                      : isBack  ? 'Back Cover'
                      : `Pages ${labelFor(spread.left, spread.right, state.layout.direction)}`;
        $('bookInfo').textContent = `${idx + 1} / ${spreads.length} — ${label}`;

        $('bookFirst').disabled = idx === 0;
        $('bookPrev').disabled  = idx === 0;
        $('bookNext').disabled  = idx === spreads.length - 1;
        $('bookLast').disabled  = idx === spreads.length - 1;
    }

    function labelFor(l, r, dir) {
        const fmt = i => i >= 0 ? `p.${i + 1}` : '—';
        return dir === 'rtl'
            ? `${fmt(r)} & ${fmt(l)}`   // right is read first in RTL
            : `${fmt(l)} & ${fmt(r)}`;
    }

    function drawBookPage(canvas, half, label, pageIdx) {
        const W = parseInt(getComputedStyle(document.documentElement)
                    .getPropertyValue('--bk-w')) || 240;
        const H = parseInt(getComputedStyle(document.documentElement)
                    .getPropertyValue('--bk-h')) || 340;
        const SCALE = 2;

        canvas.width  = W * SCALE;
        canvas.height = H * SCALE;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d');

        if (pageIdx < 0) {
            // Blank / outside-of-book side
            half.classList.add('is-blank');
            ctx.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#1c1c1e' : '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            label.textContent = '';
            return;
        }

        half.classList.remove('is-blank');
        ctx.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#2a2a2c' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const src = state.sourcePages[pageIdx];
        if (src) {
            const srcC = src.canvas || src;
            const srcW = src.naturalW || srcC.width;
            const srcH = src.naturalH || srcC.height;
            const sc   = Math.min((W * SCALE) / srcW, (H * SCALE) / srcH);
            const dw   = srcW * sc;
            const dh   = srcH * sc;
            const dx   = (W * SCALE - dw) / 2;
            const dy   = (H * SCALE - dh) / 2;
            ctx.drawImage(srcC, dx, dy, dw, dh);
        }

        label.textContent = `p.${pageIdx + 1}`;
    }

    // Book navigation buttons
    $('bookPrev').addEventListener('click',  () => { if (bookState.idx > 0) { bookState.idx--; renderBookSpread(); } });
    $('bookNext').addEventListener('click',  () => { if (bookState.idx < bookState.spreads.length - 1) { bookState.idx++; renderBookSpread(); } });
    $('bookFirst').addEventListener('click', () => { bookState.idx = 0; renderBookSpread(); });
    $('bookLast').addEventListener('click',  () => { bookState.idx = bookState.spreads.length - 1; renderBookSpread(); });

    // Keyboard navigation (only when book tab is visible)
    document.addEventListener('keydown', e => {
        if (!$('tabBook').classList.contains('active')) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); (state.layout?.direction === 'rtl' ? $('bookNext') : $('bookPrev')).click(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); (state.layout?.direction === 'rtl' ? $('bookPrev') : $('bookNext')).click(); }
        if (e.key === ' ')          { e.preventDefault(); $('bookNext').click(); }
    });

    // Click half to advance
    $('bookHalfRight').addEventListener('click', () => $('bookNext').click());
    $('bookHalfLeft').addEventListener('click',  () => $('bookPrev').click());

    /* ── Generate ─────────────────────────────────────────────────── */
    generateBtn.addEventListener('click', async () => {
        if (state.generating || !state.layout) return;
        state.generating = true;
        generateBtn.disabled = true;
        showProgress(true, 'Generating booklet…');

        try {
            const opts = getOptions();

            // Re-render at chosen quality if PDF source
            let pages = state.sourcePages;
            if (state.inputMode === 'pdf' && opts.quality !== 2 && fileInput.files[0]) {
                setProgress(0, 'Re-rendering at chosen quality…');
                pages = await Renderer.loadPdfPages(fileInput.files[0], opts.quality,
                    (d, t) => setProgress((d / t) * 40, `Rendering page ${d}/${t}…`));
            }

            const blob = await Renderer.generateBookletPdf(pages, state.layout, {
                ...opts,
                onProgress: (done, total) => setProgress(40 + (done / total) * 60,
                    `Imposing page ${done}/${total}…`),
            });

            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'booklet.pdf';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            alert('Generation failed: ' + err.message);
            console.error(err);
        } finally {
            state.generating  = false;
            generateBtn.disabled = false;
            showProgress(false);
        }
    });

    /* ── Progress ─────────────────────────────────────────────────── */
    function showProgress(show, text = '') {
        progressBar.classList.toggle('hidden', !show);
        if (text) progressText.textContent = text;
        if (!show) { progressFill.style.width = '0%'; }
    }

    function setProgress(pct, text) {
        progressFill.style.width = Math.round(pct) + '%';
        if (text) progressText.textContent = text;
    }

    /* ── Utilities ────────────────────────────────────────────────── */
    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }
})();
