"""TAB generator: MIDI notes → string+fret mapping + chord detection.

Supports any instrument with a defined tuning (list of open-string MIDI numbers).
Optimizes fingering: prefers lower frets on higher-numbered strings.
"""

from typing import Optional

# Common chord templates (intervals from root in semitones)
CHORD_TEMPLATES = {
    (0, 4, 7): "",           # Major
    (0, 3, 7): "m",          # Minor
    (0, 4, 7, 10): "7",     # Dominant 7
    (0, 3, 7, 10): "m7",    # Minor 7
    (0, 4, 7, 11): "M7",    # Major 7
    (0, 4, 8): "aug",       # Augmented
    (0, 3, 6): "dim",       # Diminished
    (0, 5, 7): "sus4",      # Suspended 4
    (0, 2, 7): "sus2",      # Suspended 2
    (0, 4, 7, 9): "6",      # Major 6
    (0, 3, 7, 9): "m6",     # Minor 6
}

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FLAT_NAMES = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'}


def midi_to_name(midi: int, prefer_flats: bool = False) -> str:
    """Convert MIDI number to note name."""
    name = NOTE_NAMES[midi % 12]
    octave = midi // 12 - 1
    if prefer_flats and name in FLAT_NAMES:
        name = FLAT_NAMES[name]
    return f"{name}{octave}"


def midi_to_pitch_class(midi: int) -> str:
    """Return pitch class name (C, C#, D, etc.)."""
    return NOTE_NAMES[midi % 12]


def midi_to_root_name(midi: int) -> str:
    """Beautiful note name without octave (e.g., 'C', 'F#', 'Bb')."""
    name = NOTE_NAMES[midi % 12]
    # Use flats for common keys
    sharp_to_flat = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'}
    return sharp_to_flat.get(name, name)


def detect_chord(midi_pitches: list[int]) -> Optional[str]:
    """Detect chord name from a set of simultaneous MIDI pitches.

    Returns chord name string (e.g., 'Am', 'C7', 'G') or None.
    """
    if len(midi_pitches) < 2:
        return None

    pitches = sorted(set(midi_pitches))
    if len(pitches) < 2:
        return None

    # Try each pitch as root
    best_score = 0
    best_name = None
    for root in pitches[:3]:  # Try first 3 as root candidates
        intervals = tuple(sorted((p - root) % 12 for p in pitches if p != root))
        # Also try with root included (for dyads)
        intervals_with_root = tuple(sorted((p - root) % 12 for p in pitches))
        for intervals_set in [intervals, intervals_with_root]:
            if intervals_set in CHORD_TEMPLATES:
                quality = CHORD_TEMPLATES[intervals_set]
                name = midi_to_root_name(root) + quality
                score = len(intervals_set)
                if len(pitches) >= 3 and quality == "":
                    score += 1  # Favor triads
                if score > best_score:
                    best_score = score
                    best_name = name

    return best_name


class TabNote:
    """A single note placed on the tablature."""
    def __init__(self, string: int, fret: int, start: float, duration: float,
                 midi: int, velocity: int = 80):
        self.string = string     # 1-indexed (1 = highest pitch)
        self.fret = fret
        self.start = start
        self.duration = duration
        self.midi = midi
        self.velocity = velocity

    def to_dict(self) -> dict:
        return {
            "string": self.string,
            "fret": self.fret,
            "start": self.start,
            "duration": self.duration,
            "midi": self.midi,
            "velocity": self.velocity,
        }


