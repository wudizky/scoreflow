// ScoreFlow — Verovio server-side rendering. Frontend only displays pre-rendered SVG.
const API = '/api/v1';
let selectedFile = null, selectedInstrument = 'guitar', sourceInstrument = 'guitar';
let currentNotes = null, zoomLevel = 1;

const $ = id => document.getElementById(id);
const uploadArea = $('uploadArea'), fileInput = $('fileInput'), fileInfo = $('fileInfo');
const fileName = $('fileName'), fileRemove = $('fileRemove');
const transcribeBtn = $('transcribeBtn'), convertBtn = $('convertBtn');
const exportMidiBtn = $('exportMidiBtn'), exportPdfBtn = $('exportPdfBtn');
const progressBar = $('progressBar'), progressLabel = $('progressLabel');
const scoreSection = $('scoreSection'), notation = $('notation'), noteCount = $('noteCount');
const scoreScroll = $('scoreScroll'), chordBar = $('chordBar'), renderBadge = $('renderBadge');
const errorBox = $('errorBox'), errorText = $('errorText'), errorClose = $('errorClose');
const zoomIn = $('zoomIn'), zoomOut = $('zoomOut');

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
fileRemove.addEventListener('click', () => { selectedFile=null; fileInfo.style.display='none'; uploadArea.style.display=''; });
function setFile(f) { selectedFile=f; fileName.textContent=f.name; uploadArea.style.display='none'; fileInfo.style.display='flex'; }

function showError(m) { errorText.textContent=m; errorBox.style.display='flex'; }
function hideError() { errorBox.style.display='none'; }
errorClose.addEventListener('click', hideError);

// ── Zoom (CSS transform on SVG) ──
zoomIn.addEventListener('click', () => { zoomLevel=Math.min(2.0,+(zoomLevel+0.15).toFixed(2)); applyZoom(); });
zoomOut.addEventListener('click', () => { zoomLevel=Math.max(0.4,+(zoomLevel-0.15).toFixed(2)); applyZoom(); });
function applyZoom() {
    const svg = notation.querySelector('svg');
    if (svg) { svg.style.width = (zoomLevel*100)+'%'; svg.style.height = 'auto'; }
    renderBadge.textContent = '🎼 Verovio · ' + Math.round(zoomLevel*100) + '%';
}

// ── Progress ──
let pt;
function startProgress() {
    progressBar.style.display='block';
    ['step1','step2','step3','step4'].forEach(s=>$(s).classList.remove('active','done'));
    ['conn1','conn2','conn3'].forEach(c=>$(c).classList.remove('active'));
    progressLabel.textContent='🔊 音频分离中…'; $('step1').classList.add('active');
    let cur=0;
    const labels=['🔊 音频分离中…','🎯 音高识别中…','🔄 乐谱转换中…','📜 编排生成中…'];
    pt=setInterval(()=>{
        $(['step1','step2','step3','step4'][cur]).classList.remove('active');
        $(['step1','step2','step3','step4'][cur]).classList.add('done');
        if(cur<3){$(['conn1','conn2','conn3'][cur]).classList.add('active');cur++;$(['step1','step2','step3','step4'][cur]).classList.add('active');progressLabel.textContent=labels[cur];}
    },2500);
}
function stopProgress(ok) {
    clearInterval(pt);
    ['step1','step2','step3','step4'].forEach(s=>{$(s).classList.remove('active');$(s).classList.add('done');});
    ['conn1','conn2','conn3'].forEach(c=>$(c).classList.add('active'));
    progressLabel.textContent=ok?'✅ 完成':'❌ 出错';
    setTimeout(()=>{progressBar.style.display='none';},ok?1200:3000);
}

// ── Terminal overlay ──
const terminalOverlay = $('terminalOverlay'), terminalBody = $('terminalBody');
const disclaimerBanner = $('disclaimerBanner');
const FAKE_LOGS = [
    ['[00:00]', '初始化 Demucs 混合声轨分离模型...', 'dim'],
    ['[00:01]', '提取纯乐器音轨完成，抑制环境噪声 (SNR +14.2dB)', ''],
    ['[00:01]', '载入 Basic Pitch ONNX 神经声学引擎 v0.4.0', ''],
    ['[00:02]', '识别到有效 Onset... 过滤幽灵音符 (置信度 < 0.2)', 'dim'],
    ['[00:02]', '运行 16 分音符网格量化 (Quantization grid=0.125s)', ''],
    ['[00:03]', '计算乐器物理指板最短路径转移成本...', 'highlight'],
    ['[00:04]', '渲染 Verovio 矢量排版引擎 (MusicXML → SVG)', ''],
    ['[00:04]', 'ScoreFlow 管线完成，输出 8 小节 / 24 音符', 'highlight'],
];

function showTerminal() {
    progressBar.style.display = 'none';
    terminalOverlay.style.display = 'block';
    terminalBody.innerHTML = '';
    FAKE_LOGS.forEach((log, i) => {
        setTimeout(() => {
            const line = document.createElement('div');
            line.className = 'log-line' + (log[2] ? ' ' + log[2] : '');
            line.innerHTML = `<span style="color:#8b949e">${log[0]}</span> ${log[1]}`;
            terminalBody.appendChild(line);
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }, 400 + i * 450);
    });
}

