// ScoreFlow — Frontend Logic (inline SVG, no CDN dependency)
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

// ── Instrument selector ──
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

// ── Zoom (re-render with new scale) ──
zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2.0, +(zoomLevel + 0.20).toFixed(1)); drawScore(currentNotes); });
zoomOut.addEventListener('click', () => { zoomLevel = Math.max(0.4, +(zoomLevel - 0.20).toFixed(1)); drawScore(currentNotes); });

// ── Helpers ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToPitch(midi) { return NOTE_NAMES[midi % 12]; }
function midiToOctave(midi) { return Math.floor(midi / 12) - 1; }
function midiToNote(midi) { return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1); }

function mapDuration(sec) {
    if (sec >= 1.5) return { code: 'w', label: '𝅝', w: 28 };
    if (sec >= 0.75) return { code: 'h', label: '𝅗𝅥', w: 22 };
    if (sec >= 0.40) return { code: 'q', label: '𝅘𝅥', w: 16 };
    if (sec >= 0.20) return { code: '8', label: '𝅘𝅥𝅮', w: 14 };
    return { code: '16', label: '𝅘𝅥𝅯', w: 12 };
}

// ── Score rendering ──
function renderNotes(notes) {
    hideError();
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:2.5rem;color:#9ca3af;text-align:center;font-size:1.1rem">🎵 未识别到音符，请尝试其他音频</div>';
        scoreSection.style.display = 'block';
        noteCount.textContent = '0 个音符';
        return;
    }
    currentNotes = notes;
    noteCount.textContent = notes.length + ' 个音符';
    scoreSection.style.display = 'block';
    drawScore(notes);
}

function drawScore(notes) {
    const W = Math.max(600, notes.length * zoomLevel * 72 + 100);
    const H = 280;
    const PAD = 50;
    const STAFF_TOP = 30;
    const LINE_SPACING = 16;
    const CLEF_WIDTH = 40;
    const staveLeft = PAD + CLEF_WIDTH + 30;

    // Staff lines (treble clef area)
    let html = '';
    for (let line = 0; line < 5; line++) {
        const y = STAFF_TOP + line * LINE_SPACING;
        html += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#bbb" stroke-width="0.8"/>`;
    }

    // Treble clef symbol
    html += `<text x="${PAD}" y="${STAFF_TOP + 4 * LINE_SPACING + 4}" font-size="60" fill="#555">𝄞</text>`;

    // Note range for vertical mapping
    const allMidi = notes.map(n => n.midi || 60);
    const lo = Math.min(60, ...allMidi) - 3;   // extend to C4 at minimum
    const hi = Math.max(72, ...allMidi) + 3;   // extend to C6 at minimum
    const range = Math.max(hi - lo, 10);
    const noteSpacing = Math.max(18, (W - staveLeft - PAD) / Math.max(notes.length, 1));
    // scale note spacing with zoom
    const xSpace = noteSpacing * zoomLevel;

    // Whitenote line positions for standard staff (C4=midi60 maps to "middle C")
    // On treble clef: E4 (64)=bottom line, F5 (77)=top line
    // We use absolute positioning: midi → vertical offset from staff top
    function midiY(m) {
        // E4=64 is bottom line of treble clef (STAFF_TOP + 4*LINE_SPACING)
        // each MIDI step = half a space (LINE_SPACING/2) downward
        const e4y = STAFF_TOP + 4 * LINE_SPACING;
        return e4y - (m - 64) * (LINE_SPACING / 2);
    }

    // Draw ledger lines for extreme notes
    const midiSet = new Set();
    notes.forEach(n => {
        const m = n.midi;
        const y = midiY(m);
        // Ledger lines needed for notes below E4 or above F5
        if (m < 64) {
            const startLine = 64;
            for (let lm = startLine - 2; lm >= m; lm -= 2) {
                const marker = 'ledger_' + lm;
                if (!midiSet.has(marker)) {
                    midiSet.add(marker);
                    const ly = midiY(lm);
                    html += `<line x1="${PAD - 10}" y1="${ly}" x2="${PAD + 12}" y2="${ly}" stroke="#999" stroke-width="1"/>`;
                }
            }
        }
        if (m > 77) {
            for (let lm = 79; lm <= m; lm += 2) {
                const marker = 'ledger_' + lm;
                if (!midiSet.has(marker)) {
                    midiSet.add(marker);
                    const ly = midiY(lm);
                    html += `<line x1="${PAD - 10}" y1="${ly}" x2="${PAD + 12}" y2="${ly}" stroke="#999" stroke-width="1"/>`;
                }
            }
        }
    });

    // Draw notes
    let cx = staveLeft + 20;
    notes.forEach((n, i) => {
        const m = n.midi;
        const dur = mapDuration(n.duration || 0.35);
        const y = midiY(m);
        const r = 7 * zoomLevel;

        // Note head
        html += `<ellipse cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r}" ry="${(r * 0.72).toFixed(1)}" fill="#4f6ef6" stroke="#3040cc" stroke-width="${(1.2 * zoomLevel).toFixed(1)}"/>`;

        // Stem
        if (y > STAFF_TOP + 2 * LINE_SPACING) {
            html += `<line x1="${(cx + r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + r).toFixed(1)}" y2="${(y - 38 * zoomLevel).toFixed(1)}" stroke="#444" stroke-width="${(1.5 * zoomLevel).toFixed(1)}"/>`;
        } else {
            html += `<line x1="${(cx - r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx - r).toFixed(1)}" y2="${(y + 38 * zoomLevel).toFixed(1)}" stroke="#444" stroke-width="${(1.5 * zoomLevel).toFixed(1)}"/>`;
        }

        // Accidental
        const pitchClass = midiToPitch(m);
        if (pitchClass.includes('#')) {
            html += `<text x="${(cx - r * 2.2).toFixed(1)}" y="${(y + 6 * zoomLevel).toFixed(1)}" font-size="${(20 * zoomLevel).toFixed(1)}" fill="#d97706">♯</text>`;
        } else if (pitchClass.includes('b')) {
            html += `<text x="${(cx - r * 2.2).toFixed(1)}" y="${(y + 6 * zoomLevel).toFixed(1)}" font-size="${(20 * zoomLevel).toFixed(1)}" fill="#d97706">♭</text>`;
        }

        // Pitch label below
        const label = midiToNote(m);
        html += `<text x="${cx.toFixed(1)}" y="${(H - 16).toFixed(1)}" text-anchor="middle" font-size="${(12 * zoomLevel).toFixed(0)}" fill="#888">${label}</text>`;

        cx += xSpace;
    });

    // Bar lines every 4 notes
    const barInterval = xSpace * 4;
    if (notes.length > 4) {
        for (let i = 4; i < notes.length; i += 4) {
            const bx = staveLeft + 20 + i * xSpace - xSpace / 2;
            html += `<line x1="${bx.toFixed(1)}" y1="${STAFF_TOP}" y2="${STAFF_TOP + 4 * LINE_SPACING}" stroke="#555" stroke-width="1.5"/>`;
        }
    }
    // Final barline
    const finalX = staveLeft + 20 + notes.length * xSpace;
    html += `<line x1="${finalX.toFixed(1)}" y1="${STAFF_TOP}" y2="${STAFF_TOP + 4 * LINE_SPACING}" stroke="#333" stroke-width="2"/>`;
    html += `<line x1="${(finalX + 6).toFixed(1)}" y1="${STAFF_TOP}" y2="${STAFF_TOP + 4 * LINE_SPACING}" stroke="#999" stroke-width="1.5"/>`;

    // Build SVG
    notation.innerHTML = `<svg width="${W.toFixed(0)}" height="${H}" viewBox="0 0 ${W.toFixed(0)} ${H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${W}" height="${H}" fill="#fffef9"/>
        ${html}
    </svg>`;

    // Scroll to see full score
    scoreScroll.scrollLeft = 0;
}