class TabGenerator:
    """Generate guitar/ukulele-style tablature from MIDI notes."""

    CHORD_WINDOW = 0.03  # 30ms window for chord grouping

    def __init__(self, tuning: list[int]):
        """
        Args:
            tuning: Open-string MIDI pitches, from highest (string 1) to lowest.
                    Standard guitar: [64, 59, 55, 50, 45, 40]
                    Standard ukulele: [64, 60, 55, 48]
        """
        self.tuning = sorted(tuning, reverse=True)  # Ensure high→low
        self.num_strings = len(tuning)

    def find_best_string(self, midi: int, exclude_strings: set = None) -> Optional[tuple[int, int]]:
        """Find the best (string, fret) for a MIDI pitch.

        Prefers: lower frets on higher-pitched strings for playability.
        Returns (string_number, fret) or None if out of range.
        """
        exclude = exclude_strings or set()
        best = None
        best_score = 9999

        for string_idx, open_midi in enumerate(self.tuning):
            string_num = self.num_strings - string_idx  # 1-indexed, 1=highest
            if string_num in exclude:
                continue
            fret = midi - open_midi
            if fret < 0:
                continue  # Note below open string
            if fret > 19:
                continue  # Too high on fretboard

            # Score: prefer 2nd-3rd strings for melody, middle frets
            score = fret * 2 + abs(string_num - self.num_strings // 2) * 3
            if score < best_score:
                best_score = score
                best = (string_num, fret)

        return best

    def generate_tab(self, notes: list[dict]) -> list[dict]:
        """Convert MIDI note events to tablature positions.

        Args:
            notes: List of dicts with {midi, start, duration, velocity}

        Returns:
            List of tab note dicts with {string, fret, start, duration, midi, velocity}
        """
        tab_notes = []

        # Sort by start time
        sorted_notes = sorted(notes, key=lambda n: n.get("start", 0))

        # Track which strings are occupied at each time for chord handling
        used_strings: set = set()
        prev_start = -1

        for note in sorted_notes:
            midi = note.get("midi", 60)
            start = note.get("start", 0)
            duration = note.get("duration", 0.5)
            velocity = note.get("velocity", 80)

            # If this is a new chord group (gap > CHORD_WINDOW), reset string usage
            if start - prev_start > self.CHORD_WINDOW:
                used_strings = set()

            # Find best string, avoiding already-used strings in current chord
            result = self.find_best_string(midi, used_strings if len(used_strings) < self.num_strings else None)
            if result is None:
                # Out of range — try to clamp to nearest playable note
                clamped_midi = max(self.tuning[-1], min(midi, self.tuning[0] + 19))
                result = self.find_best_string(clamped_midi)

            if result:
                string_num, fret = result
                used_strings.add(string_num)
                tab_notes.append(TabNote(
                    string=string_num,
                    fret=fret,
                    start=start,
                    duration=duration,
                    midi=midi,
                    velocity=velocity,
                ).to_dict())

            prev_start = start

        return tab_notes

    def generate_tab_with_chords(self, notes: list[dict]) -> dict:
        """Generate TAB positions AND chord annotations.

        Returns:
            Dict with {tab_notes, chords, num_strings, tuning}
        """
        tab_notes = self.generate_tab(notes)

        # Group notes by chord window and detect chords
        chords = []
        current_chord_group = []
        current_chord_start = -1

        for tab_note in tab_notes:
            start = tab_note["start"]
            if current_chord_start < 0:
                current_chord_start = start
                current_chord_group = [tab_note]
            elif start - current_chord_start <= self.CHORD_WINDOW:
                current_chord_group.append(tab_note)
            else:
                # Previous chord group ended — detect chord
                pitches = [n["midi"] for n in current_chord_group]
                chord_name = detect_chord(pitches)
                if chord_name and len(pitches) >= 2:
                    chords.append({
                        "name": chord_name,
                        "start": current_chord_start,
                        "pitches": sorted(set(pitches)),
                    })
                current_chord_group = [tab_note]
                current_chord_start = start

        # Last group
        if len(current_chord_group) >= 2:
            pitches = [n["midi"] for n in current_chord_group]
            chord_name = detect_chord(pitches)
            if chord_name:
                chords.append({
                    "name": chord_name,
                    "start": current_chord_start,
                    "pitches": sorted(set(pitches)),
                })

        # Build fretboard matrix: for each note time, map string→fret
        fretboard = []
        for note in tab_notes:
            fretboard.append({
                "string": note["string"],
                "fret": note["fret"],
                "start": note["start"],
                "duration": note["duration"],
                "midi": note["midi"],
            })

        return {
            "tab_notes": tab_notes,
            "chords": chords,
            "num_strings": self.num_strings,
            "tuning": list(reversed(self.tuning)),  # low→high for display
            "tuning_names": [midi_to_root_name(m) for m in reversed(self.tuning)],
            "fretboard": fretboard,
        }
