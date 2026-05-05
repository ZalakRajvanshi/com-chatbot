from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
import models, schemas, auth
from database import get_db
from services.streak import calculate_streak
from services.persona import generate_persona

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Delete employee (cascades through sessions/messages/evals) ────
@router.delete("/user/{user_id}")
def delete_user(
    user_id: int,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete an admin account.")

    session_ids = [s.id for s in db.query(models.Session).filter(models.Session.user_id == user_id).all()]
    if session_ids:
        db.query(models.Evaluation).filter(models.Evaluation.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(models.Message).filter(models.Message.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(models.Session).filter(models.Session.user_id == user_id).delete(synchronize_session=False)
    db.query(models.PasswordReset).filter(models.PasswordReset.user_id == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"status": "ok", "deleted_user_id": user_id}


# ── Create employee ───────────────────────────────────
@router.post("/users", response_model=schemas.CreateEmployeeResponse)
def create_employee(
    request: schemas.CreateEmployeeRequest,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    name = request.name.strip()
    email = request.email.strip().lower()

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name is required.")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if "@" not in email or len(email) < 4:
        raise HTTPException(status_code=400, detail="Email looks invalid.")

    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    user = models.User(
        email=email,
        password_hash=auth.hash_password(request.password),
        name=name,
        role="employee",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.CreateEmployeeResponse(id=user.id, name=user.name, email=user.email)


# ── List users ────────────────────────────────────────
@router.get("/users", response_model=List[schemas.UserSummary])
def list_users(
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).filter(models.User.role == "employee").all()
    result = []
    for user in users:
        sessions = db.query(models.Session).filter(models.Session.user_id == user.id).all()
        scores = [s.overall_score for s in sessions if s.overall_score is not None]
        last = max((s.started_at for s in sessions), default=None)
        result.append(schemas.UserSummary(
            id=user.id,
            name=user.name,
            email=user.email,
            total_sessions=len(sessions),
            avg_score=round(sum(scores) / len(scores), 2) if scores else None,
            last_active=last,
        ))
    return result


# ── User profile ──────────────────────────────────────
@router.get("/user/{user_id}", response_model=schemas.UserProfile)
def get_user_profile(
    user_id: int,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sessions = (
        db.query(models.Session)
        .options(joinedload(models.Session.scenario), joinedload(models.Session.messages))
        .filter(models.Session.user_id == user_id)
        .order_by(models.Session.date.desc())
        .all()
    )

    all_evals = (
        db.query(models.Evaluation)
        .join(models.Session, models.Session.id == models.Evaluation.session_id)
        .filter(models.Session.user_id == user_id)
        .all()
    )

    def avg(vals):
        cleaned = [v for v in vals if v is not None]
        return round(sum(cleaned) / len(cleaned), 2) if cleaned else None

    scores = [s.overall_score for s in sessions if s.overall_score is not None]

    # Build per-session message+evaluation pairs
    eval_by_message = {e.message_id: e for e in all_evals}
    rich_sessions: List[schemas.SessionDetail] = []
    for s in sessions:
        scenario = s.scenario
        rich_msgs: List[schemas.MessageWithEvaluation] = []
        for m in sorted(s.messages, key=lambda x: x.sequence_num):
            inline = None
            ev = eval_by_message.get(m.id)
            if ev and m.role == "user":
                hit, missed = _split_points(scenario.expected_points or [], ev)
                inline = schemas.EvaluationInline(
                    acknowledge=ev.acknowledge,
                    apology=ev.apology,
                    clarity=ev.clarity,
                    reassurance=ev.reassurance,
                    overall=ev.overall,
                    decision=ev.decision or "",
                    points_hit=hit,
                    points_missed=missed,
                )
            rich_msgs.append(schemas.MessageWithEvaluation(
                id=m.id,
                role=m.role,
                content=m.content,
                sequence_num=m.sequence_num,
                created_at=m.created_at,
                evaluation=inline,
            ))

        rich_sessions.append(schemas.SessionDetail(
            id=s.id,
            date=s.date,
            status=s.status,
            message_count=s.message_count,
            overall_score=s.overall_score,
            daily_summary=s.daily_summary,
            scenario=schemas.ScenarioRich(
                id=scenario.id,
                message=scenario.message,
                sender_name=scenario.sender_name or "",
                role_applied=scenario.role_applied or "",
                company_name=scenario.company_name or "",
                tone=scenario.tone or "",
                category=scenario.category or "",
                difficulty=scenario.difficulty or "medium",
                expected_points=scenario.expected_points or [],
                ideal_response_tone=scenario.ideal_response_tone,
                situation_type=scenario.situation_type,
            ),
            messages=rich_msgs,
        ))

    persona_data = generate_persona([s for s in sessions if s.status == "completed"], all_evals)
    persona = schemas.PersonaSummary(**persona_data) if persona_data else None

    return schemas.UserProfile(
        id=user.id,
        name=user.name,
        email=user.email,
        total_sessions=len(sessions),
        avg_score=avg(scores),
        avg_acknowledge=avg([e.acknowledge for e in all_evals]),
        avg_apology=avg([e.apology for e in all_evals]),
        avg_clarity=avg([e.clarity for e in all_evals]),
        avg_reassurance=avg([e.reassurance for e in all_evals]),
        streak=calculate_streak(user_id, db),
        persona=persona,
        sessions=rich_sessions,
    )


def _split_points(expected: List[str], ev: models.Evaluation):
    """Heuristic: a dimension is 'hit' if its score >= 0.5, else 'missed'.
    Maps the expected_points list to the four scored dimensions when there's overlap."""
    score_map = {
        "acknowledge": ev.acknowledge,
        "apologize": ev.apology,
        "apology": ev.apology,
        "clarity": ev.clarity,
        "clarify": ev.clarity,
        "reassure": ev.reassurance,
        "reassurance": ev.reassurance,
    }
    hit, missed = [], []
    for p in expected:
        score = score_map.get(p)
        if score is None:
            # unscored points (provide_timeline, show_empathy, etc.) — bucket them by overall
            (hit if (ev.overall or 0) >= 0.5 else missed).append(p)
        else:
            (hit if score >= 0.5 else missed).append(p)
    return hit, missed
