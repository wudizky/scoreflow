from setuptools import setup, find_packages

setup(
    name="scoreflow-engine",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "python-multipart>=0.0.6",
        "pydantic>=2.0",
    ],
    extras_require={
        "transcription": [
            "librosa>=0.10.0",
            "numpy>=1.24.0",
        ],
        "ml": [
            "basic-pitch>=0.3.0",
            "crepe>=0.1.0",
            "torch>=2.0.0",
        ],
        "separation": [
            "demucs>=4.0.0",
            "torch>=2.0.0",
        ],
        "all": [
            "librosa>=0.10.0",
            "numpy>=1.24.0",
            "basic-pitch>=0.3.0",
            "crepe>=0.1.0",
            "torch>=2.0.0",
        ],
    },
)
