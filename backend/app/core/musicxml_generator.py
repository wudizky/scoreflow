"""MusicXML generator — supports standard notation AND guitar/ukulele TAB."""

from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"]

# MIDI pitch class → (step_name, alter)
_MIDI_TO_STEP = [
    ("C", 0), ("C", 1), ("D", 0), ("D", 1),
    ("E", 0), ("F", 0), ("F", 1), ("G", 0),
    ("G", 1), ("A", 0), ("A", 1), ("B", 0),
]

# ── Instrument tunings (string 1 = highest pitch, string N = lowest) ──
_TUNINGS = {
    "guitar": {
        "strings": 6,
        "open_midi": [40, 45, 50, 55, 59, 64],   # low→high: E2 A2 D3 G3 B3 E4
        "names": ["E", "A", "D", "G", "B", "E"],
        "octaves": [2, 2, 3, 3, 3, 4],
        "clef_sign": "TAB",
    },
    "ukulele": {
        "strings": 4,
        "open_midi": [55, 60, 64, 69],            # low→high: G4 C4 E4 A4 (re-entrant)
        "names": ["G", "C", "E", "A"],
        "octaves": [4, 4, 4, 4],
        "clef_sign": "TAB",
    },
}

# Instruments that output TAB instead of standard notation
_TAB_INSTRUMENTS = {"guitar", "ukulele"}


def _midi_to_fret(midi: int, open_strings: list[int]) -> tuple[int, int] | None:
    """Map absolute MIDI pitch to (string_number, fret).

    String number is 1-indexed (1 = highest pitch = last in open_strings).
    Prefers frets 0-5 (open position), then 0-12, then 0-19.
    Returns (string, fret) or (1, 0) as safe fallback.
    """
    best = None
    best_score = 999

    for idx, base in enumerate(open_strings):
        # string number: 1 = highest pitch = last element
        string_num = len(open_strings) - idx  # 1-indexed
        fret = midi - base
        if fret < 0:
            continue          # note below open string
        if fret > 19:
            continue          # too high on fretboard

        # Score: prefer open-position (0-5), penalise higher frets
        score = fret + abs(string_num - 3) * 2
        if score < best_score:
            best_score = score
            best = (string_num, fret)

    if best is None:
        # Fallback: clamp to lowest string
        best = (1, max(0, midi - open_strings[-1]))

    return best


