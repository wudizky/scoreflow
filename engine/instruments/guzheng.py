from .base import Instrument, InstrumentCategory, NoteRange


class Guzheng(Instrument):
    """Chinese guzheng (21 strings, D pentatonic standard tuning)."""
    def __init__(self):
        super().__init__(
            id="guzheng",
            name="Guzheng",
            name_zh="古筝",
            category=InstrumentCategory.PLUCKED,
            range=NoteRange(low=48, high=93),     # C4 to A7
            midi_program=107,                      # GM: koto approximation
            transposition=0,
            tuning=[52, 54, 57, 59, 62, 64, 67, 69, 72, 74, 77, 79, 82, 84, 87, 89, 92, 94, 97, 99, 102],
            conversion_difficulty=5,               # Most complex
        )
