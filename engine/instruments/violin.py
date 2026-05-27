from .base import Instrument, InstrumentCategory, NoteRange


class Violin(Instrument):
    """Standard violin."""
    def __init__(self):
        super().__init__(
            id="violin",
            name="Violin",
            name_zh="小提琴",
            category=InstrumentCategory.STRING,
            range=NoteRange(low=55, high=100),    # G3 to G7
            midi_program=40,
            transposition=0,
            tuning=[55, 62, 69, 76],              # G3 D4 A4 E5
            conversion_difficulty=3,
        )
