// ScoreFlow — OSMD professional rendering + inline SVG fallback + 4-step progress
const API = '/api/v1';
let selectedFile = null, selectedInstrument = 'guitar';
let sourceInstrument = 'guitar', currentNotation = null;
let zoomLevel = 1, useOSMD = false, osmdInstance = null;

const $ = id => document.getElementById(id);
const uploadArea = $('uploadArea'), fileInput = $('fileInput'), fileInfo = $('fileInfo');
const fileName = $('fileName'), fileRemove = $('fileRemove');
const transcribeBtn = $('transcribeBtn'), convertBtn = $('convertBtn'), exportBtn = $('exportBtn');
const progressBar = $('progressBar'), progressLabel = $('progressLabel');
const scoreSection = $('scoreSection'), notation = $('notation'), noteCount = $('noteCount');
const scoreScroll = $('scoreScroll'), osmdContainer = $('osmdContainer');
const chordBar = $('chordBar'), renderBadge = $('renderBadge');
const errorBox = $('errorBox'), errorText = $('errorText'), errorClose = $('errorClose');
const zoomIn = $('zoomIn'), zoomOut = $('zoomOut');

const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
function pc(m) { return NAMES[m%12]; }
function midiName(m) { return pc(m)+(Math.floor(m/12)-1); }

// ── OSMD detection ──
(function checkOSMD() {
    if (typeof opensheetmusicdisplay !== 'undefined') {
        useOSMD = true;
        renderBadge.textContent = '🎼 OSMD 引擎';
        renderBadge.className = 'render-badge osmd';
    } else {
        renderBadge.textContent = '🎨 SVG 引擎';
        renderBadge.className = 'render-badge svg';
    }
})();

// ── Instrument selector ──
document.querySelectorAll('.inst').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.inst').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    selectedInstrument = b.dataset.id;
}));

// ── File upload ──
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files.length) setFile(e.target.files[0]); });
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
});
fileRemove.addEventListener('click', () => {
    selectedFile = null; fileInfo.style.display = 'none'; uploadArea.style.display = '';
});
function setFile(f) { selectedFile = f; fileName.textContent = f.name; uploadArea.style.display = 'none'; fileInfo.style.display = 'flex'; }

// ── Error ──
function showError(m) { errorText.textContent = m; errorBox.style.display = 'flex'; }
function hideError() { errorBox.style.display = 'none'; }
errorClose.addEventListener('click', hideError);

// ── Zoom ──
zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2.0, +(zoomLevel + 0.15).toFixed(2)); redraw(); });
zoomOut.addEventListener('click', () => { zoomLevel = Math.max(0.4, +(zoomLevel - 0.15).toFixed(2)); redraw(); });
function redraw() { if (currentNotation) drawNotation(currentNotation); }

// ═══════════════════════════  4-STEP PROGRESS  ═══════════════════════════
let progressTimer = null;
function startProgress() {
    progressBar.style.display = 'block';
    const steps = ['step1','step2','step3','step4'];
    const labels = ['🔊 音频分离中…','🎯 音高识别中…','🔄 乐谱转换中…','📜 编排生成中…'];
    steps.forEach(s => $(s).classList.remove('active','done'));
    ['conn1','conn2','conn3'].forEach(c => $(c).classList.remove('active'));
    progressLabel.textContent = labels[0];
    // Step 1 immediately active
    $('step1').classList.add('active');

    let current = 0;
    progressTimer = setInterval(() => {
        $(steps[current]).classList.remove('active');
        $(steps[current]).classList.add('done');
        if (current < 3) {
            $(['conn1','conn2','conn3'][current]).classList.add('active');
            current++;
            $(steps[current]).classList.add('active');
            progressLabel.textContent = labels[current];
        }
    }, 2500);
}
function stopProgress(final = false) {
    clearInterval(progressTimer);
    const steps = ['step1','step2','step3','step4'];
    steps.forEach(s => { $(s).classList.remove('active'); $(s).classList.add('done'); });
    ['conn1','conn2','conn3'].forEach(c => $(c).classList.add('active'));
    if (final) {
        progressLabel.textContent = '✅ 完成';
        setTimeout(() => { progressBar.style.display = 'none'; }, 1200);
    } else {
        progressLabel.textContent = '';
        setTimeout(() => { progressBar.style.display = 'none'; }, 600);
    }
}

