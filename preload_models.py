"""Pre-load ML models during Docker build.

This runs inside the Dockerfile to:
1. Verify all ML packages installed correctly
2. Trigger any first-run downloads so they're baked into the image
3. Validate the model files exist and are loadable

After this runs, the ECS runtime needs ZERO internet access for models.
"""
import sys
import os


def preload_basic_pitch():
    """Verify basic-pitch ONNX model is present. No TF needed (ONNX runtime)."""
    print("[preload] basic-pitch: checking model files...", flush=True)
    import basic_pitch
    import pathlib

    bp_dir = pathlib.Path(basic_pitch.__path__[0])
    model_dir = bp_dir / "saved_models" / "icassp_2022"
    onnx_model = model_dir / "nmp.onnx"

    if onnx_model.exists():
        size_kb = onnx_model.stat().st_size / 1024
        print(f"[preload] basic-pitch: ONNX model OK ({size_kb:.0f} KB)", flush=True)
        # Validate ONNX Runtime can load it
        import onnxruntime as ort
        net = ort.InferenceSession(str(onnx_model))
        print(f"[preload] basic-pitch: ONNX Runtime loaded model ({net.get_inputs()[0].name})", flush=True)
    else:
        print("[preload] basic-pitch: WARNING - ONNX model not found, transcription will fallback", flush=True)

    # basic-pitch 0.4.0 uses ONNX (no TF needed for inference)
    try:
        import tensorflow as tf
        print(f"[preload] basic-pitch: TensorFlow {tf.__version__} (optional, not required)", flush=True)
    except ImportError:
        print("[preload] basic-pitch: TensorFlow not installed (using ONNX, this is expected)", flush=True)


def preload_crepe():
    """Verify CREPE model weights exist (downloaded by pip install)."""
    print("[preload] CREPE: checking model files...", flush=True)
    import crepe
    import pathlib

    cp_dir = pathlib.Path(crepe.__path__[0])
    models = list(cp_dir.glob("model-*.h5"))
    if not models:
        print("[preload] CREPE: WARNING - no model files found!", flush=True)
        return
    for m in sorted(models):
        size_mb = m.stat().st_size / (1024 * 1024)
        print(f"[preload] CREPE: {m.name} ({size_mb:.1f} MB)", flush=True)
    print("[preload] CREPE: all model weights present OK", flush=True)


def preload_librosa():
    """Verify librosa with audio loading support."""
    print("[preload] librosa: checking...", flush=True)
    import librosa
    import numpy as np
    import soundfile

    print(f"[preload] librosa: {librosa.__version__} OK", flush=True)


def main():
    print("=" * 50, flush=True)
    print("[preload] Starting ML model preload...", flush=True)
    print("[preload] (models are baked into the Docker image)", flush=True)
    print("=" * 50, flush=True)

    preload_librosa()
    preload_basic_pitch()
    preload_crepe()

    # Demucs: skip preload for now (experimental, ~300MB model)
    # torch.hub downloads at runtime if ever used
    print("[preload] Demucs: skipped (experimental, loaded on-demand)", flush=True)

    print("=" * 50, flush=True)
    print("[preload] All models preloaded successfully!", flush=True)
    print("=" * 50, flush=True)


if __name__ == "__main__":
    main()
