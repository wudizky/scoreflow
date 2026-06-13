"""ScoreFlow API router."""

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, Response

from engine.registry import InstrumentRegistry
from engine.converter import ScoreConverter
from engine.notation import NotationType
from engine.notation.tab_generator import TabGenerator
from engine.notation.grand_staff import generate_grand_staff

router = APIRouter()
registry = InstrumentRegistry()
converter = ScoreConverter()

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_AUDIO = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# ── Notation type mapping per instrument ──
NOTATION_MAP = {
    "guitar": NotationType.TAB,
    "ukulele": NotationType.TAB,
    "piano": NotationType.GRAND_STAFF,
    "harp": NotationType.GRAND_STAFF,
    "violin": NotationType.TREBLE_CLEF,
    "guzheng": NotationType.TREBLE_CLEF,
    "suona": NotationType.TREBLE_CLEF,
}


def build_notation_data(notes: list[dict], instrument_id: str) -> dict:
    """Build instrument-appropriate notation rendering data from MIDI notes."""
    notation_type = NOTATION_MAP.get(instrument_id, NotationType.TREBLE_CLEF)
    notation_data = {"type": notation_type.value}

    inst = registry.get(instrument_id)
    tuning = inst.tuning if inst else []

    if notation_type == NotationType.TAB and tuning:
        gen = TabGenerator(tuning)
        tab = gen.generate_tab_with_chords(notes)
        notation_data.update(tab)

    elif notation_type == NotationType.GRAND_STAFF:
        gs = generate_grand_staff(notes)
        notation_data.update(gs)

    else:
        notation_data["notes"] = notes

    return notation_data


def _generate_musicxml_string(notes: list[dict], instrument: str) -> str:
    """Generate MusicXML string from notes (for frontend OSMD rendering)."""
    from app.core.musicxml_generator import MusicXMLGenerator
    import tempfile
    gen = MusicXMLGenerator()
    tmp_path = os.path.join(tempfile.gettempdir(), f"tmp_{uuid.uuid4().hex[:8]}.musicxml")
    gen.generate(notes, tmp_path, instrument=instrument)
    with open(tmp_path, "r", encoding="utf-8") as f:
        xml_str = f.read()
    try:
        os.remove(tmp_path)
    except OSError:
        pass
    return xml_str


@router.get("/instruments")
async def list_instruments():
    """List all supported instruments."""
    return {"instruments": [
        {
            "id": inst.id,
            "name": inst.name,
            "name_zh": inst.name_zh,
            "category": inst.category.value,
            "range_low": inst.range.low,
            "range_high": inst.range.high,
            "midi_program": inst.midi_program,
            "notation_type": NOTATION_MAP.get(inst.id, NotationType.TREBLE_CLEF).value,
        }
        for inst in registry.all()
    ]}


@router.get("/conversion-pairs")
async def list_conversion_pairs():
    """List all instrument conversion pairs with difficulty ratings."""
    return {"pairs": converter.get_supported_pairs()}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    instrument: str = Form("piano"),
    separate_stems: bool = Form(False),
    output_format: str = Form("musicxml"),
):
    """Upload audio and transcribe to sheet music."""
    ext = os.path.splitext(file.filename or "audio.wav")[1].lower()
    if ext not in ALLOWED_AUDIO:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {ext}. Allowed: {ALLOWED_AUDIO}",
        )

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / safe_name

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    with open(file_path, "wb") as f:
        f.write(content)

    from app.core import TranscriptionService
    service = TranscriptionService()
    try:
        result = service.transcribe(
            audio_path=str(file_path),
            instrument=instrument,
            separate_stems=separate_stems,
            output_format=output_format,
        )
        notes = result.get("notes", [])
        result["notation"] = build_notation_data(notes, instrument)
        musicxml = result.get("musicxml")
        if not musicxml:
            musicxml = _generate_musicxml_string(notes, instrument)
        result["musicxml"] = musicxml
        # Server-side SVG render via Verovio (professional engraving)
        try:
            from app.core.notation_renderer import render_musicxml_to_svg
            result["svg"] = render_musicxml_to_svg(musicxml)
        except Exception as e:
            result["svg_error"] = str(e)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert")
