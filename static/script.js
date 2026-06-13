// ScoreFlow — Multi-notation: TAB / Grand Staff / Standard
const API = '/api/v1';
let selectedFile = null, selectedInstrument = 'guitar';
let sourceInstrument = 'guitar', zoomLevel = 1, currentNotation = null;

const $ = id => document.getElementById(id);
const uploadArea = $('uploadArea'), fileInput = $('fileInput'), fileInfo = $('fileInfo');
const fileName = $('fileName'), fileRemove = $('fileRemove');
const transcribeBtn = $('transcribeBtn'), convertBtn = $('convertBtn'), exportBtn = $('exportBtn');
const statusBar = $('statusBar'), statusText = $('statusText');
const scoreSection = $('scoreSection'), notation = $('notation'), noteCount = $('noteCount');
const scoreScroll = $('scoreScroll');
const errorBox = $('errorBox'), errorText = $('errorText'), errorClose = $('errorClose');
const zoomIn = $('zoomIn'), zoomOut = $('zoomOut');

const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
function pc(m) { return NAMES[m%12]; }
function mn(m) { return pc(m)+(Math.floor(m/12)-1); }
function pp(m) { const n=pc(m); return FLAT[n]||n; }

// ── UI: instrument, file, status ──
document.querySelectorAll('.inst').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.inst').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    selectedInstrument = b.dataset.id;
}));
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
function showStatus(m) { statusText.textContent = m; statusBar.style.display = 'flex'; }
function hideStatus() { statusBar.style.display = 'none'; }
function showError(m) { errorText.textContent = m; errorBox.style.display = 'flex'; }
function hideError() { errorBox.style.display = 'none'; }
errorClose.addEventListener('click', hideError);
zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2.0, +(zoomLevel+0.20).toFixed(1)); redraw(); });
zoomOut.addEventListener('click', () => { zoomLevel = Math.max(0.4, +(zoomLevel-0.20).toFixed(1)); redraw(); });
function redraw() { if (currentNotation) drawNotation(currentNotation); }

// ═══════════════════════════════════  DISPATCH  ═══════════════════════════════════
function renderNotation(nd, notes) {
    hideError();
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:2.5rem;color:#9ca3af;text-align:center;font-size:1.1rem">🎵 未识别到音符，请尝试其他音频</div>';
        scoreSection.style.display = 'block'; noteCount.textContent = '0 个音符'; currentNotation = null; return;
    }
    currentNotation = { ...nd, raw_notes: notes };
    scoreSection.style.display = 'block';
    noteCount.textContent = notes.length + ' 个音符';
    drawNotation(currentNotation);
}
function drawNotation(nd) {
    switch (nd.type) { case 'tab': drawTAB(nd); break; case 'grand_staff': drawGrandStaff(nd); break; default: drawTrebleClef(nd); }
}

