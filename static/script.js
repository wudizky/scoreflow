// ScoreFlow — Dual engine: OSMD + rock-solid inline SVG
const API = '/api/v1';
let selectedFile = null, selectedInstrument = 'guitar';
let sourceInstrument = 'guitar', currentNotation = null, zoomLevel = 1;

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

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── OSMD detection ──
const OSMD_AVAILABLE = (typeof opensheetmusicdisplay !== 'undefined');
renderBadge.textContent = OSMD_AVAILABLE ? '🎼 OSMD' : '🎨 SVG';
renderBadge.className = OSMD_AVAILABLE ? 'render-badge osmd' : 'render-badge svg';

// ── Instrument ──
document.querySelectorAll('.inst').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.inst').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); selectedInstrument = b.dataset.id;
}));

// ── File upload ──
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files.length) setFile(e.target.files[0]); });
['dragover','dragleave','drop'].forEach(ev => uploadArea.addEventListener(ev, e => {
    e.preventDefault();
    if (ev === 'dragover') uploadArea.classList.add('drag-over');
    else if (ev === 'dragleave') uploadArea.classList.remove('drag-over');
    else { uploadArea.classList.remove('drag-over'); if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]); }
}));
fileRemove.addEventListener('click', () => { selectedFile = null; fileInfo.style.display = 'none'; uploadArea.style.display = ''; });
function setFile(f) { selectedFile = f; fileName.textContent = f.name; uploadArea.style.display = 'none'; fileInfo.style.display = 'flex'; }

function showError(m) { errorText.textContent = m; errorBox.style.display = 'flex'; }
function hideError() { errorBox.style.display = 'none'; }
errorClose.addEventListener('click', hideError);

// ── Zoom ──
zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2.0, +(zoomLevel+0.15).toFixed(2)); renderCurrent(); });
zoomOut.addEventListener('click', () => { zoomLevel = Math.max(0.4, +(zoomLevel-0.15).toFixed(2)); renderCurrent(); });
function renderCurrent() { if (currentNotation) renderNotation(currentNotation.data, currentNotation.notes); }

// ═══════════════════════════  4-STEP PROGRESS  ═══════════════════════════
let progressTimer = null;
function startProgress() {
    progressBar.style.display = 'block';
    ['step1','step2','step3','step4'].forEach(s => $(s).classList.remove('active','done'));
    ['conn1','conn2','conn3'].forEach(c => $(c).classList.remove('active'));
    progressLabel.textContent = '🔊 音频分离中…';
    $('step1').classList.add('active');
    let current = 0;
    const labels = ['🔊 音频分离中…','🎯 音高识别中…','🔄 乐谱转换中…','📜 编排生成中…'];
    progressTimer = setInterval(() => {
        $(['step1','step2','step3','step4'][current]).classList.remove('active');
        $(['step1','step2','step3','step4'][current]).classList.add('done');
        if (current < 3) { $(['conn1','conn2','conn3'][current]).classList.add('active'); current++; $(['step1','step2','step3','step4'][current]).classList.add('active'); progressLabel.textContent = labels[current]; }
    }, 2500);
}
function stopProgress(ok) {
    clearInterval(progressTimer);
    ['step1','step2','step3','step4'].forEach(s => { $(s).classList.remove('active'); $(s).classList.add('done'); });
    ['conn1','conn2','conn3'].forEach(c => $(c).classList.add('active'));
    progressLabel.textContent = ok ? '✅ 完成' : '❌ 出错';
    setTimeout(() => { progressBar.style.display = 'none'; }, ok ? 1200 : 3000);
}

// ═══════════════════════════  MAIN RENDER  ═══════════════════════════
function renderResult(data, notes) {
    hideError();
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:3rem;color:#9ca3af;text-align:center;font-size:1.2rem">🎵 未识别到音符</div>';
        scoreSection.style.display = 'block'; noteCount.textContent = '0 个音符';
        chordBar.style.display = 'none'; currentNotation = null; return;
    }
    currentNotation = { data, notes };
    scoreSection.style.display = 'block';
    noteCount.textContent = notes.length + ' 个音符';
    renderNotation(data, notes);
}