class MusicXMLGenerator:
    """Generate MusicXML from note events — standard or TAB."""

    def __init__(self):
        self._tab_mode = False
        self._tuning = None

    def generate(self, notes: list[dict], output_path: str, instrument: str = "piano"):
        """Generate MusicXML file from note events.

        Args:
            notes: List of {midi, start, duration, velocity} dicts.
            output_path: Where to write the .musicxml file.
            instrument: Instrument ID (guitar, ukulele, piano, etc.).
        """
        inst_key = instrument.lower() if instrument else "piano"
        self._tab_mode = inst_key in _TAB_INSTRUMENTS
        self._tuning = _TUNINGS.get(inst_key)
        self._instrument = inst_key

        root = Element("score-partwise", version="4.0")

        # Part list
        part_list = SubElement(root, "part-list")
        score_part = SubElement(part_list, "score-part", id="P1")
        part_name = SubElement(score_part, "part-name")
        part_name.text = instrument.capitalize()

        # Part
        part = SubElement(root, "part", id="P1")

        if not notes:
            self._add_measure(part, 1, [])
        else:
            measure_notes = self._group_into_measures(notes)
            for i, mn in enumerate(measure_notes):
                self._add_measure(part, i + 1, mn)

        xml_str = minidom.parseString(tostring(root)).toprettyxml(indent="  ")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(xml_str)

    # ──────────────────────────────────────
    #  Measure grouping (unchanged)
    # ──────────────────────────────────────

    def _group_into_measures(self, notes: list[dict]) -> list[list[dict]]:
        if not notes:
            return [[]]

        beat_duration = 60.0 / 120
        beats_per_measure = 4
        measure_duration = beats_per_measure * beat_duration

        measures = []
        current_measure = []
        measure_start = 0

        for note in sorted(notes, key=lambda n: n.get("start", 0)):
            start = note.get("start", 0)

            while start >= measure_start + measure_duration:
                if current_measure:
                    measures.append(current_measure)
                    current_measure = []
                else:
                    measures.append([])
                measure_start += measure_duration

            current_measure.append(note)

            if len(current_measure) >= 64:
                measures.append(current_measure)
                current_measure = []

        if current_measure:
            measures.append(current_measure)

        return measures

    # ──────────────────────────────────────
    #  Measure builder — dynamic clef
    # ──────────────────────────────────────

    def _add_measure(self, parent: Element, number: int, notes: list[dict]):
        measure = SubElement(parent, "measure", number=str(number))

        if number == 1:
            self._add_attributes(measure)

        for note in notes:
            self._add_note(measure, note)

    def _add_attributes(self, measure: Element):
        """Write <attributes> with correct clef and staff-details."""
        attrs = SubElement(measure, "attributes")

        divisions = SubElement(attrs, "divisions")
        divisions.text = "1"

        time = SubElement(attrs, "time")
        beats = SubElement(time, "beats"); beats.text = "4"
        beat_type = SubElement(time, "beat-type"); beat_type.text = "4"

        if self._tab_mode and self._tuning:
            # ── TAB clef ──
            clef = SubElement(attrs, "clef")
            sign = SubElement(clef, "sign"); sign.text = "TAB"
            line = SubElement(clef, "line"); line.text = "5"

            # ── Staff details ──
            sd = SubElement(attrs, "staff-details")
            sl = SubElement(sd, "staff-lines"); sl.text = str(self._tuning["strings"])

            # Write <staff-tuning> for each string (high→low, string 1 first)
            open_midi = self._tuning["open_midi"]        # low→high
            names = self._tuning["names"]
            octaves = self._tuning["octaves"]
            num = len(open_midi)
            for i in range(num):
                # MusicXML string order: 1 = highest pitch
                idx = num - 1 - i                       # reverse
                st = SubElement(sd, "staff-tuning", line=str(i + 1))
                step_e = SubElement(st, "tuning-step"); step_e.text = names[idx]
                oct_e = SubElement(st, "tuning-octave"); oct_e.text = str(octaves[idx])
        else:
            # ── Standard treble clef ──
            clef = SubElement(attrs, "clef")
            sign = SubElement(clef, "sign"); sign.text = "G"
            line = SubElement(clef, "line"); line.text = "2"

    # ──────────────────────────────────────
    #  Note builder — pitch + TAB fingerings
    # ──────────────────────────────────────

    def _add_note(self, parent: Element, note_data: dict):
        midi = note_data["midi"]
        duration_quarters = note_data.get("duration", 0.5) / (60.0 / 120)

        note_el = SubElement(parent, "note")

        # ── Pitch (always present — Verovio needs it) ──
        pitch = SubElement(note_el, "pitch")
        pitch_class = midi % 12
        step_name, alter = _MIDI_TO_STEP[pitch_class]
        octave = (midi // 12) - 1

        step_elem = SubElement(pitch, "step"); step_elem.text = step_name
        if alter != 0:
            alter_elem = SubElement(pitch, "alter"); alter_elem.text = str(alter)
        octave_elem = SubElement(pitch, "octave"); octave_elem.text = str(octave)

        # ── Duration ──
        dur = SubElement(note_el, "duration")
        dur.text = str(max(1, int(round(duration_quarters))))

        voice = SubElement(note_el, "voice"); voice.text = "1"

        type_elem = SubElement(note_el, "type")
        type_elem.text = self._midi_to_type(duration_quarters)

        velocity = note_data.get("velocity", 80)
        dyn = SubElement(note_el, "dynamics"); dyn.text = str(velocity)

        # ── TAB fingerings (guitar / ukulele) ──
        if self._tab_mode and self._tuning:
            open_strings = self._tuning["open_midi"]
            result = _midi_to_fret(midi, open_strings)
            if result:
                string_num, fret = result
                notations = SubElement(note_el, "notations")
                technical = SubElement(notations, "technical")
                str_el = SubElement(technical, "string"); str_el.text = str(string_num)
                fret_el = SubElement(technical, "fret"); fret_el.text = str(fret)

    @staticmethod
    def _midi_to_type(quarters: float) -> str:
        if quarters >= 4:
            return "whole"
        elif quarters >= 2:
            return "half"
        elif quarters >= 1:
            return "quarter"
        elif quarters >= 0.5:
            return "eighth"
        elif quarters >= 0.25:
            return "16th"
        else:
            return "32nd"