// ═══════════════════════════  RENDER DISPATCH  ═══════════════════════════
function renderResult(data, notes) {
    hideError();
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:2.5rem;color:#9ca3af;text-align:center;font-size:1.1rem">🎵 未识别到音符，请尝试其他音频</div>';
        scoreSection.style.display = 'block';
        noteCount.textContent = '0 个音符';
        currentNotation = null;
        chordBar.style.display = 'none';
        return;
    }
    const nd = data.notation || {};
    const musicxml = data.musicxml || '';
    currentNotation = { ...nd, musicxml, raw_notes: notes };
    scoreSection.style.display = 'block';
    noteCount.textContent = notes.length + ' 个音符';
    drawNotation(currentNotation);
}

function drawNotation(nd) {
    osmdContainer.innerHTML = '';
    notation.innerHTML = '';

    // Show chord bar for guitar/ukulele
    if (nd.chords && nd.chords.length) {
        chordBar.style.display = 'flex';
        chordBar.innerHTML = nd.chords.map(c => `<span class="chord-chip">${c.name}</span>`).join('');
    } else {
        chordBar.style.display = 'none';
    }

    if (useOSMD && nd.musicxml) {
        renderOSMD(nd.musicxml);
    } else {
        // Fallback to inline SVG
        switch (nd.type) {
            case 'tab': drawTAB(nd); break;
            case 'grand_staff': drawGrandStaff(nd); break;
            default: drawTrebleClef(nd);
        }
    }
}

// ═══════════════════════════  OSMD RENDERING  ═══════════════════════════
function renderOSMD(musicxml) {
    notation.style.display = 'none';
    osmdContainer.style.display = 'block';

    try {
        osmdInstance = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdContainer, {
            autoResize: true,
            backend: 'svg',
            drawTitle: false,
            drawSubtitle: false,
            drawComposer: false,
            pageFormat: 'Endless',  // continuous horizontal scroll
            coloringMode: 0,        // 0=monochrome, 1=color notes
        });
        osmdInstance.load(musicxml).then(() => {
            osmdInstance.render();
            // Apply zoom
            const svg = osmdContainer.querySelector('svg');
            if (svg) {
                svg.style.width = (zoomLevel * 100) + '%';
                svg.style.height = 'auto';
            }
            renderBadge.textContent = '🎼 OSMD 引擎';
        }).catch(e => {
            console.warn('OSMD render failed, SVG fallback:', e);
            renderBadge.textContent = '🎨 SVG 引擎（OSMD 失败）';
            notation.style.display = 'block';
            osmdContainer.style.display = 'none';
            if (currentNotation) drawSVGFallback(currentNotation);
        });
    } catch(e) {
        console.warn('OSMD init failed:', e);
        notation.style.display = 'block';
        osmdContainer.style.display = 'none';
        if (currentNotation) drawSVGFallback(currentNotation);
    }
}

function drawSVGFallback(nd) {
    switch (nd.type) {
        case 'tab': drawTAB(nd); break;
        case 'grand_staff': drawGrandStaff(nd); break;
        default: drawTrebleClef(nd);
    }
}

// ═══════════════════════════  SVG FALLBACK RENDERERS  ═══════════════════════════
function drawTAB(nd) {
    const strings = nd.num_strings || 6, tab = nd.tab_notes || nd.fretboard || [];
    const names = nd.tuning_names || [], N = tab.length;
    const SG = 20, TH = strings * SG + 20, H = 170, ML = 70, W = Math.max(680, N * zoomLevel * 52 + ML + 50);

    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fffef9"/>`;
    const top = 20;
    for (let i = 0; i < strings; i++) {
        const y = top + i * SG;
        s += `<line x1="${ML}" y1="${y}" x2="${W-40}" y2="${y}" stroke="#bbb" stroke-width="1"/>`;
    }
    if (names.length === strings) {
        for (let i = 0; i < strings; i++) {
            s += `<text x="${ML-14}" y="${top + i*SG + 5}" text-anchor="end" font-size="13" fill="#888">${names[i]}</text>`;
        }
    }
    let cx = ML + 32;
    for (let i = 0; i < N; i++) {
        const n = tab[i], si = (n.string||1) - 1, y = top + si * SG + 5, fr = n.fret || 0;
        cx = ML + 32 + i * zoomLevel * 50;
        if (cx > W - 50) continue;
        const fs = Math.max(11, 15 * zoomLevel);
        s += `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(0)}" font-weight="bold" fill="${fr>0?'#4f6ef6':'#aaa'}">${fr}</text>`;
    }
    // Bar lines
    for (let i = 4; i < N; i += 4) {
        const bx = ML + 32 + i * zoomLevel * 50 - zoomLevel * 25;
        if (bx < W - 40) s += `<line x1="${bx.toFixed(1)}" y1="${top}" y2="${top+(strings-1)*SG}" stroke="#999" stroke-width="1.2"/>`;
    }
    const fx = Math.min(ML + 32 + N * zoomLevel * 50, W - 40);
    s += `<line x1="${fx.toFixed(1)}" y1="${top}" y2="${top+(strings-1)*SG}" stroke="#444" stroke-width="2"/>`;
    s += footerSvg(N, W, H);
    notation.innerHTML = s;
}

