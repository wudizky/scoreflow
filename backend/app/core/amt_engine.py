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

    def transcribe(self, audio_path: str) -> list[dict]:
        """Transcribe audio to list of note events.

        Returns list of dicts with: midi, start, duration, velocity, confidence.
        """
        if self.basic_pitch_available:
            return self._transcribe_basic_pitch(audio_path)
        elif self.crepe_available:
            return self._transcribe_crepe(audio_path)
        elif self.librosa_available:
            return self._transcribe_librosa(audio_path)
        else:
            return self._transcribe_dummy(audio_path)

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
