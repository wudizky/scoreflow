"""MusicXML generator from note events."""

from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"]

# MIDI pitch class → (step_name, alter)
# C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
_MIDI_TO_STEP = [
    ("C", 0), ("C", 1), ("D", 0), ("D", 1),
    ("E", 0), ("F", 0), ("F", 1), ("G", 0),
    ("G", 1), ("A", 0), ("A", 1), ("B", 0),
]


class MusicXMLGenerator:
    """Generate MusicXML from note event data."""

    def generate(self, notes: list[dict], output_path: str, instrument: str = "piano"):
        """Generate MusicXML file from note events."""
        root = Element("score-partwise", version="4.0")

        # Part list
        part_list = SubElement(root, "part-list")
        score_part = SubElement(part_list, "score-part", id="P1")
        part_name = SubElement(score_part, "part-name")
        part_name.text = instrument.capitalize()

        # Part
        part = SubElement(root, "part", id="P1")

        if not notes:
            # Empty measure
            self._add_measure(part, 1, [])
        else:
            # Group notes into measures by time signature
            measure_notes = self._group_into_measures(notes)
            for i, mn in enumerate(measure_notes):
                self._add_measure(part, i + 1, mn)

        xml_str = minidom.parseString(tostring(root)).toprettyxml(indent="  ")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(xml_str)

    def _group_into_measures(self, notes: list[dict]) -> list[list[dict]]:
        """Group notes into measures (assuming 4/4, quarter=120).

        Handles gaps in the music — creates explicit empty measures
        for silence, and enforces a max-note density per measure so
        Verovio has enough measure boundaries to break lines.
        """
        if not notes:
            return [[]]

        beat_duration = 60.0 / 120     # quarter = 0.5s
        beats_per_measure = 4
        measure_duration = beats_per_measure * beat_duration  # 2.0s

        measures = []
        current_measure = []
        measure_start = 0

        for note in sorted(notes, key=lambda n: n.get("start", 0)):
            start = note.get("start", 0)

            # ── Handle gaps: advance to the correct measure ──
            while start >= measure_start + measure_duration:
                if current_measure:
                    measures.append(current_measure)
                    current_measure = []
                else:
                    # Explicit empty measure marker for silence
                    measures.append([])
                measure_start += measure_duration

            current_measure.append(note)

            # ── Force break: if current measure gets too dense, split it ──
            # (Verovio needs measure boundaries to line-break)
            if len(current_measure) >= 64:
                measures.append(current_measure)
                current_measure = []
                # Don't advance measure_start — keep same time window

        if current_measure:
            measures.append(current_measure)

        return measures

    def _add_measure(self, parent: Element, number: int, notes: list[dict]):
        """Add a measure element to the part."""
        measure = SubElement(parent, "measure", number=str(number))

        # Attributes (first measure only)
        if number == 1:
            attributes = SubElement(measure, "attributes")
            divisions = SubElement(attributes, "divisions")
            divisions.text = "1"

            time = SubElement(attributes, "time")
            beats = SubElement(time, "beats")
            beats.text = "4"
            beat_type = SubElement(time, "beat-type")
            beat_type.text = "4"

            clef = SubElement(attributes, "clef")
            sign = SubElement(clef, "sign")
            sign.text = "G"
            line = SubElement(clef, "line")
            line.text = "2"

        # Note events
        for note in notes:
            self._add_note(measure, note)

    def _add_note(self, parent: Element, note_data: dict):
        """Add a single note to the measure with correct MusicXML step/alter."""
        midi = note_data["midi"]
        duration_quarters = note_data.get("duration", 0.5) / (60.0 / 120)

        note = SubElement(parent, "note")

        pitch = SubElement(note, "pitch")

        # Correct MIDI → step/alter lookup (MusicXML standard)
        pitch_class = midi % 12
        step_name, alter = _MIDI_TO_STEP[pitch_class]
        octave = (midi // 12) - 1

        step_elem = SubElement(pitch, "step")
        step_elem.text = step_name

        if alter != 0:
            alter_elem = SubElement(pitch, "alter")
            alter_elem.text = str(alter)

        octave_elem = SubElement(pitch, "octave")
        octave_elem.text = str(octave)

        duration = SubElement(note, "duration")
        duration.text = str(max(1, int(round(duration_quarters))))

        voice = SubElement(note, "voice")
        voice.text = "1"

        type_elem = SubElement(note, "type")
        type_elem.text = self._midi_to_type(duration_quarters)

        velocity = note_data.get("velocity", 80)
        dynamics = SubElement(note, "dynamics")
        dynamics.text = str(velocity)

    def _midi_to_type(self, quarters: float) -> str:
        """Map quarter-note duration to MusicXML note type."""
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