function drawGrandStaff(nd) {
    const treb = nd.treble_notes || [], bass = nd.bass_notes || [];
    const hasB = bass.length > 0, LG = 14, N = (nd.raw_notes||[]).length;
    const H = hasB ? 400 : 240, PAD = 50;
    const W = Math.max(700, N * zoomLevel * 56 + 2*PAD + 100);
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fffef9"/>`;
    if (hasB) s += `<text x="${PAD}" y="48" font-size="90" fill="#ccc">𝄔</text>`;
    const trebTop = 30;
    s += staff5(PAD, trebTop, LG, W);
    s += `<text x="${PAD+6}" y="${trebTop+4*LG+6}" font-size="52" fill="#555">𝄞</text>`;
    s += renderStaffNotes(treb, PAD+44, trebTop, LG, W-PAD-30, zoomLevel, 64);
    if (hasB) {
        const bassTop = trebTop + 4*LG + 56;
        s += staff5(PAD, bassTop, LG, W);
        s += `<text x="${PAD+8}" y="${bassTop+2*LG+6}" font-size="42" fill="#555">𝄢</text>`;
        s += renderStaffNotes(bass, PAD+44, bassTop, LG, W-PAD-30, zoomLevel, 43);
    }
    s += footerSvg(N, W, H);
    notation.innerHTML = s;
}

function drawTrebleClef(nd) {
    const notes = nd.raw_notes || nd.notes || [], N = notes.length, LG = 16;
    const H = 260, PAD = 50, W = Math.max(700, N * zoomLevel * 60 + 2*PAD + 80);
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fffef9"/>`;
    s += staff5(PAD, 48, LG, W);
    s += `<text x="${PAD+6}" y="${48+4*LG+6}" font-size="60" fill="#555">𝄞</text>`;
    s += renderStaffNotes(notes, PAD+44, 48, LG, W-PAD-30, zoomLevel, 64);
    s += footerSvg(N, W, H);
    notation.innerHTML = s;
}