// ═══════════════════════════════════  TAB  ═══════════════════════════════════
function drawTAB(nd) {
    const strings = nd.num_strings || 6, chords = nd.chords || [], tab = nd.tab_notes || nd.fretboard || [];
    const names = nd.tuning_names || [], N = tab.length;
    const SG = 20;  // string gap (wider for readability)
    const TH = strings * SG + 30;  // total TAB height
    const SP = 50;  // spacing between chord bars

    // Layout: chords on top (stacked), then TAB
    const chordRows = chords.length ? 1 : 0;
    const chordH = chordRows * 56;
    const top = 20 + chordH;
    const H = top + TH + 50;
    const ML = 70, MR = 50;
    const W = Math.max(680, N * zoomLevel * 52 + ML + MR);

    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fffef9"/>`;

    // ── Chord header ──
    if (chords.length) {
        const labels = chords.map(c => c.name).join(' · ');
        s += `<text x="${ML}" y="26" font-size="18" font-weight="bold" fill="#d97706">🎸 ${labels}</text>`;
    }

    // ── TAB lines ──
    for (let i = 0; i < strings; i++) {
        const y = top + i * SG + 6;
        s += `<line x1="${ML}" y1="${y}" x2="${W-MR}" y2="${y}" stroke="#bbb" stroke-width="1"/>`;
    }
    // Tuning labels on left
    if (names.length === strings) {
        for (let i = 0; i < strings; i++) {
            s += `<text x="${ML-14}" y="${top + i*SG + 11}" text-anchor="end" font-size="13" fill="#888">${names[i]}</text>`;
        }
    }

    // ── Fret numbers ──
    let cx = ML + 32;
    for (let i = 0; i < N; i++) {
        const n = tab[i], si = (n.string||1) - 1;
        const y = top + si * SG + 11, fr = n.fret || 0;
        cx = ML + 32 + i * zoomLevel * 50;
        if (cx > W - MR - 10) continue;
        const fs = Math.max(11, 15 * zoomLevel);
        s += `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(0)}" font-weight="bold" fill="${fr>0?'#4f6ef6':'#b0b0b0'}">${fr}</text>`;
    }

    // ── Bar lines ──
    for (let i = 4; i < N; i += 4) {
        const bx = ML + 32 + i * zoomLevel * 50 - zoomLevel * 25;
        if (bx < W - MR) s += `<line x1="${bx.toFixed(1)}" y1="${top+6}" y2="${top+(strings-1)*SG+6}" stroke="#999" stroke-width="1.2"/>`;
    }
    const fx = Math.min(ML + 32 + N * zoomLevel * 50, W - MR);
    s += `<line x1="${fx.toFixed(1)}" y1="${top+6}" y2="${top+(strings-1)*SG+6}" stroke="#444" stroke-width="2"/>`;

    s += footer(N, W, H);
    notation.innerHTML = s;
}

// ═══════════════════════════════════  GRAND STAFF  ═══════════════════════════════════
function drawGrandStaff(nd) {
    const treb = nd.treble_notes || [], bass = nd.bass_notes || [];
    const hasB = bass.length > 0, LG = 14;
    const PAD = 50, N = (nd.raw_notes||[]).length;
    const W = Math.max(700, N * zoomLevel * 56 + 2*PAD + 100);

    const staffH = 5 * LG + 30;
    const gap = hasB ? 50 : 20;
    const H = 40 + staffH + (hasB ? gap + staffH : 0) + 40;

    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fffef9"/>`;

    const trebTop = 30;
    // Brace
    if (hasB) {
        s += `<text x="${PAD}" y="${trebTop+18}" font-size="90" fill="#ccc">𝄔</text>`;
    }

    // Treble
    const trebBot = trebTop + 4*LG;
    s += staff5(PAD, trebTop, LG, W);
    s += `<text x="${PAD+6}" y="${trebBot+6}" font-size="52" fill="#555">𝄞</text>`;
    s += renderNotesOnStaff(treb, PAD+44, trebTop, LG, W-PAD-30, zoomLevel, 64);

    if (hasB) {
        const bassTop = trebBot + gap;
        s += staff5(PAD, bassTop, LG, W);
        s += `<text x="${PAD+8}" y="${bassTop+2*LG+6}" font-size="42" fill="#555">𝄢</text>`;
        s += renderNotesOnStaff(bass, PAD+44, bassTop, LG, W-PAD-30, zoomLevel, 43);
    }

    s += footer(N, W, H);
    notation.innerHTML = s;
}

// ═══════════════════════════════════  TREBLE CLEF  ═══════════════════════════════════
function drawTrebleClef(nd) {
    const notes = nd.raw_notes || nd.notes || [], N = notes.length;
    const LG = 16, PAD = 50;
    const H = 260,  // tall enough for ledger lines
    const W = Math.max(700, N * zoomLevel * 60 + 2*PAD + 80);

    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fffef9"/>`;
    s += staff5(PAD, 48, LG, W);
    s += `<text x="${PAD+6}" y="${48+4*LG+6}" font-size="60" fill="#555">𝄞</text>`;
    s += renderNotesOnStaff(notes, PAD+44, 48, LG, W-PAD-30, zoomLevel, 64);
    s += footer(N, W, H);
    notation.innerHTML = s;
}

