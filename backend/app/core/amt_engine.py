"""Automatic Music Transcription (AMT) engine."""

import os
import tempfile
from typing import Optional


class AMTEngine:
    """Convert audio to discrete note events using ML models."""

    def __init__(self):
        self._check_available()

    def _check_available(self):
        """Check which ML models are available."""
        self.basic_pitch_available = False
        try:
            import basic_pitch
            self.basic_pitch_available = True
        except ImportError:
            pass

        self.crepe_available = False
        try:
            import crepe
            self.crepe_available = True
        except ImportError:
            pass

        self.librosa_available = False
        try:
            import librosa
            self.librosa_available = True
        except ImportError:
            pass

    def transcribe(self, audio_path: str, separate_stems: bool = False, instrument: str = "guitar") -> list[dict]:
        """Transcribe audio to list of note events.

        Args:
            audio_path: Path to audio file.
            separate_stems: If True, run Demucs source separation before AMT
                           (removes drums/vocals → cleaner pitch detection).
            instrument: Target instrument for stem selection.

        Returns list of dicts with: midi, start, duration, velocity, confidence.
        """
        processing_path = audio_path

        # ── Step 0: Demucs source separation (optional, improves accuracy) ──
        if separate_stems:
            separated = self._separate_stems(audio_path, instrument)
            if separated:
                processing_path = separated

        # ── Step 1: AMT ──
        if self.basic_pitch_available:
            raw_notes = self._transcribe_basic_pitch(processing_path)
        elif self.crepe_available:
            raw_notes = self._transcribe_crepe(processing_path)
        elif self.librosa_available:
            raw_notes = self._transcribe_librosa(processing_path)
        else:
            raw_notes = self._transcribe_dummy(processing_path)

        # ── Step 2: MIDI quantization (cleans up ghost notes & timing jitter) ──
        if raw_notes:
            raw_notes = self._quantize_notes(raw_notes)

        return raw_notes

    def _separate_stems(self, audio_path: str, instrument: str) -> Optional[str]:
        """Run Demucs source separation, return path to best stem.

        Runs in subprocess to avoid OOM killing the main server.
        Falls back gracefully: if Demucs fails or is too slow,
        transcription continues on the original audio.
        """
        import subprocess, tempfile, pathlib

        out_dir = tempfile.mkdtemp(prefix="demucs_")
        try:
            # Use subprocess to isolate memory — if it OOMs, only the child dies
            result = subprocess.run(
                [
                    "python3", "-m", "demucs",
                    "--out", out_dir,
                    "--two-stems", "drums",
                    audio_path,
                ],
                capture_output=True,
                timeout=120,                     # 2 min max for separation
            )

            base = os.path.splitext(os.path.basename(audio_path))[0]
            # Search for no_drums stem (2-stem) or other/model output
            for pattern in [f"**/{base}/no_drums.wav", f"**/htdemucs/{base}/no_drums.wav", "**/*.wav"]:
                candidates = list(pathlib.Path(out_dir).rglob(pattern))
                if candidates:
                    return str(candidates[0])

        except FileNotFoundError:
            # demucs CLI not installed
            pass
        except subprocess.TimeoutExpired:
            # Too slow — skip separation
            pass
        except Exception:
            pass

        # Cleanup temp dir on failure
        try:
            import shutil
            shutil.rmtree(out_dir, ignore_errors=True)
        except Exception:
            pass

        return None

    def _quantize_notes(self, notes: list[dict], grid_16th: float = 0.125) -> list[dict]:
        """Quantize note onsets to nearest 16th-note grid and filter noise.

        This eliminates AI jitter (like 1/64 note fragments) and ghost notes
        that are too short or too quiet.
        """
        if not notes:
            return []

        import numpy as np

        # ── Filter 1: Remove extremely short notes (< 40ms = noise) ──
        min_dur = 0.04
        notes = [n for n in notes if n.get("duration", 0) >= min_dur]

        # ── Filter 2: Remove very quiet notes (velocity < 15) ──
        notes = [n for n in notes if n.get("velocity", 80) >= 15]

        # ── Filter 3: Remove low-confidence notes (< 0.2) ──
        notes = [n for n in notes if n.get("confidence", 1.0) >= 0.2]

        # ── Quantize onsets to 16th note grid ──
        for n in notes:
            start = n.get("start", 0)
            # Snap to nearest 16th note
            quantized = round(start / grid_16th) * grid_16th
            n["start"] = round(quantized, 3)
            # Also snap duration
            dur = n.get("duration", grid_16th)
            quantized_dur = max(grid_16th, round(dur / grid_16th) * grid_16th)
            n["duration"] = round(quantized_dur, 3)

        # ── Filter 4: Merge duplicate notes at same onset + pitch ──
        notes.sort(key=lambda n: (n["start"], n.get("midi", 60)))
        deduped = []
        for n in notes:
            if deduped and abs(deduped[-1]["start"] - n["start"]) < 0.02 and deduped[-1]["midi"] == n["midi"]:
                # Keep the one with higher velocity/confidence
                if n.get("velocity", 0) > deduped[-1].get("velocity", 0):
                    deduped[-1] = n
                continue
            deduped.append(n)

        return deduped

    def _transcribe_basic_pitch(self, audio_path: str) -> list[dict]:
        """Use Spotify's Basic Pitch for AMT."""
        import pathlib
        import basic_pitch.inference
        import basic_pitch.note_creation
        import numpy as np

        model_dir = pathlib.Path(basic_pitch.__path__[0]) / "saved_models" / "icassp_2022"
        model_path = model_dir / "nmp.onnx"
        if not model_path.exists():
            model_path = model_dir / "nmp"

        # Lower thresholds for guitar/fingerstyle polyphonic detection
        # Defaults: onset=0.5, frame=0.3 — too high for soft fingerstyle notes
        model_output, midi_data, note_events = basic_pitch.inference.predict(
            audio_path,
            model_or_model_path=model_path,
            onset_threshold=0.3,       # default 0.5 — catch softer attacks
            frame_threshold=0.15,       # default 0.3 — keep quieter sustained notes
            minimum_note_length=58,    # default 127.7ms — allow shorter notes
            minimum_frequency=55,       # A1 — guitar low E is ~82Hz
            maximum_frequency=1500,     # ~F#6 — above that is harmonics
        )

        notes = []
        for note in note_events:
            # note = (start_time, end_time, pitch, amplitude, pitch_bends)
            start_time, end_time, pitch, amplitude = note[0], note[1], note[2], note[3]
            notes.append({
                "midi": int(pitch),
                "start": float(start_time),
                "duration": float(end_time - start_time),
                "velocity": int(min(127, amplitude * 127)),
                "confidence": float(min(1.0, amplitude)),
            })
        return notes

    def _transcribe_crepe(self, audio_path: str) -> list[dict]:
        """Use CREPE for pitch detection (monophonic)."""
        import crepe
        import librosa
        import numpy as np

        audio, sr = librosa.load(audio_path, sr=16000)
        time, frequency, confidence, _ = crepe.predict(audio, sr, viterbi=True)

        # Convert frequency contours to note events
        notes = []
        min_confidence = 0.5
        min_note_duration = 0.05  # 50ms

        active_note = None
        for i in range(len(time)):
            if confidence[i] < min_confidence or frequency[i] <= 0:
                if active_note:
                    duration = time[i] - active_note["start"]
                    if duration >= min_note_duration:
                        notes.append(active_note)
                    active_note = None
                continue

            midi = int(round(12 * np.log2(frequency[i] / 440.0) + 69))
            if active_note is None:
                active_note = {
                    "midi": midi,
                    "start": time[i],
                    "duration": 0,
                    "velocity": 80,
                    "confidence": float(confidence[i]),
                }
            elif abs(midi - active_note["midi"]) > 1:
                duration = time[i] - active_note["start"]
                if duration >= min_note_duration:
                    notes.append(active_note)
                active_note = {
                    "midi": midi,
                    "start": time[i],
                    "duration": 0,
                    "velocity": 80,
                    "confidence": float(confidence[i]),
                }

        if active_note:
            notes.append(active_note)

        # Merge consecutive same-pitch notes
        return self._merge_notes(notes)

    def _transcribe_librosa(self, audio_path: str) -> list[dict]:
        """Use librosa for basic pitch tracking (fallback)."""
        import librosa
        import numpy as np

        audio, sr = librosa.load(audio_path, sr=22050)

        # Use CQT for pitch detection
        cqt = np.abs(librosa.cqt(audio, sr=sr, fmin=librosa.note_to_hz("C2"),
                                  n_bins=84, bins_per_octave=12))
        freqs = librosa.cqt_frequencies(84, fmin=librosa.note_to_hz("C2"))
        midi_notes = librosa.hz_to_midi(freqs)

        # Simple onset detection
        onset_frames = librosa.onset.onset_detect(y=audio, sr=sr, backtrack=True)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)

        notes = []
        for i, onset in enumerate(onset_times[:-1]):
            # Find strongest pitch at each onset
            frame = int(onset * sr / 512)  # hop_length assumption
            if frame >= cqt.shape[1]:
                break
            spectrum = cqt[:, frame]
            peak_idx = np.argmax(spectrum)
            if spectrum[peak_idx] > 0.1 * np.max(cqt):
                notes.append({
                    "midi": int(round(midi_notes[peak_idx])),
                    "start": onset,
                    "duration": onset_times[i + 1] - onset,
                    "velocity": 80,
                    "confidence": float(spectrum[peak_idx] / np.max(cqt)),
                })

        return notes

    def _transcribe_dummy(self, audio_path: str) -> list[dict]:
        """Generate demo notes when no ML model is installed."""
        _ = audio_path  # Not used
        import time
        # Generate a simple scale for demo purposes
        notes = []
        start_times = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
        midi_notes = [60, 62, 64, 65, 67, 69, 71, 72]  # C major scale
        for start, midi in zip(start_times, midi_notes):
            notes.append({
                "midi": midi,
                "start": start,
                "duration": 0.45,
                "velocity": 80,
                "confidence": 0.9,
            })
        return notes

    def _merge_notes(self, notes: list[dict]) -> list[dict]:
        """Merge consecutive notes with same pitch."""
        if not notes:
            return []

        merged = [notes[0]]
        for note in notes[1:]:
            if (note["midi"] == merged[-1]["midi"]
                    and note["start"] - (merged[-1]["start"] + merged[-1]["duration"]) < 0.05):
                merged[-1]["duration"] = note["start"] + note["duration"] - merged[-1]["start"]
                merged[-1]["confidence"] = max(merged[-1]["confidence"], note["confidence"])
            else:
                merged.append(note)
        return merged
