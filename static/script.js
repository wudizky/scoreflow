// ScoreFlow — Frontend Logic (matched to actual backend API)
const API = '/api/v1';

// ── State ──
let selectedFile = null, selectedInstrument = 'guitar';
let currentNotes = [], sourceInstrument = 'guitar', zoomLevel = 1;

// ── DOM refs ──
const $ = id => document.getElementById(id);
const uploadArea = $('uploadArea'), fileInput = $('fileInput'), fileInfo = $('fileInfo');
const fileName = $('fileName'), fileRemove = $('fileRemove');
const transcribeBtn = $('transcribeBtn'), convertBtn = $('convertBtn'), exportBtn = $('exportBtn');
const statusBar = $('statusBar'), statusText = $('statusText');
const scoreSection = $('scoreSection'), notation = $('notation'), noteCount = $('noteCount');
const scoreScroll = $('scoreScroll');
const errorBox = $('errorBox'), errorText = $('errorText'), errorClose = $('errorClose');
const zoomIn = $('zoomIn'), zoomOut = $('zoomOut');

// ── Instrument selector (IDs match backend engine/instruments/*.py) ──
document.querySelectorAll('.inst').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.inst').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedInstrument = btn.dataset.id;
    });
});

// ── File upload ──
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files.length) setFile(e.target.files[0]); });
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
});
fileRemove.addEventListener('click', () => {
    selectedFile = null;
    fileInfo.style.display = 'none';
    document.getElementById('uploadArea').style.display = '';
});

function setFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    document.getElementById('uploadArea').style.display = 'none';
    fileInfo.style.display = 'flex';
}

// ── UI helpers ──
function showStatus(msg) { statusText.textContent = msg; statusBar.style.display = 'flex'; }
function hideStatus() { statusBar.style.display = 'none'; }
function showError(msg) { errorText.textContent = msg; errorBox.style.display = 'flex'; }
function hideError() { errorBox.style.display = 'none'; }
errorClose.addEventListener('click', hideError);

// ── Scale zoom ──
zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2.0, zoomLevel + 0.20); drawScore(currentNotes); });
zoomOut.addEventListener('click', () => { zoomLevel = Math.max(0.4, zoomLevel - 0.20); drawScore(currentNotes); });

// ── Helpers ──
function midiToNote(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return names[midi % 12] + Math.floor(midi / 12 - 1);
}

function mapDuration(seconds) {
    if (seconds >= 1.5) return '1';
    if (seconds >= 0.75) return '2';
    if (seconds >= 0.5) return 'qd';
    if (seconds >= 0.35) return 'q';
    if (seconds >= 0.2) return '8';
    return '16';
}

// ── Score rendering ──
function renderNotes(notes) {
    hideError();
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:2.5rem;color:#9ca3af;text-align:center;font-size:1.1rem">🎵 未识别到音符，请尝试其他音频文件</div>';
        scoreSection.style.display = 'block';
        noteCount.textContent = '0 个音符';
        return;
    }
    currentNotes = notes;
    noteCount.textContent = `${notes.length} 个音符`;
    scoreSection.style.display = 'block';
    drawScore(notes);
}

function drawScore(notes) {
    notation.innerHTML = '';
    const containerWidth = Math.max(800, notes.length * 65 + 120);
    const VF = (typeof Vex !== 'undefined' ? Vex.Flow : null);

    if (!VF) {
        renderSimpleSVG(notes, containerWidth);
        return;
    }

    try {
        const renderer = new VF.Renderer(notation, VF.Renderer.Backends.SVG);
        renderer.resize(containerWidth * zoomLevel, 200 * zoomLevel);
        const ctx = renderer.getContext();
        ctx.scale(zoomLevel, zoomLevel);

        const stave = new VF.Stave(20, 50, containerWidth - 40);
        stave.addClef('treble');
        stave.setContext(ctx).draw();

        const voices = notes.map(n => {
            const dur = mapDuration(n.duration || 0.35);
            const note = new VF.StaveNote({ clef: 'treble', keys: [midiToNote(n.midi)], duration: dur });
            const key = midiToNote(n.midi);
            if (key.includes('#')) note.addAccidental(0, new VF.Accidental('#'));
            else if (key.includes('b')) note.addAccidental(0, new VF.Accidental('b'));
            if (dur === 'qd') VF.Dot.buildAndAttach([note]);
            return note;
        });

        VF.Formatter.FormatAndDraw(ctx, stave, voices, { auto_beam: true });
    } catch (e) {
        console.warn('VexFlow error, fallback SVG:', e);
        renderSimpleSVG(notes, containerWidth);
    }
}

