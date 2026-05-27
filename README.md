# ScoreFlow

AI-powered cross-instrument music transcription and conversion.

## Architecture

```
scoreflow/
├── engine/           # Core music logic (Python)
│   ├── instruments/  # Instrument definitions
│   ├── rules/        # Conversion rules
│   └── converters/   # MIDI/MusicXML utilities
├── backend/          # FastAPI REST API
│   └── app/
│       ├── core/     # AMT & audio processing
│       └── api.py    # API endpoints
└── web/              # Next.js frontend
    ├── components/   # React components
    └── pages/        # App pages
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Web

```bash
cd web
npm install
npm run dev
```

## API Endpoints

- `GET  /api/v1/instruments` — List supported instruments
- `GET  /api/v1/conversion-pairs` — List conversion pairs with difficulty
- `POST /api/v1/transcribe` — Upload audio → sheet music (MIDI/MusicXML)
- `POST /api/v1/convert` — Convert notes between instruments
- `POST /api/v1/audio-to-converted` — End-to-end: audio→transcribe→convert

## Supported Instruments

| Instrument | Range | Difficulty |
|-----------|-------|------------|
| Piano | A0–C8 | Reference |
| Guitar | E2–C6 | Easy |
| Ukulele | C4–C7 | Easy |
| Violin | G3–G7 | Medium |
| Harp | C1–G7 | Medium |
| Guzheng (古筝) | C4–A7 | Hard |
| Suona (唢呐) | A#3–C7 | Hard |

## Tech Stack

- **Engine**: Python, Music21-compatible architecture
- **Backend**: FastAPI, Uvicorn
- **Frontend**: Next.js, React, VexFlow
- **Audio**: librosa, Basic Pitch (Spotify), Demucs (Meta)
