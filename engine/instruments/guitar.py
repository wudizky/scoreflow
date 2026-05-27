from .base import Instrument, InstrumentCategory, NoteRange


class Guitar(Instrument):
    """Standard 6-string guitar."""
    def __init__(self):
        super().__init__(
            id="guitar",
            name="Guitar",
            name_zh="吉他",
            category=InstrumentCategory.STRING,
            range=NoteRange(low=40, high=88),     # E2 to C6
            midi_program=24,
            transposition=-12,                      # Sounds one octave lower
            tuning=[40, 45, 50, 55, 59, 64],       # E2 A2 D3 G3 B3 E4
            conversion_difficulty=1,
        )
