import re
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
import models


# Greeting variants the candidate might originally use
_GREETING_PATTERNS = [
    r"^Hi(\s+there)?[, ]+TPF[\w'\s]*?[,!]\s*",
    r"^Hello(\s+there)?[, ]+TPF[\w'\s]*?[,!]\s*",
    r"^Hey(\s+there)?[, ]+TPF[\w'\s]*?[,!]\s*",
    r"^Hi(\s+there)?[, ]+team[,!]\s*",
    r"^Hello(\s+there)?[, ]+team[,!]\s*",
    r"^Hey(\s+there)?[, ]+team[,!]\s*",
]


def personalize_message(message: str, trainee_first_name: str) -> str:
    """
    Replace generic 'Hi TPF team' / 'Hello TPF' greetings with 'Hi {name}'.
    If the message has no recognisable greeting, prepend one.
    """
    if not trainee_first_name:
        return message

    text = message.strip()
    for pattern in _GREETING_PATTERNS:
        if re.match(pattern, text, re.IGNORECASE):
            return re.sub(pattern, f"Hi {trainee_first_name}, ", text, count=1, flags=re.IGNORECASE)

    # No greeting found — prepend one. Lowercase first letter of original if needed.
    return f"Hi {trainee_first_name},\n\n{text}"


def get_or_create_today_session(user: models.User, db: Session) -> models.Session:
    today = date.today()

    # Return existing session if already created today
    existing = db.query(models.Session).filter(
        models.Session.user_id == user.id,
        models.Session.date == today,
    ).first()
    if existing:
        return existing

    # Scenarios this user has already done in the past
    user_seen_ids = {
        row[0] for row in db.query(models.Session.scenario_id)
        .filter(models.Session.user_id == user.id).all()
    }

    # Scenarios any other user has already been assigned TODAY
    used_today_ids = {
        row[0] for row in db.query(models.Session.scenario_id)
        .filter(models.Session.date == today).all()
    }

    # Tier 1 — fresh for this user AND unused by anyone today
    scenario = _pick(db, exclude=user_seen_ids | used_today_ids)
    # Tier 2 — fresh for this user (even if someone else got it today)
    if not scenario:
        scenario = _pick(db, exclude=user_seen_ids)
    # Tier 3 — anything not used today (user has seen them all before)
    if not scenario:
        scenario = _pick(db, exclude=used_today_ids)
    # Tier 4 — last resort, fully random
    if not scenario:
        scenario = _pick(db, exclude=set())

    if not scenario:
        raise ValueError("No scenarios available in the database.")

    session = models.Session(
        user_id=user.id,
        scenario_id=scenario.id,
        date=today,
        status="active",
        message_count=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _pick(db: Session, exclude: set):
    q = db.query(models.Scenario).filter(models.Scenario.active == True)
    if exclude:
        q = q.filter(models.Scenario.id.notin_(exclude))
    return q.order_by(func.random()).first()
