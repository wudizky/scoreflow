"""Conversion rule base classes and utilities."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Callable
from ..instruments.base import Instrument, NoteRange


class ConversionStrategy(str, Enum):
    TRANSPOSE = "transpose"               # Simple pitch transposition
    ADAPTIVE = "adaptive"                 # Range-aware adaptive transposition
    ORNAMENT = "ornament"                 # Add/remove ornaments
    SIMPLIFY = "simplify"                 # Simplify chords/voicing
    REPLACE = "replace"                   # Replace with instrument-specific technique
    HARMONIZE = "harmonize"               # Add harmony suitable for target


@dataclass
class PitchMapping:
    """Result of a pitch conversion."""
    original_midi: int
    converted_midi: int
    octave_shifted: bool = False
    ornament_added: bool = False
    note_removed: bool = False


@dataclass
class ConversionRule:
    """A single conversion rule."""
    name: str
    strategy: ConversionStrategy
    priority: int = 100  # Lower runs first
    condition: Optional[Callable] = None
    apply: Optional[Callable] = None

    def matches(self, midi_note: int, context: dict) -> bool:
        if self.condition is None:
            return True
        try:
            return self.condition(midi_note, context)
        except Exception:
            return False

    def execute(self, midi_note: int, context: dict) -> PitchMapping:
        if self.apply is None:
            return PitchMapping(original_midi=midi_note, converted_midi=midi_note)
        try:
            return self.apply(midi_note, context)
        except Exception:
            return PitchMapping(original_midi=midi_note, converted_midi=midi_note)


@dataclass
class ConversionContext:
    """Context for a conversion operation."""
    source: Instrument
    target: Instrument
    source_range: NoteRange
    target_range: NoteRange
    tempo: int = 120
    key_signature: str = "C"
    metadata: dict = field(default_factory=dict)


def build_octave_transpose_rule() -> ConversionRule:
    """Create a rule that transposes notes within target range."""
    def apply(note: int, ctx: dict) -> PitchMapping:
        src = ctx["source"]
        tgt = ctx["target"]
        transposition = (src.midi_program or 0) - (tgt.midi_program or 0) if src.midi_program and tgt.midi_program else 0
        transposition = transposition // 8 * 12  # Approximate octave shift

        shifted = note + transposition
        if shifted < tgt.range.low:
            shifted += 12
        elif shifted > tgt.range.high:
            shifted -= 12

        shifted = tgt.range.clamp(shifted)
        return PitchMapping(
            original_midi=note,
            converted_midi=shifted,
            octave_shifted=(shifted != note + transposition),
        )

    return ConversionRule(
        name="octave_transpose",
        strategy=ConversionStrategy.ADAPTIVE,
        priority=10,
        apply=apply,
    )
