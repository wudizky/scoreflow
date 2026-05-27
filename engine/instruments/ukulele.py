from .base import Instrument, InstrumentCategory, NoteRange


class Ukulele(Instrument):
    """Standard GCEA ukulele."""
    def __init__(self):
        super().__init__(
            id="ukulele",
            name="Ukulele",
            name_zh="尤克里里",
            category=InstrumentCategory.STRING,
            range=NoteRange(low=48, high=84),     # C4 to C7 (high g)
            midi_program=24,
            transposition=0,
            tuning=[48, 55, 60, 64],              # G4 C4 E4 A4 (re-entrant)
            conversion_difficulty=1,
        )
