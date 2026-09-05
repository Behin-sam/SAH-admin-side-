# SAH — Trauma-Informed AI Support System

> **⚠️ PROTOTYPE / HACKATHON PROJECT — NOT for clinical use or deployment.**
> This system must be validated by trauma-informed clinicians and NGOs
> before any contact with real survivors.

## Overview

An AI-powered mental health distress-prediction backend for survivors of
abuse, violence, trafficking, and disaster. This is a **human-in-the-loop**
support tool — it never makes autonomous decisions about care.

### Key Design Principles

1. **Personal baselines, not population norms** — each survivor IS their own baseline
2. **Trajectory, not diagnosis** — output is stable/declining/escalating/acute, never a "score"
3. **Explainability over accuracy** — counselors see WHY, not just WHAT
4. **Survivor owns their data** — opt-in signals, revocable consent, data deletion
5. **No facial detection, no lie detection** — intentionally excluded for ethical reasons

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  • Intake form (15-20 questions)                    │
│  • Daily check-in (5 rotating questions)            │
│  • "Your patterns" trend view                       │
│  • Consent management UI                            │
│  • Counselor dashboard                              │
└─────────────┬──────────────────┬────────────────────┘
              │                  │
              ▼                  ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Main API (FastAPI) │  │  Voice Worker (FastAPI)│
│   Port 8000          │  │  Port 8001            │
│                      │  │                       │
│  • Auth + Consent    │  │  • Prosody extraction  │
│  • CRUD endpoints    │  │  • Pitch/pace/pauses   │
│  • Baseline engine   │  │                       │
│  • Deviation model   │  │  (Separate because     │
│  • Escalation logic  │  │   CPU-intensive)       │
└──────────┬───────────┘  └───────────────────────┘
           │
           ▼
┌──────────────────────┐
│   PostgreSQL         │
│   • Encrypted PII    │
│   • Time series data │
│   • Audit trail      │
└──────────────────────┘
```

## Quick Start

### 1. Start the Backend API (Port 8001)
```bash
# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server (uses pre-configured SQLite sah_local.db)
uvicorn app.main:app --reload --port 8001
```
*API is accessible at `http://localhost:8001` and Swagger docs at `http://localhost:8001/docs`.*

---

### 2. Run the Web Application (Port 3000)
```bash
# Navigate to web frontend
cd frontend

# Install packages
npm install

# Start development server
npm run dev
```
*Open `http://localhost:3000` in your browser to access the Counselor Dashboard & Veteran Web Portal.*

---

### 3. Run the Mobile App (Expo / Web / Phone)
```bash
# Navigate to mobile app directory
cd veteran-app

# Install packages
npm install

# Run in web browser (centered mobile view with full icons)
npm run web

# Or scan QR code on phone via Expo Go
npm start
```
*Web version opens at `http://localhost:8081`.*

---

### Demo Accounts
- **Clinical Counselor**: `ananya@amrita.edu` / `password123` (Dr. Ananya Nair, MD)
- **Veteran Comrade**: `vikram@para.gov.in` / `password123` (Capt. Vikram Rathore)

## API Endpoints & JSON Contracts

### Survivor Profile

#### `POST /api/survivors/` — Create survivor
```json
// Request
{
  "name": "Jane",
  "email": null,
  "phone": "+1234567890",
  "preferred_language": "en",
  "timezone_offset": "+05:30"
}

// Response (201)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "preferred_language": "en",
  "timezone_offset": "+05:30",
  "baseline_established": false,
  "baseline_period_end": null,
  "created_at": "2026-09-04T12:00:00Z"
}
```

#### `GET /api/survivors/{id}` — Get survivor (redacted for counselors)
```json
// Response (200)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "preferred_language": "en",
  "timezone_offset": "+05:30",
  "baseline_established": true,
  "baseline_period_end": "2026-09-18T12:00:00Z",
  "created_at": "2026-09-04T12:00:00Z"
}
```

#### `GET /api/survivors/{id}/detail` — Get survivor detail (self-view only, decrypted PII)
```json
// Response (200)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "preferred_language": "en",
  "timezone_offset": "+05:30",
  "baseline_established": true,
  "baseline_period_end": "2026-09-18T12:00:00Z",
  "created_at": "2026-09-04T12:00:00Z"
}
```

### Consent Management

