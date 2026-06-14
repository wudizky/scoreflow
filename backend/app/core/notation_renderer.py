"""Server-side music notation rendering: MusicXML → SVG via Verovio.

Generates professional SVG sheet music that the frontend can display
directly — no client-side rendering library needed.
"""

import verovio
import os


def render_musicxml_to_svg(musicxml: str, zoom: float = 1.0) -> str:
    """Render MusicXML string to SVG using Verovio engraver.

    Uses auto line-breaking like a word processor — notes wrap to
    the next system when they hit the page width, creating a
    waterfall-style readable score.
    """
    tk = verovio.toolkit()
    tk.setOptions({
        "scale": int(zoom * 55),
        # ── Layout: auto line-breaking ──
        "breaks": "auto",
        "ignoreLayout": 1,
        "pageWidth": 1200,           # 网页容器友好宽度
        "adjustPageHeight": 1,       # 自适应高度，不写死！
        "pageMarginTop": 40,
        "pageMarginBottom": 40,
        "pageMarginLeft": 60,
        "pageMarginRight": 60,
        # ── Spacing ──
        "spacingLinear": 0.25,
        "spacingNonLinear": 0.6,
        "spacingStaff": 8,
        "spacingSystem": 12,
        # ── Style ──
        "font": "Leipzig",
        "footer": "none",
        "header": "none",
    })
    tk.loadData(musicxml)
    svg = tk.renderToSVG(1)
    return svg


def render_notes_to_svg(notes: list[dict], instrument: str, zoom: float = 1.0) -> str | None:
    """Generate MusicXML from notes and render to SVG."""
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
