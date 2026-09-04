"""Seed script: Trauma-informed question bank.

Populates the question_bank table with:
- 18 intake questions (one-time initial assessment)
- 15 check-in questions (rotating pool, 5 per session)

DESIGN PRINCIPLES:
=================
1. TRAUMA-INFORMED: Questions are empowering, non-triggering, and give
   the survivor control (skip always available, no forced answers).

2. TOPIC-TAGGED: Each question has topic tags for sensitivity mapping.
   This lets the system detect which topics activate strong reactions.

3. RESPONSE OPTIONS: Likert-scale + optional free text. This gives both
   quantifiable data (for baselines) and qualitative context.

4. DOMAINS COVERED:
   - Safety (current safety, safe people, safe spaces)
   - Sleep (quality, duration, nightmares)
   - Daily functioning (routine, self-care, concentration)
   - Social connection (isolation, support, relationships)
   - Coping (what helps, what makes it harder)
   - Access to needs (food, shelter, medical care)
   - Emotional state (mood, energy, anxiety)
   - Strengths (what's going well, resilience)

5. NO CLINICAL LABELS: Questions don't use words like "depressed",
   "anxious", "PTSD". Instead: "How has your sleep been?",
   "How easy has it been to focus?" — observable behaviors.

CLINICAL NOTE:
=============
These questions are starting points for prototyping. A real deployment
requires:
- Review by trauma-informed clinicians
- Cultural adaptation for the target population
- Pilot testing with survivors (with consent)
- IRB/ethics board approval
"""

import asyncio
import uuid
from datetime import datetime, timezone

from app.database import async_session_factory, engine, Base
from app.models import QuestionBank


# ─── Intake Questions (15-20, one-time) ──────────────────────────────────────

INTAKE_QUESTIONS = [
    # ── Safety ──
    {
        "text": "Do you currently feel safe where you are living?",
        "topic_tags": ["safety", "housing"],
        "response_options": ["Yes", "Mostly", "Sometimes", "No", "Prefer not to say"],
    },
    {
        "text": "Is there someone in your life you trust and feel safe with?",
        "topic_tags": ["safety", "social_connection"],
        "response_options": ["Yes, several people", "Yes, one person", "Not sure", "No", "Prefer not to say"],
    },
    {
        "text": "In the past two weeks, have you felt worried about your physical safety?",
        "topic_tags": ["safety"],
        "response_options": ["Not at all", "A little", "Sometimes", "Often", "Most of the time", "Prefer not to say"],
    },

    # ── Sleep ──
    {
        "text": "How has your sleep been recently?",
        "topic_tags": ["sleep"],
        "response_options": ["Very well", "Mostly well", "Sometimes difficult", "Often difficult", "Very poorly", "Prefer not to say"],
    },
    {
        "text": "How often have you had trouble falling asleep or staying asleep?",
        "topic_tags": ["sleep"],
        "response_options": ["Never", "Rarely", "Sometimes", "Often", "Almost every night", "Prefer not to say"],
    },
    {
        "text": "Have you had disturbing dreams or nightmares recently?",
        "topic_tags": ["sleep", "trauma_response"],
        "response_options": ["Never", "Rarely", "Sometimes", "Often", "Almost every night", "Prefer not to say"],
    },

    # ── Daily Functioning ──
    {
        "text": "How easy has it been to do everyday tasks like eating, bathing, or getting dressed?",
        "topic_tags": ["daily_functioning", "self_care"],
        "response_options": ["Very easy", "Mostly easy", "Sometimes hard", "Often hard", "Very difficult", "Prefer not to say"],
    },
    {
        "text": "How easy has it been to concentrate or focus on things?",
        "topic_tags": ["daily_functioning", "concentration"],
        "response_options": ["Very easy", "Mostly easy", "Sometimes hard", "Often hard", "Very difficult", "Prefer not to say"],
    },
    {
        "text": "Have you been able to maintain a daily routine (meals, activities, sleep schedule)?",
        "topic_tags": ["daily_functioning", "routine"],
        "response_options": ["Yes, mostly", "Sometimes", "Not really", "No", "Prefer not to say"],
    },

    # ── Social Connection ──
    {
        "text": "How connected do you feel to the people around you?",
        "topic_tags": ["social_connection", "isolation"],
        "response_options": ["Very connected", "Somewhat connected", "A little isolated", "Very isolated", "Prefer not to say"],
    },
    {
        "text": "In the past two weeks, how often have you felt alone or withdrawn?",
        "topic_tags": ["social_connection", "isolation"],
        "response_options": ["Never", "Rarely", "Sometimes", "Often", "Most of the time", "Prefer not to say"],
    },

    # ── Coping ──
    {
        "text": "What things have been helping you cope recently? (Optional)",
        "topic_tags": ["coping", "strengths"],
        "response_options": [],
        "allow_free_text": True,
    },
    {
        "text": "What makes it harder for you to feel okay day to day? (Optional)",
        "topic_tags": ["coping", "triggers"],
        "response_options": [],
        "allow_free_text": True,
    },

    # ── Access to Needs ──
    {
        "text": "Do you currently have access to the food you need?",
        "topic_tags": ["food", "access"],
        "response_options": ["Yes, always", "Mostly", "Sometimes not", "Often not", "No", "Prefer not to say"],
    },
    {
        "text": "Do you currently have a safe place to stay?",
        "topic_tags": ["housing", "safety"],
        "response_options": ["Yes", "Mostly", "Sometimes", "No", "Prefer not to say"],
    },
    {
        "text": "Do you have access to medical care or medicine you need?",
        "topic_tags": ["medical", "access"],
        "response_options": ["Yes", "Sometimes", "No", "Prefer not to say"],
    },

    # ── Strengths & Preferences ──
    {
        "text": "What is one thing that gives you strength or hope right now? (Optional)",
        "topic_tags": ["strengths", "coping"],
        "response_options": [],
        "allow_free_text": True,
    },
    {
        "text": "How would you prefer we check in with you?",
        "topic_tags": ["preferences"],
        "response_options": ["Daily quick check-in", "Every few days", "Weekly", "When I feel I need it"],
    },
    {
        "text": "Is there anything else you'd like us to know? (Optional)",
        "topic_tags": ["additional"],
        "response_options": [],
        "allow_free_text": True,
    },
]