#### `GET /api/survivors/{id}/consent/` — Get all consent statuses
```json
// Response (200)
{
  "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
  "consents": {
    "time_to_answer": "active",
    "skip_rate": "active",
    "answer_revision": "active",
    "voice_pitch": "revoked",
    "voice_pace": "revoked",
    "voice_pauses": "revoked"
  }
}
```

#### `POST /api/survivors/{id}/consent/` — Toggle consent
```json
// Request
{
  "signal_type": "voice_pitch",
  "active": true
}

// Response (200)
{
  "signal_type": "voice_pitch",
  "status": "active",
  "consent_version": 2,
  "revoked_at": null
}
```

### Check-ins

#### `POST /api/survivors/{id}/intake` — Submit intake
```json
// Request
{
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "answers": [
    {
      "question_id": "770e8400-e29b-41d4-a716-446655440002",
      "response_text": "I have been feeling anxious lately",
      "response_option": null
    }
  ]
}

// Response (201)
{
  "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "660e8400-e29b-41d4-a716-446655440001",
  "questions_answered": 15,
  "message": "Intake completed. Baseline period begins now."
}
```

#### `POST /api/survivors/{id}/checkin` — Submit check-in + reaction signals
```json
// Request
{
  "session_id": "880e8400-e29b-41d4-a716-446655440003",
  "answers": [
    {
      "question_id": "990e8400-e29b-41d4-a716-446655440004",
      "response_text": "Sleep has been difficult",
      "response_option": null,
      "time_to_answer_seconds": 4.2,
      "was_skipped": false,
      "revision_count": 1
    }
  ],
  "reaction_signals": {
    "time_to_answer_avg": 4.2,
    "skip_count": 0,
    "total_questions": 5,
    "revision_total": 1,
    "voice_pitch_variability": 45.2,
    "voice_pace": 3.8,
    "voice_pause_duration": 1.2
  },
  "started_at": "2026-09-05T09:00:00Z",
  "completed_at": "2026-09-05T09:02:30Z"
}

// Response (201)
{
  "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "880e8400-e29b-41d4-a716-446655440003",
  "checkins_completed": 12,
  "baseline_established": false,
  "checkins_until_baseline": 2,
  "trajectory": null
}
```

#### `GET /api/survivors/{id}/trend` — Survivor's own trend view
```json
// Response (200)
{
  "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_trajectory": {
    "label": "stable",
    "severity_score": 0.15,
    "confidence": 0.85,
    "trend_summary": "Stable pattern. Your behavioral signals remain within your normal range.",
    "computed_at": "2026-09-18T12:00:00Z"
  },
  "trajectory_history": [],
  "sensitivity_map": {
    "sleep": 0.42,
    "safety": 0.31
  }
}
```

### Counselor Dashboard

#### `GET /api/counselors/{id}/cases` — List assigned cases
```json
// Response (200)
[
  {
    "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
    "current_trajectory": {
      "label": "escalating",
      "severity_score": 0.65,
      "confidence": 0.78,
      "trend_summary": "Escalating pattern detected. Primarily driven by changes in sleep.",
      "computed_at": "2026-09-18T12:00:00Z"
    },
    "alert_status": "pending",
    "alert_created_at": "2026-09-18T12:00:00Z",
    "baseline_established": true,
    "checkin_count": 14,
    "consent_status": {
      "time_to_answer": "active",
      "voice_pitch": "revoked"
    },
    "sensitivity_map": {
      "sleep": 0.82,
      "safety": 0.71
    }
  }
]
```

#### `GET /api/counselors/{id}/alerts` — List alerts
```json
// Response (200)
{
  "alerts": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440010",
      "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
      "alert_type": "escalating",
      "status": "pending",
      "trend_summary": "Escalating pattern detected over the last 5 check-ins.",
      "contributing_topics": ["sleep", "safety"],
      "severity_score": 0.65,
      "case_notes": null,
      "created_at": "2026-09-18T12:00:00Z",
      "acknowledged_at": null
    }
  ],
  "total_pending": 1
}
```

#### `POST /api/counselors/{id}/alerts/{aid}/ack` — Acknowledge alert
```json
// Request
{
  "case_notes": "Will check in with survivor tomorrow morning."
}

// Response (200)
{
  "id": "aa0e8400-e29b-41d4-a716-446655440010",
  "survivor_id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "escalating",
  "status": "acknowledged",
  "trend_summary": "...",
  "contributing_topics": ["sleep", "safety"],
  "severity_score": 0.65,
  "case_notes": "Will check in with survivor tomorrow morning.",
  "created_at": "2026-09-18T12:00:00Z",
  "acknowledged_at": "2026-09-18T14:30:00Z"
}
```