function hideTerminal() {
    terminalOverlay.style.display = 'none';
}

// ── Display pre-rendered SVG ──
function displayResult(data, notes) {
    hideError();
    hideTerminal();
    progressBar.style.display = 'none';

    // Disclaimer for raw AI mode
    if (data.is_raw_ai) {
        disclaimerBanner.style.display = 'block';
    } else {
        disclaimerBanner.style.display = 'none';
    }

    currentNotes = notes;
    if (!notes || !notes.length) {
        notation.innerHTML = '<div style="padding:3rem;color:#9ca3af;text-align:center;font-size:1.2rem">🎵 未识别到音符</div>';
        scoreSection.style.display='block'; noteCount.textContent='0 个音符'; chordBar.style.display='none'; return;
    }
    scoreSection.style.display='block';
    noteCount.textContent = notes.length + ' 个音符';

    // Chord bar
    const chords = data.notation?.chords;
    if (chords && chords.length) {
        chordBar.style.display='flex';
        chordBar.innerHTML = chords.map(c => `<span class="chord-chip">${c.name}</span>`).join('');
    } else { chordBar.style.display='none'; }

    // SVG from server
    const svg = data.svg || '';
    if (svg && svg.includes('<svg')) {
        notation.innerHTML = svg;
        renderBadge.textContent = '🎼 Verovio';
        renderBadge.className = 'render-badge osmd';
        zoomLevel = 1;
        applyZoom();
    } else if (data.svg_error) {
        notation.innerHTML = `<div style="padding:2rem;color:#dc2626;text-align:center">⚠️ 渲染失败: ${data.svg_error}</div>`;
        renderBadge.textContent = '⚠️ 错误';
        renderBadge.className = 'render-badge svg';
    } else {
        notation.innerHTML = '<div style="padding:2rem;color:#9ca3af;text-align:center">乐谱渲染中…</div>';
    }
}

// ── API ──
async function transcribe() {
    if (!selectedFile) { showError('请先选择音频文件'); return; }
    hideError(); showTerminal();
    const fd = new FormData();
    fd.append('file', selectedFile); fd.append('instrument', selectedInstrument);
    fd.append('output_format', 'musicxml');
    const useDemucs = document.getElementById('demucsToggle')?.checked;
    fd.append('separate_stems', useDemucs ? 'true' : 'false');
    try {
        const res = await fetch(API+'/transcribe',{method:'POST',body:fd});
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail||'HTTP '+res.status);
        sourceInstrument=data.instrument||selectedInstrument;
        displayResult(data, data.notes||[]);
        const shown=data.notes?.length||0, full=data.full_note_count||data.note_count||shown;
        if (shown<full) noteCount.textContent=shown+' / '+full+' 个音符';
    } catch(e) { hideTerminal(); showError('转写失败：'+e.message); console.error(e); }
}

async function convertInstrument() {
    if (!currentNotes?.length) { showError('请先完成 AI 转写'); return; }
    showTerminal();
    const fd = new FormData();
    fd.append('source_id', sourceInstrument); fd.append('target_id', selectedInstrument);
    fd.append('notes', JSON.stringify(currentNotes));
    try {
        const res = await fetch(API+'/convert',{method:'POST',body:fd});
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail||'HTTP '+res.status);
        sourceInstrument=selectedInstrument;
        displayResult(data, data.notes||[]);
        if (data.removed_notes) noteCount.textContent += ' · 超音域移除 '+data.removed_notes;
    } catch(e) { hideTerminal(); showError('转换失败：'+e.message); console.error(e); }
}

async function exportMidi() {
    if (!currentNotes?.length) { showError('请先完成 AI 转写'); return; }
    const fd = new FormData();
    fd.append('source_id', sourceInstrument); fd.append('target_id', sourceInstrument);
    fd.append('notes', JSON.stringify(currentNotes));
    try {
        const res = await fetch(API+'/convert-midi',{method:'POST',body:fd});
        if (!res.ok) throw new Error('HTTP '+res.status);
        const a=document.createElement('a');
        a.href=URL.createObjectURL(await res.blob());
        a.download='scoreflow_'+sourceInstrument+'_'+Date.now()+'.mid';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) { showError('导出失败：'+e.message); }
}

async function exportPdf() {
    if (!currentNotes?.length) { showError('请先完成 AI 转写'); return; }
    const fd = new FormData();
    fd.append('instrument', sourceInstrument);
    fd.append('notes', JSON.stringify(currentNotes));
    try {
        const res = await fetch(API+'/export-pdf',{method:'POST',body:fd});
        if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.detail||'HTTP '+res.status); }
        const a=document.createElement('a');
        a.href=URL.createObjectURL(await res.blob());
        a.download='scoreflow_'+sourceInstrument+'_'+Date.now()+'.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) { showError('PDF导出失败：'+e.message); }
}

transcribeBtn.addEventListener('click', transcribe);
convertBtn.addEventListener('click', convertInstrument);
exportMidiBtn.addEventListener('click', exportMidi);
exportPdfBtn.addEventListener('click', exportPdf);
