// ScoreFlow — Frontend Logic
const API = '/api/v1';
let selectedFile = null, selectedInstrument = 'guitar';
let currentNotes = [], zoomLevel = 1;

// ── DOM refs ──
const $ = id => document.getElementById(id);
const uploadArea = $('uploadArea'), fileInput = $('fileInput'), fileInfo = $('fileInfo');
const fileName = $('fileName'), fileRemove = $('fileRemove'), uploadSection = $('uploadSection');
const transcribeBtn = $('transcribeBtn'), convertBtn = $('convertBtn');
const exportMidiBtn = $('exportMidiBtn'), exportXmlBtn = $('exportXmlBtn');
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
    uploadArea.style.display = '';
});

function setFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
}

// ── Helpers ──
function showStatus(msg) { statusText.textContent = msg; statusBar.style.display = 'flex'; }
function hideStatus() { statusBar.style.display = 'none'; }
function showError(msg) { errorText.textContent = msg; errorBox.style.display = 'flex'; }
function hideError() { errorBox.style.display = 'none'; }
errorClose.addEventListener('click', hideError);

// ── Render notes with VexFlow ──
function renderNotes(notes) {
    hideError();
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:2rem;color:#9ca3af;text-align:center">🎵 未识别到音符，请尝试其他音频</div>';
        scoreSection.style.display = 'block';
        return;
    }

    currentNotes = notes;
    noteCount.textContent = `${notes.length} 个音符`;
    scoreSection.style.display = 'block';
    drawScore(notes);
}

function drawScore(notes) {
    notation.innerHTML = '';
    const containerWidth = Math.max(800, notes.length * 60 + 120);
    const staveWidth = containerWidth - 40;

    const VF = typeof Vex !== 'undefined' ? Vex.Flow : window.Vex && window.Vex.Flow;

    if (!VF) {
        // Fallback: simple SVG rendering
        renderSimpleSVG(notes, containerWidth);
        return;
    }

    try {
        const renderer = new VF.Renderer(notation, VF.Renderer.Backends.SVG);
        renderer.resize(containerWidth * zoomLevel, 200 * zoomLevel);

        const ctx = renderer.getContext();
        ctx.scale(zoomLevel, zoomLevel);

        const stave = new VF.Stave(20, 40, staveWidth);
        stave.addClef('treble').addTimeSignature('4/4');
        stave.setContext(ctx).draw();

        // Group notes — one stave per line, 8 bars max
        const voices = [];
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const midi = note.midi || 60;
            const dur = note.duration ? mapDuration(note.duration) : 'q';
            const keys = [midiToNote(midi)];

            const staveNote = new VF.StaveNote({
                clef: 'treble', keys: keys, duration: dur
            });

            // Accidental if needed
            const noteName = midiToNote(midi);
            if (noteName.includes('#')) {
                staveNote.addAccidental(0, new VF.Accidental('#'));
            } else if (noteName.includes('b')) {
                staveNote.addAccidental(0, new VF.Accidental('b'));
            }

            // Add dot for dotted notes
            if (dur === 'qd') {
                VF.Dot.buildAndAttach([staveNote]);
            }

            voices.push(staveNote);
        }

        // Beam notes in groups of 4
        for (let i = 0; i < voices.length; i += 4) {
            const group = voices.slice(i, Math.min(i + 4, voices.length));
            if (group.length > 1) {
                try {
                    const beams = VF.Beam.generateBeams(group, { beam_rests: false });
                    beams.forEach(b => b.setContext(ctx).draw());
                } catch(e) {
                    // beaming may fail with mixed durations — that's OK
                }
            }
        }

        // Draw all voices
        VF.Formatter.FormatAndDraw(ctx, stave, voices, {
            auto_beam: false,
            align_rests: true
        });

    } catch(e) {
        console.warn('VexFlow render error, using fallback:', e);
        renderSimpleSVG(notes, containerWidth);
    }
}

