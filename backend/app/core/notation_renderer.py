"""Server-side music notation rendering: MusicXML → SVG via Verovio.

Generates professional SVG sheet music that the frontend can display
directly — no client-side rendering library needed.
"""

import verovio
import os


def render_musicxml_to_svg(musicxml: str, zoom: float = 1.0) -> str:
    """Render MusicXML string to SVG using Verovio engraver.

    Args:
        musicxml: Valid MusicXML string.
        zoom: Scale factor (0.5-2.0).

    Returns:
        SVG string ready for direct HTML injection.
    """
    tk = verovio.toolkit()
    tk.setOptions({
        "scale": int(zoom * 40),
        "adjustPageWidth": True,
        "adjustPageHeight": True,
        "breaks": "none",
        "spacingLinear": 0.25,
        "spacingNonLinear": 0.6,
        "font": "Leipzig",
        "footer": "none",
        "header": "none",
    })
    tk.loadData(musicxml)
    svg = tk.renderToSVG(1)
    return svg


def render_notes_to_svg(notes: list[dict], instrument: str, zoom: float = 1.0) -> str | None:
    """Generate MusicXML from notes and render to SVG.

    Returns SVG string or None if generation fails.
    """
    from app.core.musicxml_generator import MusicXMLGenerator
    import tempfile, uuid

    gen = MusicXMLGenerator()
    tmp_path = os.path.join(tempfile.gettempdir(), f"render_{uuid.uuid4().hex[:8]}.musicxml")
    try:
        gen.generate(notes, tmp_path, instrument=instrument)
        with open(tmp_path, "r", encoding="utf-8") as f:
            musicxml = f.read()
        os.remove(tmp_path)
        return render_musicxml_to_svg(musicxml, zoom)
    except Exception as e:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise e