// ── Shared helpers ──
function staff5(x, top, gap, W) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<line x1="${x}" y1="${top+i*gap}" x2="${W-40}" y2="${top+i*gap}" stroke="#ccc" stroke-width="0.7"/>`;
    return s;
}

function renderNotesOnStaff(notes, sx, top, gap, maxX, zoom, baseMidi) {
    if (!notes.length) return '';
    const baseY = top + 4*gap, spacing = Math.max(18, (maxX-sx-30)/notes.length) * zoom;
    let s = '';

    function ny(m) { return baseY - (m-baseMidi)*(gap/2); }

    // Ledger lines (pre-compute to avoid duplicates)
    const drawnLedger = new Set();
    notes.forEach(n => {
        const m = n.midi||60, y = ny(m);
        if (m < baseMidi) for (let lm = baseMidi-2; lm >= m; lm -= 2) {
            if (!drawnLedger.has(lm)) { drawnLedger.add(lm); const ly = ny(lm);
                s += `<line x1="${sx+12}" y1="${ly}" x2="${sx+40}" y2="${ly}" stroke="#ccc" stroke-width="0.5"/>`; }
        }
    });

    notes.forEach((n, i) => {
        const m = n.midi||60, y = ny(m), r = 6.5*zoom;
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

function footer(n, W, H) {
    return `<text x="${W/2}" y="${H-14}" text-anchor="middle" font-size="11" fill="#ccc">${n} notes · zoom ${Math.round(zoomLevel*100)}%</text></svg>`;
}

// ═══════════════════════════════════  API  ═══════════════════════════════════

async function transcribe() {
    if (!selectedFile) { showError('请先选择音频文件'); return; }
    hideError(); showStatus('AI 转写中… 音频越长耗时越久');

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('instrument', selectedInstrument);
    fd.append('output_format', 'musicxml');
    fd.append('separate_stems', 'false');

    try {
        const res = await fetch(API + '/transcribe', { method: 'POST', body: fd });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||'HTTP '+res.status); }
        const data = await res.json();
        sourceInstrument = data.instrument || selectedInstrument;
        zoomLevel = 1; hideStatus();
        renderNotation(data.notation, data.notes||[]);
    } catch(e) { hideStatus(); showError('转写失败：'+e.message); }
}

async function convertInstrument() {
    const n = currentNotation?.raw_notes;
    if (!n?.length) { showError('请先完成 AI 转写'); return; }
    const target = selectedInstrument;
    showStatus('转换 '+sourceInstrument+' → '+target+'…');

    const fd = new FormData();
    fd.append('source_id', sourceInstrument);
    fd.append('target_id', target);
    fd.append('notes', JSON.stringify(n));

    try {
        const res = await fetch(API + '/convert', { method: 'POST', body: fd });
        if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||'HTTP '+res.status); }
        const data = await res.json();
        zoomLevel = 1; hideStatus(); sourceInstrument = target;
        const localNd = localNotation(data.notes||[], target);
        renderNotation(localNd, data.notes||[]);
        if (data.removed_notes) noteCount.textContent += ' · '+data.removed_notes+' 超音域移除';
    } catch(e) { hideStatus(); showError('转换失败：'+e.message); }
}

function localNotation(notes, inst) {
    if (['guitar','ukulele'].includes(inst)) return { type: 'treble_clef', raw_notes: notes };
    if (['piano','harp'].includes(inst)) {
        const mid = inst==='harp'?48:60;
        return { type: 'grand_staff', treble_notes: notes.filter(n=>n.midi>=mid), bass_notes: notes.filter(n=>n.midi<mid), raw_notes: notes };
    }
    return { type: 'treble_clef', raw_notes: notes };
}

async function exportMidi() {
    const n = currentNotation?.raw_notes;
    if (!n?.length) { showError('请先完成 AI 转写'); return; }
    showStatus('导出 MIDI 中…');

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
        hideStatus();
    } catch(e) { hideStatus(); showError('导出失败：'+e.message); }
}

transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportBtn.addEventListener('click', exportMidi);