### Offline Sync

#### `POST /api/sync/` — Submit offline operations batch
```json
// Request
{
  "device_id": "mobile-android-001",
  "operations": [
    {
      "operation": "create_checkin",
      "payload": { "session_id": "...", "answers": [...] },
      "client_timestamp": "2026-09-05T09:00:00Z"
    }
  ]
}

// Response (200)
{
  "synced": 1,
  "failed": 0,
  "conflicts": [],
  "server_timestamp": "2026-09-05T12:00:00Z"
}
```

## Voice Worker (Separate Service)

```bash
cd voice_worker
pip install -r requirements.txt
uvicorn app:app --port 8001

# Extract prosody features
curl -X POST http://localhost:8001/extract \
  -F "audio=@recording.wav"
```

```json
// Response
{
  "pitch_variability": 45.2,
  "pace": 3.8,
  "pause_duration": 1.2,
  "duration_seconds": 30.5,
  "confidence": 0.87
}
```

## How It Works

### 1. Baseline Period (First 2 Weeks)
- Survivor completes daily 5-question check-ins
- System collects reaction signals (timing, skip rate, revisions, voice)
- After 14 days / 10+ check-ins, a personal baseline is computed
- Baseline = mean + std dev for each metric (THIS survivor's "normal")

### 2. Ongoing Monitoring
- Each new check-in is scored against the personal baseline using z-scores
- A rolling window of the last 5 check-ins determines trajectory
- Trajectory is classified: stable / declining / escalating / acute

### 3. Escalation
- **Stable** → No action
- **Declining** → Self-resource nudge in-app
- **Escalating** → Counselor alert with trend summary + explainability
- **Acute** → Immediate-contact protocol alert

### 4. Counselor View
- Sees derived insights only (trajectory, severity, topic sensitivity)
- NEVER sees raw response text, raw signal logs, or survivor PII
- Every alert includes explainability (which features, which topics)

## Clinical Validation Needed Before Real Use

> **This is a prototype. The following require clinical/NGO validation:**

1. **Baseline period length** — 14 days is an assumption, not evidence-based
2. **Z-score thresholds** — Current thresholds are starting points
3. **Question bank** — Needs trauma-informed clinical review
4. **Escalation protocols** — Must align with local crisis response procedures
5. **Voice feature validity** — Prosody-based distress detection is experimental
6. **Cultural appropriateness** — Reaction patterns vary across cultures
7. **Minimum data completeness** — What if a survivor only completes 3/5 questions?
8. **Consent language** — Must be reviewed by legal/ethics experts
9. **Data retention policies** — Must comply with local regulations (GDPR, etc.)
10. **Adverse event handling** — What if the system's alert misses a crisis?

## Project Structure

```
trauma-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings via env vars
│   ├── database.py          # Async SQLAlchemy
│   ├── api/
│   │   ├── survivors.py     # Survivor CRUD
│   │   ├── consent.py       # Consent management
│   │   ├── checkins.py      # Intake + check-in endpoints
│   │   ├── counselor.py     # Counselor dashboard + alerts
│   │   └── sync.py          # Offline sync
│   ├── engine/
│   │   ├── baseline.py      # Personal baseline computation
│   │   ├── deviation.py     # Z-score deviation + trajectory
│   │   ├── topic_sensitivity.py  # Topic-level activation
│   │   └── escalation.py    # Tiered alert logic
│   ├── middleware/
│   │   └── consent.py       # Consent enforcement
│   ├── models/
│   │   ├── __init__.py      # SQLAlchemy models (9 tables)
│   │   └── sync.py          # Sync queue model
│   ├── schemas/
│   │   ├── requests.py      # Pydantic request schemas
│   │   └── responses.py     # Pydantic response schemas
│   └── security/
│       ├── encryption.py    # Field-level Fernet encryption
│       └── access_control.py # Role-based query filtering
├── voice_worker/
│   ├── app.py               # Prosody extraction service
│   ├── Dockerfile
│   └── requirements.txt
├── alembic/                  # DB migrations
├── alembic.ini
├── requirements.txt
└── README.md
```

## License

Internal use only — hackathon prototype.
