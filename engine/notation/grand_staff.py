"""Grand staff generator: split notes between treble and bass clef for piano."""


def generate_grand_staff(notes: list[dict], split_midi: int = 60) -> dict:
    """Split notes into treble (≥split_midi) and bass (<split_midi) clefs.

    Args:
        notes: List of {midi, start, duration, velocity} dicts
        split_midi: MIDI boundary (default 60 = C4 = middle C)

    Returns:
        Dict with {treble_notes, bass_notes, has_both_clefs}
    """
    treble = []
    bass = []

    for n in notes:
        midi = n.get("midi", 60)
        if midi >= split_midi:
            treble.append(n)
        else:
            bass.append(n)

    return {
        "treble_notes": treble,
        "bass_notes": bass,
        "has_both_clefs": len(treble) > 0 and len(bass) > 0,
        "split_midi": split_midi,
    }
