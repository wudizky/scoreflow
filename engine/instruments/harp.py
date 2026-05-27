from .base import Instrument, InstrumentCategory, NoteRange


class Harp(Instrument):
    """Standard concert harp (47 strings)."""
    def __init__(self):
        super().__init__(
            id="harp",
            name="Harp",
            name_zh="竖琴",
            category=InstrumentCategory.STRING,
            range=NoteRange(low=28, high=103),    # C1 to G7
            midi_program=46,
            transposition=0,
            conversion_difficulty=3,
        )