# ─── Check-in Questions (15 in pool, 5 per session) ──────────────────────────

CHECKIN_QUESTIONS = [
    # ── Safety ──
    {
        "text": "How safe do you feel right now?",
        "topic_tags": ["safety"],
        "response_options": ["Very safe", "Mostly safe", "A little uneasy", "Unsafe", "Prefer not to say"],
    },

    # ── Sleep ──
    {
        "text": "How was your sleep last night?",
        "topic_tags": ["sleep"],
        "response_options": ["Very good", "Good", "Okay", "Poor", "Very poor", "Prefer not to say"],
    },
    {
        "text": "Did you have any disturbing dreams or nightmares recently?",
        "topic_tags": ["sleep", "trauma_response"],
        "response_options": ["No", "Yes, one", "Yes, several", "Prefer not to say"],
    },

    # ── Mood / Energy ──
    {
        "text": "How would you describe your energy level today?",
        "topic_tags": ["energy", "mood"],
        "response_options": ["High", "Good", "Okay", "Low", "Very low", "Prefer not to say"],
    },
    {
        "text": "How has your mood been overall today?",
        "topic_tags": ["mood"],
        "response_options": ["Good", "Okay", "Down", "Very down", "Up and down", "Prefer not to say"],
    },

    # ── Daily Functioning ──
    {
        "text": "How easy has it been to focus on things today?",
        "topic_tags": ["concentration", "daily_functioning"],
        "response_options": ["Very easy", "Somewhat easy", "Hard", "Very hard", "Prefer not to say"],
    },
    {
        "text": "Have you been able to eat today?",
        "topic_tags": ["food", "self_care"],
        "response_options": ["Yes, regular meals", "Yes, some food", "Not really", "No", "Prefer not to say"],
    },
    {
        "text": "Have you been able to do basic self-care today (bathing, getting dressed)?",
        "topic_tags": ["self_care", "daily_functioning"],
        "response_options": ["Yes", "Partially", "Not really", "No", "Prefer not to say"],
    },

    # ── Social Connection ──
    {
        "text": "Have you had any positive interaction with someone today?",
        "topic_tags": ["social_connection"],
        "response_options": ["Yes, meaningful", "Yes, brief", "Not really", "No", "Prefer not to say"],
    },
    {
        "text": "Have you felt alone or isolated today?",
        "topic_tags": ["isolation", "social_connection"],
        "response_options": ["Not at all", "A little", "Somewhat", "Very much", "Prefer not to say"],
    },

    # ── Coping ──
    {
        "text": "Have you done anything today that helped you feel a little better?",
        "topic_tags": ["coping", "strengths"],
        "response_options": ["Yes", "A little", "Not really", "Prefer not to say"],
    },
    {
        "text": "What has been the hardest part of today? (Optional)",
        "topic_tags": ["coping", "triggers"],
        "response_options": [],
        "allow_free_text": True,
    },

    # ── Triggers / Distress ──
    {
        "text": "Have you encountered anything today that felt triggering or very upsetting?",
        "topic_tags": ["triggers", "distress"],
        "response_options": ["No", "A little", "Yes, somewhat", "Yes, very", "Prefer not to say"],
    },
    {
        "text": "How easy has it been to feel calm or relaxed today?",
        "topic_tags": ["anxiety", "coping"],
        "response_options": ["Very easy", "Somewhat easy", "Hard", "Very hard", "Prefer not to say"],
    },

    # ── Strengths ──
    {
        "text": "What is one small thing that went well today? (Optional)",
        "topic_tags": ["strengths", "coping"],
        "response_options": [],
        "allow_free_text": True,
    },
]


# ─── Seed Function ────────────────────────────────────────────────────────────

async def seed_question_bank():
    """Populate the question_bank table with trauma-informed questions."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # Check if questions already exist
        from sqlalchemy import select, func
        result = await db.execute(select(func.count(QuestionBank.id)))
        count = result.scalar()
        if count > 0:
            print(f"Question bank already has {count} questions. Skipping seed.")
            return

        questions_added = 0

        # Add intake questions
        for i, q in enumerate(INTAKE_QUESTIONS):
            question = QuestionBank(
                id=uuid.uuid4(),
                text=q["text"],
                topic_tags=q["topic_tags"],
                is_intake=True,
                is_checkin=False,
                is_active=True,
            )
            db.add(question)
            questions_added += 1
            print(f"  [INTAKE {i+1:2d}] {q['text'][:60]}... -> {q['topic_tags']}")

        # Add check-in questions
        for i, q in enumerate(CHECKIN_QUESTIONS):
            question = QuestionBank(
                id=uuid.uuid4(),
                text=q["text"],
                topic_tags=q["topic_tags"],
                is_intake=False,
                is_checkin=True,
                is_active=True,
            )
            db.add(question)
            questions_added += 1
            print(f"  [CHECKIN {i+1:2d}] {q['text'][:60]}... -> {q['topic_tags']}")

        await db.commit()
        print(f"\nSeeded {questions_added} questions ({len(INTAKE_QUESTIONS)} intake + {len(CHECKIN_QUESTIONS)} check-in)")


if __name__ == "__main__":
    asyncio.run(seed_question_bank())
