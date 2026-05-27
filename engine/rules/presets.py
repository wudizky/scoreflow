"""Instrument-specific conversion rules and presets."""

from .base import ConversionRule, ConversionStrategy, PitchMapping


def build_guitar_to_ukulele_rules() -> list[ConversionRule]:
    """Guitar → Ukulele: drop D-G-B-E strings, keep top 4, capo 5th fret equivalent."""
    def apply(note: int, ctx: dict) -> PitchMapping:
        # Guitar: E2 A2 D3 G3 B3 E4 (MIDI 40,45,50,55,59,64)
        # Ukulele: G4 C4 E4 A4 (high g, MIDI 67,60,64,69)
        # Shift up 5 semitones then drop 2 lowest strings
        shifted = note + 5  # Capo 5th fret
        return PitchMapping(
            original_midi=note,
            converted_midi=shifted,
            octave_shifted=False,
        )

    return [
        ConversionRule(
            name="guitar_to_ukulele_transpose",
            strategy=ConversionStrategy.TRANSPOSE,
            priority=10,
            apply=apply,
        ),
        ConversionRule(
            name="guitar_to_ukulele_range",
            strategy=ConversionStrategy.ADAPTIVE,
            priority=20,
            condition=lambda n, ctx: n < 55,  # Below G3
            apply=lambda n, ctx: PitchMapping(
                original_midi=n,
                converted_midi=ctx["target"].range.clamp(n + 24),
                octave_shifted=True,
            ),
        ),
    ]


def build_piano_to_guzheng_rules() -> list[ConversionRule]:
    """Piano → Guzheng: D pentatonic scale mapping."""
    # Guzheng is pentatonic (D-E-F#-A-B). Non-pentatonic notes must be mapped.
    PENTATONIC = {62, 64, 66, 69, 71}  # D4, E4, F#4, A4, B4
    PENTATONIC_MAP = {}
    for i in range(48, 97):  # C3 to C7
        mod = i % 12
        if mod in {2, 4, 6, 9, 11}:  # D, E, F#, A, B
            PENTATONIC_MAP[i] = i
        else:
            # Map to nearest pentatonic note
            candidates = [n for n in range(48, 97) if n % 12 in {2, 4, 6, 9, 11}]
            PENTATONIC_MAP[i] = min(candidates, key=lambda x: abs(x - i))

    def apply(note: int, ctx: dict) -> PitchMapping:
        original = note
        mapped = PENTATONIC_MAP.get(original, original)
        clamped = ctx["target"].range.clamp(mapped)
        return PitchMapping(
            original_midi=original,
            converted_midi=clamped,
            note_removed=(clamped != mapped),
        )

    return [
        ConversionRule(
            name="piano_to_guzheng_pentatonic",
            strategy=ConversionStrategy.ADAPTIVE,
            priority=10,
            apply=apply,
        ),
    ]


def build_piano_to_suona_rules() -> list[ConversionRule]:
    """Piano → Suona: single melody line (suona can't do chords)."""
    def apply(note: int, ctx: dict) -> PitchMapping:
        # Keep highest note only (melody), remove chords
        return PitchMapping(
            original_midi=note,
            converted_midi=ctx["target"].range.clamp(note),
        )

    return [
        ConversionRule(
            name="piano_to_suona_monophonic",
            strategy=ConversionStrategy.SIMPLIFY,
            priority=10,
            apply=apply,
        ),
    ]


# Preset mapping: (source_id, target_id) -> rule builder
CONVERSION_PRESETS: dict[tuple[str, str], list[ConversionRule]] = {
    ("guitar", "ukulele"): build_guitar_to_ukulele_rules(),
    ("ukulele", "guitar"): [],  # Reverse - default rules handle it
    ("piano", "guzheng"): build_piano_to_guzheng_rules(),
    ("piano", "suona"): build_piano_to_suona_rules(),
}
