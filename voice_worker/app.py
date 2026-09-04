"""Voice Worker Microservice — Prosody Feature Extraction.

This is a SEPARATE service from the main API. It receives audio files,
extracts prosody features (pitch variability, pace, pauses), and returns
them via HTTP.

Architecture decision:
- Voice processing is CPU-intensive and requires native libraries.
- Running it as a separate service keeps the main API lightweight.
- In production, this would be behind a message queue (e.g., Celery +
  Redis) for async processing.

WHAT WE EXTRACT:
================
1. Pitch variability (Hz std dev) — how much the voice pitch fluctuates
2. Pace (syllables/second) — speech rate
3. Pause duration (avg seconds) — how long pauses between phrases

WHAT WE DO NOT DO:
==================
- Facial emotion detection — intentionally excluded
- Lie detection — intentionally excluded
- Gender/age/race inference — intentionally excluded
- Speaker identification — intentionally excluded

These exclusions are ETHICAL, not technical. Detecting "emotions" from
voice alone is unreliable and harmful in trauma contexts.

CLINICAL NOTE:
=============
Prosody features are experimental for distress prediction. They should
NEVER be used as standalone indicators. They are one signal among many,
weighted equally with behavioral signals (response time, skip rate).
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI(title="SAH Voice Worker", version="0.1.0")


@dataclass
class ProsodyFeatures:
    """Extracted prosody features from audio."""
    pitch_variability: float  # Hz standard deviation
    pace: float               # Syllables per second
    pause_duration: float     # Average pause duration in seconds
    duration_seconds: float   # Total audio duration
    confidence: float         # Extraction confidence (0-1)


def extract_prosody(audio_bytes: bytes) -> ProsodyFeatures:
    """Extract prosody features from audio bytes.

    Uses librosa for audio analysis. In a real deployment, this
    would also use a pitch detection algorithm (e.g., YIN or
    autocorrelation) and a speech segmentation model.

    For the prototype, we use simplified heuristics.
    """
    try:
        import librosa
        import soundfile as sf

        # Load audio
        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050)
        duration = len(audio) / sr

        # 1. Pitch variability (using YIN algorithm)
        pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
        # Select pitches with highest magnitude at each time frame
        pitch_values = []
        for t in range(pitches.shape[1]):
            idx = magnitudes[:, t].argmax()
            pitch = pitches[idx, t]
            if pitch > 0:  # Filter silence
                pitch_values.append(pitch)

        pitch_variability = float(np.std(pitch_values)) if pitch_values else 0.0

        # 2. Pace (simplified: estimate syllables from onset detection)
        onset_frames = librosa.onset.onset_detect(y=audio, sr=sr)
        # Rough syllable estimate: onsets / duration
        estimated_syllables = len(onset_frames)
        pace = estimated_syllables / duration if duration > 0 else 0.0

        # 3. Pause detection (energy-based)
        frame_length = 2048
        hop_length = 512
        rms = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=hop_length)[0]
        threshold = np.mean(rms) * 0.3

        # Find silent frames (potential pauses)
        silent = rms < threshold
        pause_frames = np.sum(silent)
        total_frames = len(rms)
        pause_ratio = pause_frames / total_frames if total_frames > 0 else 0
        pause_duration = pause_ratio * duration

        # Confidence based on audio quality
        snr_estimate = np.mean(rms) / (np.std(rms) + 1e-10)
        confidence = min(snr_estimate / 5.0, 1.0)

        return ProsodyFeatures(
            pitch_variability=round(pitch_variability, 3),
            pace=round(pace, 3),
            pause_duration=round(pause_duration, 3),
            duration_seconds=round(duration, 3),
            confidence=round(confidence, 3),
        )

    except Exception as e:
        # Graceful degradation: return zero features with low confidence
        return ProsodyFeatures(
            pitch_variability=0.0,
            pace=0.0,
            pause_duration=0.0,
            duration_seconds=0.0,
            confidence=0.0,
        )


@app.post("/extract")
async def extract_features(audio: UploadFile = File(...)):
    """Extract prosody features from an uploaded audio file.

    Returns pitch variability, pace, and pause duration.
    These are fed back into the main API as reaction signals.
    """
    audio_bytes = await audio.read()

    if len(audio_bytes) > 10 * 1024 * 1024:  # 10MB limit
        return JSONResponse(
            status_code=413,
            content={"error": "Audio file too large. Maximum 10MB."}
        )

    features = extract_prosody(audio_bytes)

    return {
        "pitch_variability": features.pitch_variability,
        "pace": features.pace,
        "pause_duration": features.pause_duration,
        "duration_seconds": features.duration_seconds,
        "confidence": features.confidence,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "voice_worker"}
