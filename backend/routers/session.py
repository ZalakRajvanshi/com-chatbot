from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from datetime import datetime
import models, schemas, auth
from database import get_db
from services.scenario_picker import get_or_create_today_session, personalize_message
from services.ai_evaluator import evaluate, generate_daily_summary
from services.scenario_generator import generate_one_in_background

router = APIRouter(prefix="/session", tags=["session"])

MAX_MESSAGES = 6  # user sends 3, AI replies 3 times


def load_session(session_id: int, db: Session) -> models.Session:
    return (
        db.query(models.Session)
        .options(
            joinedload(models.Session.scenario),
            joinedload(models.Session.messages),
        )
        .filter(models.Session.id == session_id)
        .first()
    )


@router.get("/today", response_model=schemas.SessionOut)
def get_today_session(
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    session = get_or_create_today_session(current_user, db)
    loaded = load_session(session.id, db)

    # Personalize the opening greeting so the candidate addresses this trainee by name
    trainee_first = (current_user.name or "").split(" ")[0]
    if loaded and loaded.scenario:
        loaded.scenario.message = personalize_message(loaded.scenario.message, trainee_first)

    # Background: top up the scenario pool if it's running low
    background_tasks.add_task(generate_one_in_background)

    return loaded


@router.post("/message", response_model=schemas.SendMessageResponse)
def send_message(
    request: schemas.SendMessageRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    session = get_or_create_today_session(current_user, db)

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Today's session is already completed. Come back tomorrow.")

    user_messages_count = db.query(models.Message).filter(
        models.Message.session_id == session.id,
        models.Message.role == "user",
    ).count()

    if user_messages_count >= MAX_MESSAGES // 2:
        raise HTTPException(status_code=400, detail="Message limit reached for today.")

    # Save user message
    sequence_num = session.message_count + 1
    user_msg = models.Message(
        session_id=session.id,
        role="user",
        content=request.content.strip(),
        sequence_num=sequence_num,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Build conversation history for AI
    all_messages = db.query(models.Message).filter(
        models.Message.session_id == session.id,
        models.Message.id != user_msg.id,
    ).order_by(models.Message.sequence_num).all()

    history = [{"role": m.role, "content": m.content} for m in all_messages]
    round_num = user_messages_count + 1

    # Evaluate with AI — pass the personalized scenario so the AI sees what the user saw
    scenario = session.scenario
    trainee_first_name = (current_user.name or "").split(" ")[0]
    personalized_msg = personalize_message(scenario.message, trainee_first_name)
    result = evaluate(
        scenario_message=personalized_msg,
        expected_points=scenario.expected_points or [],
        ideal_response_tone=scenario.ideal_response_tone or "",
        conversation_history=history,
        user_message=request.content.strip(),
        round_num=round_num,
        sender_name=scenario.sender_name or "the candidate",
        trainee_name=trainee_first_name,
    )

    # Force end if max rounds reached
    if round_num >= 3:
        result["decision"] = "end"

    # Save evaluation
    evaluation = models.Evaluation(
        session_id=session.id,
        message_id=user_msg.id,
        acknowledge=result.get("acknowledge", 0),
        apology=result.get("apology", 0),
        clarity=result.get("clarity", 0),
        reassurance=result.get("reassurance", 0),
        overall=result.get("overall", 0),
        decision=result.get("decision"),
        ai_reply=result.get("reply"),
    )
    db.add(evaluation)

    # Save AI reply message
    ai_msg = models.Message(
        session_id=session.id,
        role="ai",
        content=result.get("reply", ""),
        sequence_num=sequence_num + 1,
    )
    db.add(ai_msg)

    # Update session
    session.message_count += 2  # user + ai

    if result["decision"] == "end":
        session.status = "completed"
        session.completed_at = datetime.utcnow()

        # Calculate overall score from all evaluations
        evals = db.query(models.Evaluation).filter(
            models.Evaluation.session_id == session.id
        ).all()
        if evals:
            session.overall_score = sum(e.overall for e in evals) / len(evals)

        # Generate daily summary
        full_convo = [{"role": m.role, "content": m.content} for m in
                      db.query(models.Message).filter(models.Message.session_id == session.id)
                      .order_by(models.Message.sequence_num).all()]
        full_convo.append({"role": "user", "content": request.content.strip()})
        session.daily_summary = generate_daily_summary(scenario.message, full_convo)

    db.commit()

    return schemas.SendMessageResponse(
        ai_reply=result.get("reply", ""),
        session_status=session.status,
        message_count=session.message_count,
        decision=result.get("decision"),
    )