function renderSimpleSVG(notes, width) {
    const h = 200;
    const notePositions = [];
    const midiMin = Math.min(...notes.map(n => n.midi || 60));
    const midiMax = Math.max(...notes.map(n => n.midi || 72));
    const midiRange = Math.max(midiMax - midiMin, 6);

    let x = 40;
    const xSpacing = Math.min(60, (width - 80) / Math.max(notes.length, 1));

    notes.forEach((n, i) => {
        const midi = n.midi || 60;
        const y = 20 + ((midiMax - midi) / midiRange) * (h - 60);
        notePositions.push({ x: x + 6, y, midi, dur: n.duration || 0.5 });
        x += xSpacing;
    });

    let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${h}" fill="#fffef9"/>`;

    // Staff lines
    for (let i = 0; i < 5; i++) {
        const ly = 25 + i * 20;
        svg += `<line x1="20" y1="${ly}" x2="${width - 20}" y2="${ly}" stroke="#ccc" stroke-width="0.8"/>`;
    }

    // Notes
    notePositions.forEach(({x, y, midi, dur}) => {
        const r = 7;
        svg += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="#4f6ef6" stroke="#3b54d4" stroke-width="1.2"/>`;
        // Stem
        if (y > 65) {
            svg += `<line x1="${x + r}" y1="${y}" x2="${x + r}" y2="${y - 35}" stroke="#333" stroke-width="1.5"/>`;
        } else {
            svg += `<line x1="${x - r}" y1="${y}" x2="${x - r}" y2="${y + 35}" stroke="#333" stroke-width="1.5"/>`;
        }
        // Note name label
        const label = midiToNote(midi).replace(/\d/, '');
        svg += `<text x="${x}" y="${h - 12}" text-anchor="middle" font-size="11" fill="#6b7280">${label}</text>`;
    });

    svg += '</svg>';
    notation.innerHTML = svg;
}

function midiToNote(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const name = names[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return name + '/' + octave;
}

function mapDuration(seconds) {
    if (seconds >= 1.5) return '1';    // whole
    if (seconds >= 0.75) return '2';   // half
    if (seconds >= 0.5) return 'qd';   // dotted quarter
    if (seconds >= 0.35) return 'q';   // quarter
    if (seconds >= 0.2) return '8';    // eighth
    return '16';                        // sixteenth
}

// ── Zoom ──
zoomIn.addEventListener('click', () => { zoomLevel = Math.min(2, zoomLevel + 0.2); drawScore(currentNotes); });
zoomOut.addEventListener('click', () => { zoomLevel = Math.max(0.4, zoomLevel - 0.2); drawScore(currentNotes); });

// ── API Calls ──
async function transcribe() {
    if (!selectedFile) {
        showError('请先选择音频文件');
        return;
    }
    hideError();
    showStatus('正在 AI 转写…（可能需要 10-30 秒）');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('instrument', selectedInstrument);

    try {
        const res = await fetch(`${API}/transcribe`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
            throw new Error(err.detail || `服务器错误 ${res.status}`);
        }
        const data = await res.json();
        hideStatus();
        renderNotes(data.notes || []);
    } catch(e) {
        hideStatus();
        showError(`转写失败: ${e.message}`);
    }
}

async function convertInstrument() {
    if (!currentNotes.length) {
        showError('请先完成 AI 转写');
        return;
    }
    const target = selectedInstrument;
    showStatus(`正在转换到 ${target}…`);

    try {
        const res = await fetch(`${API}/convert-notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: currentNotes, target_instrument: target })
        });
        if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
        const data = await res.json();
        hideStatus();
        renderNotes(data.notes || []);
    } catch(e) {
        hideStatus();
        showError(`转换失败: ${e.message}`);
    }
}

async function exportFile(format) {
    if (!currentNotes.length) {
        showError('请先完成 AI 转写');
        return;
    }
    showStatus(`正在导出 ${format.toUpperCase()}…`);

    try {
        const res = await fetch(`${API}/export-${format}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: currentNotes, instrument: selectedInstrument })
        });
        if (!res.ok) throw new Error(`导出失败: HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `scoreflow_${Date.now()}.${format}`; a.click();
        URL.revokeObjectURL(url);
        hideStatus();
    } catch(e) {
        hideStatus();
        showError(`导出失败: ${e.message}`);
    }
}

// ── Event bindings ──
transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportMidiBtn.addEventListener('click', () => exportFile('midi'));
exportXmlBtn.addEventListener('click', () => exportFile('musicxml'));
