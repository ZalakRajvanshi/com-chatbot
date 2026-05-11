"""
Lightweight email sender using stdlib smtplib.

Configured via env vars:
  SMTP_HOST       - smtp host (e.g. smtp-relay.brevo.com)
  SMTP_PORT       - usually 587 (TLS) or 465 (SSL)
  SMTP_USER       - smtp username
  SMTP_PASSWORD   - smtp password / app password
  SMTP_FROM       - "From" address (e.g. noreply@theproductfolks.com)
  SMTP_FROM_NAME  - friendly name (e.g. "Arova")

If any of HOST/USER/PASSWORD are missing, send_email() returns False
without raising. Caller can detect this and fall back to console logging.
"""
import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", "").strip() or SMTP_USER
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Arova").strip()


def is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    """
    Send an email. Returns True on success, False if SMTP isn't configured.
    Raises on actual SMTP errors.
    """
    if not is_configured():
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    msg["To"] = to

    if text_body is None:
        text_body = _strip_html(html_body)

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    context = ssl.create_default_context()

    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=15) as smtp:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(SMTP_FROM, [to], msg.as_string())
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.starttls(context=context)
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(SMTP_FROM, [to], msg.as_string())

    return True


def _strip_html(html: str) -> str:
    import re
    text = re.sub(r"<br\s*/?>", "\n", html)
    text = re.sub(r"</p>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


# ─────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────

def password_reset_email(name: str, reset_link: str) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    safe_name = name or "there"
    subject = "Reset your password"
    html = f"""\
<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,-apple-system,Segoe UI,sans-serif;color:#27272a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e4e4e7;overflow:hidden;">
    <tr><td style="padding:24px 28px 8px 28px;">
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:#6366f1;text-transform:uppercase;margin-bottom:6px;">Arova</div>
      <h1 style="margin:0;font-size:22px;font-weight:600;color:#18181b;">Reset your password</h1>
    </td></tr>
    <tr><td style="padding:8px 28px 8px 28px;">
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:12px 0;">
        Hi {safe_name}, we got a request to reset the password on your account. Click the button below to set a new one:
      </p>
    </td></tr>
    <tr><td align="left" style="padding:8px 28px 16px 28px;">
      <a href="{reset_link}" style="display:inline-block;padding:11px 22px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        Reset password
      </a>
    </td></tr>
    <tr><td style="padding:0 28px 16px 28px;">
      <p style="font-size:12px;line-height:1.6;color:#71717a;margin:0;">
        This link expires in <strong style="color:#27272a;">1 hour</strong> and can only be used once.
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    </td></tr>
    <tr><td style="padding:12px 28px 24px 28px;border-top:1px solid #f4f4f5;">
      <p style="font-size:11px;line-height:1.5;color:#a1a1aa;margin:0;word-break:break-all;">
        If the button doesn't work, paste this link into your browser:<br>
        <a href="{reset_link}" style="color:#6366f1;">{reset_link}</a>
      </p>
    </td></tr>
  </table>
  <div style="font-size:11px;color:#a1a1aa;margin-top:14px;">© Arova · Communication Practice</div>
</td></tr>
</table>
</body></html>"""
    return subject, html
