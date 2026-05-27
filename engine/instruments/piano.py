from .base import Instrument, InstrumentCategory, NoteRange


class Piano(Instrument):
    """Standard 88-key piano."""
    def __init__(self):
        super().__init__(
            id="piano",
            name="Piano",
            name_zh="钢琴",
            category=InstrumentCategory.KEYBOARD,
            range=NoteRange(low=21, high=108),    # A0 to C8
            midi_program=0,
            transposition=0,
            conversion_difficulty=3,               # Harder to convert from
        )