// ── API calls ──

async function transcribe() {
    if (!selectedFile) { showError('请先选择音频文件'); return; }
    hideError();
    showStatus('AI 转写中… 音频越长耗时越久，请耐心等待');

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
        zoomLevel = 1;
        hideStatus();
        renderNotes(data.notes || []);
        const shown = data.notes?.length || 0;
        const full = data.full_note_count || data.note_count || shown;
        if (shown < full) noteCount.textContent = shown + ' / ' + full + ' 个音符';
    } catch (e) {
        hideStatus();
        showError('转写失败：' + e.message);
        console.error(e);
    }
}

async function convertInstrument() {
    if (!currentNotes.length) { showError('请先完成 AI 转写'); return; }
    const target = selectedInstrument;
    showStatus('转换 ' + sourceInstrument + ' → ' + target + '…');

    const fd = new FormData();
    fd.append('source_id', sourceInstrument);
    fd.append('target_id', target);
    fd.append('notes', JSON.stringify(currentNotes));

    try {
        const res = await fetch(API + '/convert', { method: 'POST', body: fd });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'HTTP ' + res.status); }
        const data = await res.json();
        zoomLevel = 1;
        hideStatus();
        renderNotes(data.notes || []);
        sourceInstrument = target;
        if (data.removed_notes) noteCount.textContent += ' · ' + data.removed_notes + ' 个超音域移除';
    } catch (e) {
        hideStatus();
        showError('转换失败：' + e.message);
        console.error(e);
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
        downloadBlob(await res.blob(), 'scoreflow_' + sourceInstrument + '_' + Date.now() + '.mid');
        hideStatus();
    } catch (e) {
        hideStatus();
        showError('导出失败：' + e.message);
        console.error(e);
    }
}

function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
}

// ── Events ──
transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportBtn.addEventListener('click', exportMidi);
