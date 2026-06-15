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
        "breaks": "auto",
        "pageWidth": 1200,
        "adjustPageHeight": 1,
        "pageMarginTop": 40,
        "pageMarginBottom": 40,
        "pageMarginLeft": 60,
        "pageMarginRight": 60,
        "spacingLinear": 0.25,
        "spacingNonLinear": 0.6,
        "spacingStaff": 8,
        "spacingSystem": 12,
        "font": "Leipzig",
        "footer": "none",
        "header": "none",
    })
    tk.loadData(musicxml)

    # Debug: verify measure count is reasonable
    measure_count = musicxml.count("<measure number=")
    if measure_count <= 1:
        # Force at least some measure boundaries by setting breaks=auto
        # If still only 1 measure, Verovio can't break — the XML is wrong
        print(f"[notation_renderer] WARNING: only {measure_count} measure(s) in MusicXML — line breaking disabled", flush=True)

    svg = tk.renderToSVG(1)
    svg_h_px = svg.count("height=")
    print(f"[notation_renderer] Rendered SVG: {measure_count} measures, {len(svg)} bytes", flush=True)
    return svg


def render_musicxml_to_pdf(musicxml: str, output_path: str, zoom: float = 1.0) -> None:
    """Render MusicXML to PDF: Verovio SVG → rsvg-convert → PDF."""
    import tempfile, subprocess
    svg_str = render_musicxml_to_svg(musicxml, zoom)
    svg_tmp = tempfile.mktemp(suffix=".svg")
    try:
        with open(svg_tmp, "w", encoding="utf-8") as f:
            f.write(svg_str)
        result = subprocess.run(
            ["rsvg-convert", "-f", "pdf", "-o", output_path, svg_tmp],
            capture_output=True, timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode()[:200])
    finally:
        try: os.unlink(svg_tmp)
        except OSError: pass


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
