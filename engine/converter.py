"""ScoreConverter - orchestrates cross-instrument conversion."""

from typing import Optional

from .registry import InstrumentRegistry
from .instruments.base import Instrument
from .rules import build_octave_transpose_rule, CONVERSION_PRESETS


class ScoreConverter:
    """Converts musical scores between instruments."""

    def __init__(self):
        self.registry = InstrumentRegistry()

    def convert_note(self, midi_note: int, source_id: str, target_id: str, **kwargs) -> dict:
        """Convert a single MIDI note from source to target instrument."""
        src = self.registry.get(source_id)
        tgt = self.registry.get(target_id)
        if not src or not tgt:
            raise ValueError(f"Unknown instrument: source={source_id}, target={target_id}")

        context = {
            "source": src,
            "target": tgt,
            **kwargs,
        }

        # Get presets for this pair
        preset_rules = CONVERSION_PRESETS.get((source_id, target_id), [])
        # Add default octave transpose rule
        default_rules = [build_octave_transpose_rule()]

        # Sort all rules by priority
        all_rules = sorted(preset_rules + default_rules, key=lambda r: r.priority)

        current_note = midi_note
        results = []
        for rule in all_rules:
            if rule.matches(current_note, context):
                mapping = rule.execute(current_note, context)
                current_note = mapping.converted_midi
                results.append(mapping)

        if not results:
            return {
                "original_midi": midi_note,
                "converted_midi": tgt.range.clamp(midi_note),
            }

        return {
            "original_midi": midi_note,
            "converted_midi": current_note,
            "steps": [r.__dict__ for r in results],
            "note_removed": any(r.note_removed for r in results),
        }

    def convert_notes(self, notes: list[dict], source_id: str, target_id: str) -> list[dict]:
        """Convert multiple notes. Each note dict should have 'midi' key."""
        converted = []
        for note in notes:
            result = self.convert_note(note["midi"], source_id, target_id)
            converted.append({
                **note,
                "midi": result["converted_midi"],
                "original_midi": result["original_midi"],
                "removed": result.get("note_removed", False),
            })
        return converted

    def get_supported_pairs(self) -> list[dict]:
        """List all instrument pairs with compatibility info."""
        all_insts = self.registry.all()
        pairs = []
        for src in all_insts:
            for tgt in all_insts:
                if src.id == tgt.id:
                    continue
                has_preset = (src.id, tgt.id) in CONVERSION_PRESETS
                difficulty = self.registry.difficulty_rating(src.id, tgt.id)
                compatible = self.registry.is_compatible_pair(src.id, tgt.id)
                pairs.append({
                    "source_id": src.id,
                    "source_name": src.name,
                    "target_id": tgt.id,
                    "target_name": tgt.name,
                    "compatible": compatible,
                    "difficulty": difficulty,
                    "has_preset": has_preset,
                })
        return sorted(pairs, key=lambda p: p["difficulty"])
