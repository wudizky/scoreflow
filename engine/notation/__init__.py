"""Notation engine — instrument-specific sheet music generation.

Each instrument gets its most natural notation:
  guitar/ukulele  → TAB + chord diagrams
  piano/harp      → Grand staff (treble + bass clef)
  violin/suona    → Standard treble clef
  guzheng         → Standard with jianpu numerals
"""

from enum import Enum


class NotationType(str, Enum):
    TAB = "tab"               # 6/4-line tablature with fret numbers + chord names
    GRAND_STAFF = "grand_staff"  # Treble + bass clef (piano, harp)
    TREBLE_CLEF = "treble_clef"  # Standard single staff
    JIANPU = "jianpu"            # Chinese numbered notation