async def convert_score(
    source_id: str = Form(...),
    target_id: str = Form(...),
    notes: str = Form(...),
):
    """Convert transcribed notes between instruments."""
    import json
    try:
        note_data = json.loads(notes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid notes JSON")

    src = registry.get(source_id)
    tgt = registry.get(target_id)
    if not src:
        raise HTTPException(status_code=404, detail=f"Unknown source: {source_id}")
    if not tgt:
        raise HTTPException(status_code=404, detail=f"Unknown target: {target_id}")

    converted = converter.convert_notes(note_data, source_id, target_id)
    active_notes = [n for n in converted if not n.get("removed")]
    notation = build_notation_data(active_notes, target_id)
    musicxml = _generate_musicxml_string(active_notes, target_id)
    svg = None
    try:
        from app.core.notation_renderer import render_musicxml_to_svg
        svg = render_musicxml_to_svg(musicxml)
    except Exception:
        pass
    return {
        "source_id": source_id,
        "target_id": target_id,
        "note_count": len(converted),
        "notes": active_notes,
        "removed_notes": sum(1 for n in converted if n.get("removed")),
        "notation": notation,
        "musicxml": musicxml,
        "svg": svg,
    }


@router.post("/convert-midi")
async def convert_and_export_midi(
    source_id: str = Form(...),
    target_id: str = Form(...),
    notes: str = Form(...),
):
    """Convert notes and export as MIDI file."""
    import json
    try:
        note_data = json.loads(notes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid notes JSON")

    converted = converter.convert_notes(note_data, source_id, target_id)
    active_notes = [n for n in converted if not n.get("removed")]

    output_path = UPLOAD_DIR / f"converted_{uuid.uuid4().hex[:8]}.mid"
    from engine.converters.midi_utils import create_midi_file
    create_midi_file(active_notes, str(output_path))

    return FileResponse(
        str(output_path),
        media_type="audio/midi",
        filename=f"{source_id}_to_{target_id}.mid",
    )


@router.post("/audio-to-converted")
async def transcribe_and_convert(
    file: UploadFile = File(...),
    source_instrument: str = Form(...),
    target_instrument: str = Form(...),
):
    """End-to-end: upload audio → transcribe → convert → return MIDI."""
    ext = os.path.splitext(file.filename or "audio.wav")[1].lower()
    if ext not in ALLOWED_AUDIO:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{ext}"
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    from app.core import TranscriptionService
    service = TranscriptionService()
    transcript = service.transcribe(
        audio_path=str(file_path),
        instrument=source_instrument,
        output_format="midi",
    )

    if transcript["status"] == "error":
        raise HTTPException(status_code=500, detail=transcript.get("error"))

    notes = transcript.get("notes", [])
    converted = converter.convert_notes(notes, source_instrument, target_instrument)
    active_notes = [n for n in converted if not n.get("removed")]

    output_path = UPLOAD_DIR / f"end2end_{uuid.uuid4().hex[:8]}.mid"
    from engine.converters.midi_utils import create_midi_file
    create_midi_file(active_notes, str(output_path))

    return FileResponse(
        str(output_path),
        media_type="audio/midi",
        filename=f"{source_instrument}_to_{target_instrument}.mid",
    )


@router.get("/transcribe-musicxml/{file_id}")
async def get_musicxml(file_id: str):
    """Get raw MusicXML for a previously transcribed file."""
    # Look for .musicxml file in output directory
    output_dir = Path(__file__).parent.parent / "output"
    for ext in [".musicxml", ".xml"]:
        candidate = output_dir / f"{file_id}{ext}"
        if candidate.exists():
            content = candidate.read_text(encoding="utf-8")
            return Response(content=content, media_type="application/vnd.recordare.musicxml+xml")
    raise HTTPException(status_code=404, detail="MusicXML not found")
