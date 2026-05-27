"""Base instrument model and categories."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class InstrumentCategory(str, Enum):
    STRING = "string"          # 弦乐 (guitar, violin, harp)
    PLUCKED = "plucked"        # 拨弦 (guzheng, pipa)
    WIND = "wind"              # 管乐 (suona, dizi)
    KEYBOARD = "keyboard"      # 键盘 (piano)
    PERCUSSION = "percussion"  # 打击乐


@dataclass
class NoteRange:
    """Musical note range in MIDI note numbers (C0=12, C4=60 middle C)."""
    low: int
    high: int

    def contains(self, midi: int) -> bool:
        return self.low <= midi <= self.high

    def clamp(self, midi: int) -> int:
        return max(self.low, min(self.high, midi))


@dataclass
class Instrument:
    """Base instrument definition."""
    id: str
    name: str
    name_zh: str
    category: InstrumentCategory
    range: NoteRange
    midi_program: Optional[int] = None  # General MIDI program number
    transposition: int = 0              # Semitone transposition for written pitch
    tuning: list[int] = field(default_factory=list)  # Open string MIDI notes

    # Difficulty of converting TO this instrument (1-5)
    conversion_difficulty: int = 1

    def is_in_range(self, midi: int) -> bool:
        return self.range.contains(midi)

    def clamp_to_range(self, midi: int) -> int:
        return self.range.clamp(midi)

    def describe(self) -> str:
        return f"{self.name} ({self.name_zh}) [{self.range.low}-{self.range.high}]"