function renderSimpleSVG(notes, W) {
    const H = 200, X0 = 40, X1 = W - 30;
    const allMidi = notes.map(n => n.midi || 60);
    const lo = Math.min(...allMidi), hi = Math.max(...allMidi), range = Math.max(hi - lo, 6);
    const spacing = Math.min(60, (X1 - X0) / Math.max(notes.length, 1));

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${W}" height="${H}" fill="#fffef9"/>`;

    for (let i = 0; i < 5; i++) {
        const yy = 25 + i * 20;
        svg += `<line x1="${X0-10}" y1="${yy}" x2="${X1+10}" y2="${yy}" stroke="#c4c4c4" stroke-width="0.8"/>`;
    }

    notes.forEach((n, i) => {
        const x = X0 + i * spacing, y = 20 + ((hi - n.midi) / range) * (H - 60), r = 7;
        svg += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*0.78}" fill="#4f6ef6" stroke="#3345cc" stroke-width="1"/>`;
        svg += `<line x1="${x + (y > 60 ? r : -r)}" y1="${y}" x2="${x + (y > 60 ? r : -r)}" y2="${y + (y > 60 ? -35 : 35)}" stroke="#444" stroke-width="1.2"/>`;
        const label = midiToNote(n.midi).replace(/\d/, '');
        svg += `<text x="${x}" y="${H-10}" text-anchor="middle" font-size="11" fill="#888">${label}</text>`;
    });
    svg += '</svg>';
    notation.innerHTML = svg;
}

// ── API calls (matched to backend routes) ──

async function transcribe() {
    if (!selectedFile) { showError('请先选择音频文件'); return; }
    hideError();
    showStatus('AI 转写中…（音频越大耗时越长，请耐心等待）');

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('instrument', selectedInstrument);
    fd.append('output_format', 'musicxml');
    fd.append('separate_stems', 'false');

    try {
        const res = await fetch(API + '/transcribe', { method: 'POST', body: fd });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: '服务器错误 ' + res.status }));
            throw new Error(err.detail || 'HTTP ' + res.status);
        }
        const data = await res.json();
        sourceInstrument = data.instrument || selectedInstrument;
        hideStatus();
        renderNotes(data.notes || []);
        const full = data.full_note_count || data.note_count;
        if (full) noteCount.textContent = `${data.notes?.length || 0} / ${full} 个音符`;
    } catch (e) {
        hideStatus();
        showError(`转写失败：${e.message}`);
    }
}

async function convertInstrument() {
    if (!currentNotes.length) { showError('请先完成 AI 转写'); return; }
    const target = selectedInstrument;
    showStatus(`转换 ${sourceInstrument} → ${target}…`);

    const fd = new FormData();
    fd.append('source_id', sourceInstrument);
    fd.append('target_id', target);
    fd.append('notes', JSON.stringify(currentNotes));

    try {
        const res = await fetch(API + '/convert', { method: 'POST', body: fd });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'HTTP ' + res.status); }
        const data = await res.json();
        hideStatus();
        renderNotes(data.notes || []);
        sourceInstrument = target;
        if (data.removed_notes) noteCount.textContent += ` (${data.removed_notes} 个超出目标乐器音域已移除)`;
    } catch (e) {
        hideStatus();
        showError(`转换失败：${e.message}`);
    }
}

async function exportMidi() {
    if (!currentNotes.length) { showError('请先完成 AI 转写'); return; }
    showStatus('导出 MIDI 中…');

    const fd = new FormData();
    fd.append('source_id', sourceInstrument);
    fd.append('target_id', sourceInstrument);
    fd.append('notes', JSON.stringify(currentNotes));

    try {
        const res = await fetch(API + '/convert-midi', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        downloadBlob(blob, `scoreflow_${sourceInstrument}_${Date.now()}.mid`);
        hideStatus();
    } catch (e) {
        hideStatus();
        showError(`导出失败：${e.message}`);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Button bindings ──
transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportBtn.addEventListener('click', exportMidi);
