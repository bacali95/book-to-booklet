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

    ['cropMarks','blankPageMark','centerLine'].forEach(id =>
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
    }

    function renderPageOrderGrid(layout, pageCount) {
        pageOrderGrid.innerHTML = '';

        // Create a map: source page idx → [list of positions]
        const pagePos = {};
        layout.sheets.forEach((sheet, si) => {
            [['front','left'], ['front','right'], ['back','left'], ['back','right']].forEach(([side,pos]) => {
                const idx = sheet[side][pos];
                if (idx >= 0) {
                    if (!pagePos[idx]) pagePos[idx] = [];
                    pagePos[idx].push({ sheet: si, side, pos });
                }
            });
        });

        // Show all output sheets
        layout.sheets.forEach((sheet, si) => {
            const sigEl = document.createElement('div');
            sigEl.className = 'order-sig-label';
            if (si === 0 || sheet.sigIndex !== layout.sheets[si - 1]?.sigIndex) {
                sigEl.textContent = layout.numSignatures > 1
                    ? `Signature ${sheet.sigIndex + 1}` : '';
            }

            const sheetEl = document.createElement('div');
            sheetEl.className = 'order-sheet';

            const makeHalf = (idx, label) => {
                const div = document.createElement('div');
                div.className = 'order-page' + (idx < 0 ? ' order-page-blank' : '');
                div.innerHTML = `<span class="order-page-num">${idx >= 0 ? idx + 1 : '—'}</span>
                                 <span class="order-page-label">${label}</span>`;
                if (idx >= 0) {
                    div.title = `Source page ${idx + 1}`;
                    // Thumbnail from source
                    const src = state.sourcePages[idx];
                    if (src) {
                        const c = src.canvas || src;
                        const thumb = document.createElement('canvas');
                        const scale = 48 / (src.naturalH || c.height);
                        thumb.width  = (src.naturalW || c.width) * scale;
                        thumb.height = (src.naturalH || c.height) * scale;
                        thumb.getContext('2d').drawImage(c, 0, 0, thumb.width, thumb.height);
                        thumb.className = 'order-thumb';
                        div.prepend(thumb);
                    }
                }
                return div;
            };

            const front = document.createElement('div');
            front.className = 'order-side';
            front.innerHTML = '<div class="order-side-label">Front</div>';
            front.appendChild(makeHalf(sheet.front.left, direction === 'rtl' ? 'Left' : 'Left'));
            front.appendChild(makeHalf(sheet.front.right, 'Right'));

            const back = document.createElement('div');
            back.className = 'order-side';
            back.innerHTML = '<div class="order-side-label">Back</div>';
            back.appendChild(makeHalf(sheet.back.left, 'Left'));
            back.appendChild(makeHalf(sheet.back.right, 'Right'));

            sheetEl.appendChild(front);
            sheetEl.appendChild(back);

            const wrapper = document.createElement('div');
            wrapper.className = 'order-sheet-wrapper';
            if (sigEl.textContent) wrapper.appendChild(sigEl);
            wrapper.appendChild(sheetEl);
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