function staff5(x, top, gap, W) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<line x1="${x}" y1="${top+i*gap}" x2="${W-40}" y2="${top+i*gap}" stroke="#ccc" stroke-width="0.7"/>`;
    return s;
}

function renderStaffNotes(notes, sx, top, gap, maxX, zoom, baseMidi) {
    if (!notes.length) return '';
    const baseY = top + 4*gap, spacing = Math.max(18, (maxX-sx-30)/notes.length) * zoom;
    let s = '';
    const drawnLedger = new Set();
    notes.forEach(n => {
        const m = n.midi||60, y = baseY - (m-baseMidi)*(gap/2);
        if (m < baseMidi) for (let lm = baseMidi-2; lm >= m; lm -= 2) {
            if (!drawnLedger.has(lm)) { drawnLedger.add(lm); const ly = baseY - (lm-baseMidi)*(gap/2);
                s += `<line x1="${sx+12}" y1="${ly}" x2="${sx+40}" y2="${ly}" stroke="#ccc" stroke-width="0.5"/>`; }
        }
    });
    notes.forEach((n, i) => {
        const m = n.midi||60, y = baseY - (m-baseMidi)*(gap/2), r = 6.5*zoom;
        const cx = sx + 28 + i*spacing;
        if (cx > maxX) return;
        s += `<ellipse cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r}" ry="${(r*0.72).toFixed(1)}" fill="#4f6ef6" stroke="#3344cc" stroke-width="${(1.2*zoom).toFixed(1)}"/>`;
        const sh = 34*zoom;
        if (y > baseY-2*gap) s += `<line x1="${(cx+r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx+r).toFixed(1)}" y2="${(y-sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoom).toFixed(1)}"/>`;
        else s += `<line x1="${(cx-r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx-r).toFixed(1)}" y2="${(y+sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoom).toFixed(1)}"/>`;
        const p = pc(m);
        if (p.includes('#')) s += `<text x="${(cx-r*2.5).toFixed(1)}" y="${(y+5*zoom).toFixed(1)}" font-size="${(18*zoom).toFixed(0)}" fill="#d97706">♯</text>`;
        else if (p.includes('b')) s += `<text x="${(cx-r*2.5).toFixed(1)}" y="${(y+5*zoom).toFixed(1)}" font-size="${(18*zoom).toFixed(0)}" fill="#d97706">♭</text>`;
    });
    // Bar lines
    for (let i = 4; i < notes.length; i += 4) {
        const bx = sx + 28 + i*spacing - spacing/2;
        s += `<line x1="${bx.toFixed(1)}" y1="${top}" y2="${top+4*gap}" stroke="#888" stroke-width="1.2"/>`;
    }
    const fx = sx + 28 + notes.length*spacing;
    s += `<line x1="${fx.toFixed(1)}" y1="${top}" y2="${top+4*gap}" stroke="#444" stroke-width="1.8"/>`;
    s += `<line x1="${(fx+5).toFixed(1)}" y1="${top}" y2="${top+4*gap}" stroke="#ccc" stroke-width="1.2"/>`;
    return s;
}

function footerSvg(n, W, H) {
    return `<text x="${W/2}" y="${H-14}" text-anchor="middle" font-size="11" fill="#ccc">${n} notes · zoom ${Math.round(zoomLevel*100)}%</text></svg>`;
}

// ═══════════════════════════  API CALLS  ═══════════════════════════

async function transcribe() {
    if (!selectedFile) { showError('请先选择音频文件'); return; }
    hideError(); startProgress();

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('instrument', selectedInstrument);
    fd.append('output_format', 'musicxml');

    try {
        const res = await fetch(API + '/transcribe', { method: 'POST', body: fd });
        stopProgress(true);
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||'HTTP '+res.status); }
        const data = await res.json();
        sourceInstrument = data.instrument || selectedInstrument;
        zoomLevel = 1;
        renderResult(data, data.notes || []);
        const shown = data.notes?.length || 0;
        const full = data.full_note_count || data.note_count || shown;
        if (shown < full) noteCount.textContent = shown + ' / ' + full + ' 个音符';
    } catch(e) { stopProgress(false); showError('转写失败：'+e.message); console.error(e); }
}

async function convertInstrument() {
    const n = currentNotation?.raw_notes;
    if (!n?.length) { showError('请先完成 AI 转写'); return; }
    const target = selectedInstrument;
    startProgress();

    const fd = new FormData();
    fd.append('source_id', sourceInstrument);
    fd.append('target_id', target);
    fd.append('notes', JSON.stringify(n));

    try {
        const res = await fetch(API + '/convert', { method: 'POST', body: fd });
        stopProgress(true);
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||'HTTP '+res.status); }
        const data = await res.json();
        sourceInstrument = target;
        zoomLevel = 1;
        renderResult(data, data.notes || []);
        if (data.removed_notes) noteCount.textContent += ' · ' + data.removed_notes + ' 超音域移除';
    } catch(e) { stopProgress(false); showError('转换失败：'+e.message); console.error(e); }
}

async function exportMidi() {
    const n = currentNotation?.raw_notes;
    if (!n?.length) { showError('请先完成 AI 转写'); return; }

    const fd = new FormData();
    fd.append('source_id', sourceInstrument);
    fd.append('target_id', sourceInstrument);
    fd.append('notes', JSON.stringify(n));

    try {
        const res = await fetch(API + '/convert-midi', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await res.blob());
        a.download = 'scoreflow_'+sourceInstrument+'_'+Date.now()+'.mid';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) { showError('导出失败：'+e.message); }
}

transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportBtn.addEventListener('click', exportMidi);
