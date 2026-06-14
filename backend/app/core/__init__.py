"""Core transcription service - audio to MIDI/MusicXML pipeline."""

import os
import tempfile
from typing import Optional
from .audio_separator import AudioSeparator
from .amt_engine import AMTEngine
from .musicxml_generator import MusicXMLGenerator


class TranscriptionService:
    """Orchestrates audio separation → AMT → MusicXML pipeline."""

    def __init__(self, output_dir: str = None):
        self.separator = AudioSeparator()
        self.amt = AMTEngine()
        self.mxml_gen = MusicXMLGenerator()
        self.output_dir = output_dir or os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "backend", "output"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    def transcribe(
        self,
        audio_path: str,
        instrument: str = "piano",
        separate_stems: bool = False,
        output_format: str = "musicxml",
    ) -> dict:
        """Full pipeline: transcribe audio to sheet music.

        Args:
            audio_path: Path to input audio file.
            instrument: Target instrument for transcription focus.
            separate_stems: Whether to run source separation first.
            output_format: "musicxml" or "midi".

        Returns:
            Dict with transcription results and output paths.
        """
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        result = {
            "input": audio_path,
            "instrument": instrument,
            "status": "processing",
        }

        # Step 1: Audio separation (if requested)
        processing_path = audio_path
        if separate_stems:
            try:
                stem_path = self.separator.separate(
                    audio_path, instrument, self.output_dir
                )
                if stem_path:
                    processing_path = stem_path
                    result["separated_stem"] = stem_path
            except Exception as e:
                result["separation_warning"] = str(e)

        # Step 2: AMT - convert audio to notes
        try:
            notes = self.amt.transcribe(processing_path,
                                        separate_stems=separate_stems,
                                        instrument=instrument)
            result["note_count"] = len(notes)
            result["notes"] = notes[:500]  # Limit payload size
            result["full_note_count"] = len(notes)
        except Exception as e:
            result["status"] = "error"
            result["error"] = f"AMT failed: {str(e)}"
            return result

        # Step 3: Generate output
        if output_format == "midi":
            midi_path = os.path.join(self.output_dir, f"{base_name}.mid")
            self._save_midi(notes, midi_path)
            result["midi_path"] = midi_path
            result["output_path"] = midi_path
        else:
            mxml_path = os.path.join(self.output_dir, f"{base_name}.musicxml")
            pdf_path = os.path.join(self.output_dir, f"{base_name}.pdf")
            self.mxml_gen.generate(notes, mxml_path, instrument=instrument)
            self._generate_pdf(mxml_path, pdf_path)
            result["musicxml_path"] = mxml_path
            result["pdf_path"] = pdf_path
            result["output_path"] = mxml_path

        result["status"] = "completed"
        return result

    def _save_midi(self, notes: list[dict], output_path: str):
        """Save notes as MIDI file."""
        from ...engine.converters.midi_utils import create_midi_file
        create_midi_file(
            notes,
            output_path,
            tempo=notes[0].get("tempo", 120) if notes else 120,
        )

    def _generate_pdf(self, musicxml_path: str, pdf_path: str):
        """Generate PDF from MusicXML (requires lilypond or muse score CLI)."""
        # Try lilypond first
        try:
            import subprocess
            subprocess.run(
                ["lilypond", "--pdf", "-o", os.path.splitext(pdf_path)[0], musicxml_path],
                capture_output=True, timeout=30,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            # Fallback: we'll generate PDF via xelatex later
            pass
