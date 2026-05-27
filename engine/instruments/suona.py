from .base import Instrument, InstrumentCategory, NoteRange


class Suona(Instrument):
    """Chinese suona (double-reed horn)."""
    def __init__(self):
        super().__init__(
            id="suona",
            name="Suona",
            name_zh="唢呐",
            category=InstrumentCategory.WIND,
            range=NoteRange(low=58, high=96),     # A#3 to C7
            midi_program=111,                      # GM: shakuhachi approximation
            transposition=0,
            conversion_difficulty=5,
        )