function renderNotation(data, notes) {
    const nd = data.notation || {};
    const xml = data.musicxml || '';

    // Chord bar
    if (nd.chords && nd.chords.length) {
        chordBar.style.display = 'flex';
        chordBar.innerHTML = nd.chords.map(c => `<span class="chord-chip">${c.name}</span>`).join('');
    } else { chordBar.style.display = 'none'; }

    // Try OSMD first
    if (OSMD_AVAILABLE && xml && xml.includes('<score-partwise')) {
        osmdContainer.style.display = 'block'; notation.style.display = 'none';
        try {
            const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdContainer, {
                autoResize: true, backend: 'svg',
                drawTitle: false, drawSubtitle: false, drawComposer: false, drawPartNames: false,
            });
            osmd.load(xml).then(() => {
                osmd.render();
                renderBadge.textContent = '🎼 OSMD'; renderBadge.className = 'render-badge osmd';
            }).catch(() => { drawSVG(nd, notes); });
        } catch(e) { drawSVG(nd, notes); }
        return;
    }
    drawSVG(nd, notes);
}

function drawSVG(nd, notes) {
    renderBadge.textContent = '🎨 SVG'; renderBadge.className = 'render-badge svg';
    osmdContainer.style.display = 'none'; notation.style.display = 'block';
    const type = nd.type || 'treble_clef';

    // ═══ COMMON CONSTANTS ═══
    const N = notes.length;
    const NOTE_GAP = 56;          // pixels between consecutive notes at zoom=1
    const PAD = 60;              // left/right margin
    const STAFF_X0 = PAD + 50;   // start of note area
    const STAFF_W = N * NOTE_GAP * zoomLevel + 60;  // note area width
    const W = STAFF_X0 + STAFF_W + PAD;              // total SVG width
    const LG = 16;               // line gap
    const STAFF_Y = 48;          // top of 5-line staff
    const STAFF_BOT = STAFF_Y + 4 * LG;  // bottom line Y
    const H = type === 'grand_staff' ? 340 : type === 'tab' ? 180 : 270;
    const baseMidi = 64;         // E4 = bottom line

    function midiY(midi) { return STAFF_BOT - (midi - baseMidi) * (LG / 2); }

    let svg = `<svg width="${W.toFixed(0)}" height="${H}" viewBox="0 0 ${W.toFixed(0)} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W.toFixed(0)}" height="${H}" fill="#fffef9"/>`;

    // ── TAB specific ──
    if (type === 'tab') {
        const strings = nd.num_strings || 6;
        const tab = nd.tab_notes || nd.fretboard || [];
        const names = nd.tuning_names || [];
        const tabTop = 30, tabGap = 20;
        for (let s = 0; s < strings; s++) {
            const y = tabTop + s * tabGap;
            svg += `<line x1="${PAD}" y1="${y}" x2="${W-PAD}" y2="${y}" stroke="#ccc" stroke-width="1"/>`;
        }
        if (names.length === strings) {
            for (let s = 0; s < strings; s++)
                svg += `<text x="${PAD-14}" y="${tabTop + s*tabGap + 4}" text-anchor="end" font-size="12" fill="#999">${names[s]}</text>`;
        }
        tab.forEach((n, i) => {
            if (!n || n.string == null) return;
            const si = (n.string || 1) - 1;
            const fr = n.fret || 0;
            const cx = STAFF_X0 + i * NOTE_GAP * zoomLevel;
            if (cx > W - PAD - 10) return;
            const y = tabTop + si * tabGap + 4;
            svg += `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${(13*zoomLevel).toFixed(0)}" font-weight="bold" fill="${fr>0?'#4f6ef6':'#aaa'}">${fr}</text>`;
        });
        svg += '</svg>';
        notation.innerHTML = svg;
        return;
    }

    // ── Grand staff ──
    if (type === 'grand_staff') {
        const treb = nd.treble_notes || [];
        const bass = nd.bass_notes || [];
        const hasBass = bass.length > 0 && bass.length < notes.length;

        // Treble staff
        for (let i = 0; i < 5; i++)
            svg += `<line x1="${PAD}" y1="${STAFF_Y + i*LG}" x2="${W-PAD}" y2="${STAFF_Y + i*LG}" stroke="#ccc" stroke-width="0.7"/>`;
        svg += `<text x="${PAD+6}" y="${STAFF_BOT+6}" font-size="52" fill="#555">𝄞</text>`;

        const allTreb = treb.length ? treb : notes;
        allTreb.forEach((n, i) => {
            const m = n.midi || 60;
            const y = midiY(m);
            const cx = STAFF_X0 + i * NOTE_GAP * zoomLevel;
            if (cx > W - PAD - 10) return;
            const r = 6.5 * zoomLevel;
            svg += `<ellipse cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r*0.72).toFixed(1)}" fill="#4f6ef6" stroke="#3344cc" stroke-width="${(1.2*zoomLevel).toFixed(1)}"/>`;
            // Stem
            const sh = 34 * zoomLevel;
            svg += y > STAFF_BOT - 2*LG
                ? `<line x1="${(cx+r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx+r).toFixed(1)}" y2="${(y-sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoomLevel).toFixed(1)}"/>`
                : `<line x1="${(cx-r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx-r).toFixed(1)}" y2="${(y+sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoomLevel).toFixed(1)}"/>`;
            // Accidental
            const pc = NOTE_NAMES[m % 12];
            if (pc.includes('#')) svg += `<text x="${(cx-r*2.5).toFixed(1)}" y="${(y+5*zoomLevel).toFixed(1)}" font-size="${(18*zoomLevel).toFixed(0)}" fill="#d97706">♯</text>`;
            else if (pc.includes('b')) svg += `<text x="${(cx-r*2.5).toFixed(1)}" y="${(y+5*zoomLevel).toFixed(1)}" font-size="${(18*zoomLevel).toFixed(0)}" fill="#d97706">♭</text>`;
        });

        if (hasBass) {
            const bassTop = STAFF_BOT + 56;
            for (let i = 0; i < 5; i++)
                svg += `<line x1="${PAD}" y1="${bassTop + i*LG}" x2="${W-PAD}" y2="${bassTop + i*LG}" stroke="#ccc" stroke-width="0.7"/>`;
            svg += `<text x="${PAD+8}" y="${bassTop+2*LG+6}" font-size="42" fill="#555">𝄢</text>`;
            const bassBase = bassTop + 4 * LG;
            const bassMidi = 43;
            bass.forEach((n, i) => {
                const m = n.midi || 43;
                const y = bassBase - (m - bassMidi) * (LG / 2);
                const cx = STAFF_X0 + i * NOTE_GAP * zoomLevel;
                if (cx > W - PAD - 10) return;
                const r = 6.5 * zoomLevel;
                svg += `<ellipse cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r*0.72).toFixed(1)}" fill="#4f6ef6" stroke="#3344cc" stroke-width="${(1.2*zoomLevel).toFixed(1)}"/>`;
                const sh = 34 * zoomLevel;
                svg += y > bassBase - 2*LG
                    ? `<line x1="${(cx+r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx+r).toFixed(1)}" y2="${(y-sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoomLevel).toFixed(1)}"/>`
                    : `<line x1="${(cx-r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx-r).toFixed(1)}" y2="${(y+sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoomLevel).toFixed(1)}"/>`;
            });
        }
        svg += '</svg>';
        notation.innerHTML = svg;
        return;
    }

    // ═══ Standard treble clef ═══
    for (let i = 0; i < 5; i++)
        svg += `<line x1="${PAD}" y1="${STAFF_Y + i*LG}" x2="${W-PAD}" y2="${STAFF_Y + i*LG}" stroke="#ccc" stroke-width="0.6"/>`;
    svg += `<text x="${PAD+6}" y="${STAFF_BOT+6}" font-size="56" fill="#555">𝄞</text>`;

    notes.forEach((n, i) => {
        const m = n.midi || 60;
        const y = midiY(m);
        const cx = STAFF_X0 + i * NOTE_GAP * zoomLevel;
        if (cx > W - PAD - 10) return;
        const r = 6.5 * zoomLevel;

        // Ledger lines
        if (m < 60) {
            for (let lm = 62; lm >= m; lm -= 2) {
                const ly = midiY(lm);
                svg += `<line x1="${cx - r*2.5}" y1="${ly}" x2="${cx + r*2.5}" y2="${ly}" stroke="#ccc" stroke-width="0.5"/>`;
            }
        }
        if (m > 81) {
            for (let lm = 83; lm <= m; lm += 2) {
                const ly = midiY(lm);
                svg += `<line x1="${cx - r*2.5}" y1="${ly}" x2="${cx + r*2.5}" y2="${ly}" stroke="#ccc" stroke-width="0.5"/>`;
            }
        }

        svg += `<ellipse cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r*0.72).toFixed(1)}" fill="#4f6ef6" stroke="#3344cc" stroke-width="${(1.2*zoomLevel).toFixed(1)}"/>`;
        // Stem
        const sh = 34 * zoomLevel;
        if (y > STAFF_BOT - 2*LG) {
            svg += `<line x1="${(cx+r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx+r).toFixed(1)}" y2="${(y-sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoomLevel).toFixed(1)}"/>`;
        } else {
            svg += `<line x1="${(cx-r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx-r).toFixed(1)}" y2="${(y+sh).toFixed(1)}" stroke="#444" stroke-width="${(1.4*zoomLevel).toFixed(1)}"/>`;
        }
        // Accidental
        const pc = NOTE_NAMES[m % 12];
        if (pc.includes('#')) svg += `<text x="${(cx-r*2.5).toFixed(1)}" y="${(y+5*zoomLevel).toFixed(1)}" font-size="${(18*zoomLevel).toFixed(0)}" fill="#d97706">♯</text>`;
        else if (pc.includes('b')) svg += `<text x="${(cx-r*2.5).toFixed(1)}" y="${(y+5*zoomLevel).toFixed(1)}" font-size="${(18*zoomLevel).toFixed(0)}" fill="#d97706">♭</text>`;
    });

    svg += '</svg>';
    notation.innerHTML = svg;
}

