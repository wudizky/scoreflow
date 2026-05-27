"""Quick sanity test for the core engine."""

import sys
sys.path.insert(0, "C:/Users/无缺KEN/scoreflow")

from engine.registry import InstrumentRegistry
from engine.converter import ScoreConverter

registry = InstrumentRegistry()
converter = ScoreConverter()

# Test instrument listing
print("=== Supported Instruments ===")
for inst in registry.all():
    print(f"  {inst.describe()}")

print()

# Test conversion pairs
print("=== Conversion Pairs ===")
pairs = converter.get_supported_pairs()
for p in pairs[:5]:
    print(f"  {p['source_name']} → {p['target_name']}: "
          f"diff={p['difficulty']}, preset={p['has_preset']}")

print()

# Test note conversion
print("=== Guitar → Ukulele Note Conversion ===")
guitar_notes = [40, 45, 50, 55, 59, 64]  # E2 A2 D3 G3 B3 E4
for midi in guitar_notes:
    result = converter.convert_note(midi, "guitar", "ukulele")
    print(f"  MIDI {midi} → {result['converted_midi']} "
          f"({'removed' if result.get('note_removed') else 'kept'})")

print()

# Test piano → guzheng
print("=== Piano → Guzheng (Pentatonic Mapping) ===")
piano_notes = [60, 61, 62, 63, 64, 65, 66, 67]  # C4 to G4
for midi in piano_notes:
    result = converter.convert_note(midi, "piano", "guzheng")
    print(f"  MIDI {midi} → {result['converted_midi']} "
          f"({'removed' if result.get('note_removed') else 'kept'})")

print("\n OK - Engine tests passed!")
