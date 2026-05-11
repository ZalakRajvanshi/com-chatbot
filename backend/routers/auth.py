import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from services.email import send_email, password_reset_email, is_configured as email_configured

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_LINK_BASE = os.getenv("RESET_LINK_BASE", "http://localhost:5173/reset-password")
RESET_TOKEN_TTL_HOURS = 1

# Optional comma-separated allowlist of email domains for public signup.
# Empty = anyone can sign up. Example: "theproductfolks.com,gmail.com"
SIGNUP_ALLOWED_DOMAINS = [
    d.strip().lower() for d in os.getenv("SIGNUP_ALLOWED_DOMAINS", "").split(",") if d.strip()
]


@router.post("/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not auth.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_token(user.id)
    return schemas.LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        role=user.role,
    )


# ── Public signup ─────────────────────────────────────
@router.post("/signup", response_model=schemas.LoginResponse)
def signup(request: schemas.SignupRequest, db: Session = Depends(get_db)):
    name = request.name.strip()
    email = request.email.strip().lower()

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email.")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Optional domain restriction
    if SIGNUP_ALLOWED_DOMAINS:
        domain = email.split("@")[-1]
        if domain not in SIGNUP_ALLOWED_DOMAINS:
            allowed = ", ".join(f"@{d}" for d in SIGNUP_ALLOWED_DOMAINS)
            raise HTTPException(status_code=403, detail=f"Sign-up is restricted to: {allowed}")

    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = models.User(
        email=email,
        password_hash=auth.hash_password(request.password),
        name=name,
        role="employee",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_token(user.id)
    return schemas.LoginResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        role=user.role,
    )


# ── Forgot password — generate reset link ─────────────
@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Always returns success (don't leak whether email exists).
    If the email is real, a reset link is created.
    """
    email = request.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()

    if user:
        # Invalidate any prior unused tokens for this user
        db.query(models.PasswordReset).filter(
            models.PasswordReset.user_id == user.id,
            models.PasswordReset.used == False,
        ).update({"used": True})

        token = secrets.token_urlsafe(32)
        reset = models.PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=RESET_TOKEN_TTL_HOURS),
            used=False,
        )
        db.add(reset)
        db.commit()

        link = f"{RESET_LINK_BASE}/{token}"

        # Try to send email via SMTP. Falls back to console log if not configured.
        sent_via_email = False
        if email_configured():
            try:
                subject, html = password_reset_email(user.name, link)
                sent_via_email = send_email(user.email, subject, html)
            except Exception as e:
                print(f"[email] Failed to send reset email to {user.email}: {e}")
                sent_via_email = False

        if not sent_via_email:
            # Dev / fallback mode: print to logs so admin can hand the link over
            print("\n" + "=" * 70)
            print(f"PASSWORD RESET REQUESTED for: {user.email}")
            print(f"(SMTP not configured or failed — copy-paste this link manually)")
            print(f"Expires in {RESET_TOKEN_TTL_HOURS}h:")
            print(f"  {link}")
            print("=" * 70 + "\n")

    return {"status": "ok", "message": "If that email exists, a reset link has been sent."}


# ── Verify a reset token before showing the form ──────
@router.get("/reset-password/{token}/check", response_model=schemas.ResetPasswordTokenCheck)
def check_reset_token(token: str, db: Session = Depends(get_db)):
    reset = _lookup_valid_token(token, db)
    if not reset:
        return schemas.ResetPasswordTokenCheck(valid=False)
    user = db.query(models.User).filter(models.User.id == reset.user_id).first()
    return schemas.ResetPasswordTokenCheck(valid=True, email=user.email if user else None)


# ── Apply the new password ────────────────────────────
@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    reset = _lookup_valid_token(request.token, db)
    if not reset:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    user = db.query(models.User).filter(models.User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Account no longer exists.")

    user.password_hash = auth.hash_password(request.new_password)
    reset.used = True
    db.commit()

    return {"status": "ok"}


def _lookup_valid_token(token: str, db: Session):
    reset = db.query(models.PasswordReset).filter(models.PasswordReset.token == token).first()
    if not reset or reset.used:
        return None
    if reset.expires_at < datetime.utcnow():
        return None
    return reset
