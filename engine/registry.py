"""Central instrument registry - manages all supported instruments."""

from typing import Optional

from .instruments import (
    Instrument, Guitar, Ukulele, Piano,
    Harp, Guzheng, Suona, Violin,
)


class InstrumentRegistry:
    """Singleton registry for all supported instruments."""

    _instance: Optional["InstrumentRegistry"] = None
    _instruments: dict[str, Instrument] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_registry()
        return cls._instance

    def _init_registry(self):
        instruments = [
            Guitar(),
            Ukulele(),
            Piano(),
            Harp(),
            Guzheng(),
            Suona(),
            Violin(),
        ]
        self._instruments = {inst.id: inst for inst in instruments}

    def get(self, inst_id: str) -> Optional[Instrument]:
        return self._instruments.get(inst_id)

    def all(self) -> list[Instrument]:
        return list(self._instruments.values())

    def list_ids(self) -> list[str]:
        return list(self._instruments.keys())

    def get_by_category(self, category: str) -> list[Instrument]:
        from .instruments.base import InstrumentCategory
        cat = InstrumentCategory(category)
        return [i for i in self._instruments.values() if i.category == cat]

    def is_compatible_pair(self, source_id: str, target_id: str) -> bool:
        """Check if two instruments can be reasonably converted between."""
        src = self.get(source_id)
        tgt = self.get(target_id)
        if not src or not tgt:
            return False
        # Compatible if ranges overlap
        overlap_low = max(src.range.low, tgt.range.low)
        overlap_high = min(src.range.high, tgt.range.high)
        return overlap_low <= overlap_high

    def difficulty_rating(self, source_id: str, target_id: str) -> int:
        """Rate conversion difficulty from 1 (easy) to 5 (extremely hard)."""
        src = self.get(source_id)
        tgt = self.get(target_id)
        if not src or not tgt:
            return 5
        return max(
            1,
            (src.conversion_difficulty + tgt.conversion_difficulty) // 2
        )
