"""
Background scenario generator.

Strategy: each time a user opens their daily session, we fire a background task
to top up the pool — but ONLY if there are fewer than POOL_TARGET active scenarios.

This makes generation self-regulating:
  - Active team using the app → pool stays full
  - No usage → no API spend
  - No external cron, no dependencies

Throttle is in-process (per Render worker). With 2 workers and bursty traffic,
worst case is generating ~1 scenario per /session/today call until pool is full.
"""
import os
import json
import time
import random
import threading
from openai import OpenAI

from database import SessionLocal
import models

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

POOL_TARGET = 100              # stop generating once we have this many active scenarios
MIN_INTERVAL_SEC = 30          # minimum seconds between generations (in-process throttle)
SITUATION_TYPES = [
    "no_update_after_applying", "post_interview_silence", "competing_offer_urgency",
    "referral_process_confusion", "offer_letter_delay", "rejection_feedback_request",
    "interview_cancelled_no_reschedule", "ghosted_mid_process", "salary_mismatch",
    "role_no_longer_listed", "notice_period_issue", "client_candidate_no_show",
    "client_profile_mismatch", "internal_team_delayed_feedback",
    "candidate_reapplying_after_rejection",
]
COMPANIES = ["Swiggy", "Zomato", "CRED", "Paytm", "Zepto", "BharatPe", "Razorpay",
             "Meesho", "PhonePe", "Pine Labs", "Google"]
ROLES = ["Senior Product Manager", "Product Manager", "Associate PM", "Growth PM",
         "Principal PM", "PM Lead"]

# Last generation timestamp (per worker process) for throttling
_last_generation_at = 0.0
_lock = threading.Lock()


def _scenario_count(db) -> int:
    return db.query(models.Scenario).filter(models.Scenario.active == True).count()


def _build_prompt(situation: str, company: str, role: str) -> str:
    return f"""Generate ONE realistic communication scenario for The Product Folks (TPF) talent recruitment team.

TPF is the MIDDLEMAN between candidates and hiring companies. They don't make hiring decisions.

Situation: {situation.replace('_', ' ')}
Company: {company}
Role: {role}

The scenario must be a REAL message a candidate or client professional would send.
- Polite professional tone (PMs, designers, devs, hiring managers — never rude or threatening)
- 2-4 sentences
- Specific to the situation, not generic
- Indian first name as sender

Return JSON:
{{
  "message": "the message in first person, as if sent by the candidate/client",
  "sender_name": "Indian first name",
  "role_applied": "{role}",
  "company_name": "{company}",
  "tone": "concerned_candidate | frustrated_candidate | confused_candidate | ghosted_candidate | professional_client | angry_client",
  "category": "delay | ghosting | process_confusion | offer_issue | rejection | feedback_request | general",
  "situation_type": "{situation}",
  "expected_points": ["3-4 from: acknowledge, apologize, clarify, reassure, provide_timeline, explain_process, show_empathy, set_expectations"],
  "ideal_response_tone": "one sentence describing how a TPF middleman should ideally respond",
  "difficulty": "easy | medium | hard"
}}"""


def generate_one_in_background():
    """
    Fire-and-forget: top up the scenario pool by 1.
    Safe to call from FastAPI BackgroundTasks. Never raises.
    """
    global _last_generation_at

    # Throttle: don't generate more than once every MIN_INTERVAL_SEC seconds per worker
    with _lock:
        now = time.time()
        if now - _last_generation_at < MIN_INTERVAL_SEC:
            return
        _last_generation_at = now

    db = SessionLocal()
    try:
        # Pool target check — only generate if we're below the cap
        if _scenario_count(db) >= POOL_TARGET:
            return

        situation = random.choice(SITUATION_TYPES)
        company = random.choice(COMPANIES)
        role = random.choice(ROLES)

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": _build_prompt(situation, company, role)}],
                response_format={"type": "json_object"},
                temperature=0.85,
            )
            data = json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"[scenario_generator] OpenAI call failed: {e}")
            return

        # Validate the AI gave us at least the must-have fields
        if not data.get("message") or not data.get("sender_name"):
            print("[scenario_generator] AI returned incomplete scenario, skipping")
            return

        scenario = models.Scenario(
            message=data.get("message", "").strip(),
            sender_name=data.get("sender_name", "")[:64],
            role_applied=data.get("role_applied", role),
            company_name=data.get("company_name", company),
            tone=data.get("tone", "concerned_candidate"),
            category=data.get("category", "general"),
            situation_type=data.get("situation_type", situation),
            expected_points=data.get("expected_points", []),
            ideal_response_tone=data.get("ideal_response_tone", ""),
            difficulty=data.get("difficulty", "medium"),
            active=True,
        )
        db.add(scenario)
        db.commit()
        print(f"[scenario_generator] +1 scenario added (pool now {_scenario_count(db)})")

    except Exception as e:
        print(f"[scenario_generator] background task error: {e}")
        db.rollback()
    finally:
        db.close()