// ═══════════════════════════  API  ═══════════════════════════
async function transcribe() {
    if (!selectedFile) { showError('请先选择音频文件'); return; }
    hideError(); startProgress();
    const fd = new FormData();
    fd.append('file', selectedFile); fd.append('instrument', selectedInstrument);
    fd.append('output_format', 'musicxml');
    try {
        const res = await fetch(API + '/transcribe', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'HTTP ' + res.status);
        stopProgress(true); sourceInstrument = data.instrument || selectedInstrument;
        zoomLevel = 1; renderResult(data, data.notes || []);
        if (data.full_note_count && data.full_note_count > (data.notes||[]).length)
            noteCount.textContent = data.notes.length + ' / ' + data.full_note_count + ' 个音符';
    } catch(e) { stopProgress(false); showError('转写失败：' + e.message); console.error(e); }
}

async function convertInstrument() {
    const n = currentNotation?.notes;
    if (!n?.length) { showError('请先完成 AI 转写'); return; }
    startProgress();
    const fd = new FormData();
    fd.append('source_id', sourceInstrument); fd.append('target_id', selectedInstrument);
    fd.append('notes', JSON.stringify(n));
    try {
        const res = await fetch(API + '/convert', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'HTTP ' + res.status);
        stopProgress(true); sourceInstrument = selectedInstrument;
        zoomLevel = 1; renderResult(data, data.notes || []);
        if (data.removed_notes) noteCount.textContent += ' · 超音域移除 ' + data.removed_notes;
    } catch(e) { stopProgress(false); showError('转换失败：' + e.message); console.error(e); }
}

async function exportMidi() {
    const n = currentNotation?.notes;
    if (!n?.length) { showError('请先完成 AI 转写'); return; }
    const fd = new FormData();
    fd.append('source_id', sourceInstrument); fd.append('target_id', sourceInstrument);
    fd.append('notes', JSON.stringify(n));
    try {
        const res = await fetch(API + '/convert-midi', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await res.blob());
        a.download = 'scoreflow_' + sourceInstrument + '_' + Date.now() + '.mid';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) { showError('导出失败：' + e.message); }
}

transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportBtn.addEventListener('click', exportMidi);
