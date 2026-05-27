"""Audio source separation module."""

import os
import subprocess
from typing import Optional


class AudioSeparator:
    """Separate mixed audio into instrument stems."""

    def __init__(self, model: str = "htdemucs"):
        self.model = model
        self._check_dependencies()

    def _check_dependencies(self):
        """Check if Demucs or alternatives are available."""
        self.demucs_available = False
        try:
            import demucs
            self.demucs_available = True
        except ImportError:
            pass

        self.ffmpeg_available = False
        try:
            subprocess.run(["ffmpeg", "-version"],
                         capture_output=True, timeout=5)
            self.ffmpeg_available = True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

    def separate(self, audio_path: str, instrument: str, output_dir: str) -> Optional[str]:
        """Separate audio, focusing on instrument stem.

        Returns path to the best matching stem, or None if separation unavailable.
        """
        # Map instrument to stem name
        stem_map = {
            "piano": "piano",
            "guitar": "guitar",
            "violin": "strings",
            "cello": "strings",
            "vocals": "vocals",
            "drums": "drums",
            "bass": "bass",
            "other": "other",
        }
        target_stem = stem_map.get(instrument, "other")

        if self.demucs_available:
            return self._separate_demucs(audio_path, target_stem, output_dir)
        elif self.ffmpeg_available:
            return self._separate_ffmpeg(audio_path, target_stem, output_dir)

        # No separation available - return original
        return None

    def _separate_demucs(self, audio_path: str, target_stem: str, output_dir: str) -> Optional[str]:
        """Use Demucs PyTorch model for separation."""
        try:
            from demucs import separate
            out_dir = os.path.join(output_dir, "separated")
            separate.main([
                "--out", out_dir,
                "--model", self.model,
                audio_path,
            ])
            base = os.path.splitext(os.path.basename(audio_path))[0]
            stem_path = os.path.join(out_dir, self.model, base, f"{target_stem}.wav")
            if os.path.exists(stem_path):
                return stem_path
            # Fallback: try "other" stem
            other_path = os.path.join(out_dir, self.model, base, "other.wav")
            return other_path if os.path.exists(other_path) else None
        except Exception:
            return None

    def _separate_ffmpeg(self, audio_path: str, target_stem: str, output_dir: str) -> Optional[str]:
        """Basic EQ-based separation using ffmpeg (limited, better than nothing)."""
        stem_path = os.path.join(output_dir, f"stem_{target_stem}.wav")
        # Simple high-pass filter for certain instruments
        if target_stem == "vocals":
            cmd = ["ffmpeg", "-i", audio_path, "-af", "highpass=f=200,lowpass=f=3000",
                   stem_path, "-y"]
        else:
            return None

        try:
            subprocess.run(cmd, capture_output=True, timeout=120)
            return stem_path if os.path.exists(stem_path) else None
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return None
