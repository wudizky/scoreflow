"""MIDI file utilities."""


def midi_to_frequency(midi_note: int) -> float:
    """Convert MIDI note number to frequency in Hz."""
    return 440.0 * (2 ** ((midi_note - 69) / 12))


def frequency_to_midi(freq: float) -> int:
    """Convert frequency in Hz to nearest MIDI note number."""
    import math
    if freq <= 0:
        return 0
    return int(round(12 * math.log2(freq / 440.0) + 69))


def midi_to_note_name(midi: int) -> str:
    """Convert MIDI note number to name (e.g., 60 -> 'C4')."""
    NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    octave = (midi // 12) - 1
    note = NOTES[midi % 12]
    return f"{note}{octave}"


def note_name_to_midi(name: str) -> int:
    """Convert note name to MIDI number (e.g., 'C4' -> 60)."""
    NOTES = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
             "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
             "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    name = name.strip()
    note_part = name.rstrip("0123456789")
    octave_part = name[len(note_part):]
    if note_part not in NOTES or not octave_part:
        raise ValueError(f"Invalid note name: {name}")
    return NOTES[note_part] + (int(octave_part) + 1) * 12


def create_midi_file(notes: list[dict], output_path: str, tempo: int = 120):
    """Create a simple MIDI file from a list of note events.

    Each note dict: {midi: int, start: float, duration: float, velocity: int (optional)}
    """
    import struct

    def write_var_length(value):
        """Write MIDI variable-length integer."""
        buf = []
        buf.append(value & 0x7F)
        value >>= 7
        while value > 0:
            buf.append(0x80 | (value & 0x7F))
            value >>= 7
        buf.reverse()
        return bytes(buf)

    tick_per_beat = 480
    micro_per_beat = 60_000_000 // tempo

    # Sort notes by start time
    sorted_notes = sorted(notes, key=lambda n: n["start"])

    # Build track events
    track_events = []
    abs_time = 0

    # Tempo event
    track_events.append((0, b"\xff\x51\x03" + struct.pack(">I", micro_per_beat)[1:]))

    for note in sorted_notes:
        midi = note["midi"]
        start_tick = int(note["start"] * tick_per_beat)
        dur_ticks = int(note["duration"] * tick_per_beat)
        velocity = note.get("velocity", 80)

        # Note on
        delta = start_tick - abs_time
        track_events.append((delta, bytes([0x90, midi, velocity])))
        # Note off
        track_events.append((dur_ticks, bytes([0x80, midi, 0])))
        abs_time = start_tick + dur_ticks

    # End of track
    track_events.append((0, b"\xff\x2f\x00"))

    # Build track data
    track_data = b""
    for delta, event in track_events:
        track_data += write_var_length(delta) + event

    track_header = b"MTrk" + struct.pack(">I", len(track_data))

    # MIDI file header
    format_type = 0
    num_tracks = 1
    header = b"MThd" + struct.pack(">I", 6)
    header += struct.pack(">HHH", format_type, num_tracks, tick_per_beat)

    with open(output_path, "wb") as f:
        f.write(header + track_header + track_data)
