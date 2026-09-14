# backend/app/services/email_service.py
"""
Email delivery via Brevo HTTP API (bypasses Render's SMTP block).
"""
import os
import base64
import requests
from datetime import datetime, timedelta

from jinja2 import Environment, FileSystemLoader, select_autoescape


# ==============================
# CONFIG
# ==============================

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ApnaMate")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER", ""))
SUPPORT_URL = os.getenv("SUPPORT_URL", "mailto:support@apnamate.local")

TEMPLATE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "templates", "emails"
)

_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _brevo_configured() -> bool:
    return bool(BREVO_API_KEY and SMTP_FROM_EMAIL)


def render_template(template_name: str, **kwargs) -> str:
    """Render an email template from app/templates/emails/."""
    kwargs.setdefault("subject", "ApnaMate Notification")
    kwargs.setdefault("subtitle", "")
    kwargs.setdefault("content", "")
    kwargs.setdefault("support_url", SUPPORT_URL)
    tpl = _env.get_template(template_name)
    return tpl.render(**kwargs)


# ==============================
# RATE LIMIT (per recipient)
# ==============================

def _recent_email_count(db, to_email: str, hours: int = 1) -> int:
    if db is None:
        return 0
    try:
        from app.models import EmailLog
        cutoff = datetime.now() - timedelta(hours=hours)
        return (
            db.query(EmailLog)
            .filter(EmailLog.to_email == to_email, EmailLog.created_at > cutoff)
            .count()
        )
    except Exception:
        return 0


# ==============================
# SEND EMAIL (Brevo)
# ==============================

def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str = None,
    attachments: list = None,
    db=None,
    template: str = "generic",
    bill_id: int = None,
    booking_id: int = None,
):
    """
    Send email via Brevo HTTP API.
    Returns: {"success": bool, "error": str|None}

    - attachments: list of dicts {data: bytes, filename: str, subtype: "pdf"}
    - db: SQLAlchemy Session — logs to EmailLog table
    """
    result = {"success": False, "error": None}

    # ----- Rate limit -----
    if db is not None and _recent_email_count(db, to_email, hours=1) >= 5:
        result["error"] = "Rate limit: too many emails to this address in the last hour"
        print(f"⚠️ Rate limited: {to_email}")
        return result

    # ----- Log row (pending) -----
    log = None
    if db is not None:
        try:
            from app.models import EmailLog
            log = EmailLog(
                to_email=to_email,
                subject=subject,
                template=template,
                status="pending",
                bill_id=bill_id,
                booking_id=booking_id,
                created_at=datetime.now(),
            )
            db.add(log)
            db.commit()
            db.refresh(log)
        except Exception as e:
            print(f"⚠️ EmailLog create failed: {e}")
            log = None

    # ----- Brevo not configured? skip -----
    if not _brevo_configured():
        msg = "BREVO_API_KEY or SMTP_FROM_EMAIL not set — email skipped"
        print(f"⚠️ {msg}")
        if log is not None:
            log.status = "failed"
            log.error = msg
            db.commit()
        result["error"] = msg
        return result

    # ----- Build Brevo payload -----
    payload = {
        "sender": {
            "name": SMTP_FROM_NAME,
            "email": SMTP_FROM_EMAIL,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }

    if text_body:
        payload["textContent"] = text_body

    # Attachments — Brevo expects base64-encoded content
    if attachments:
        payload["attachment"] = []
        for att in attachments:
            try:
                payload["attachment"].append({
                    "content": base64.b64encode(att["data"]).decode("utf-8"),
                    "name": att.get("filename", "attachment.pdf"),
                })
            except Exception as e:
                print(f"⚠️ Attachment encode failed: {e}")

    # ----- Call Brevo API -----
    try:
        response = requests.post(
            BREVO_API_URL,
            headers={
                "accept": "application/json",
                "api-key": BREVO_API_KEY,
                "content-type": "application/json",
            },
            json=payload,
            timeout=20,
        )

        if response.status_code in (200, 201, 202):
            print(f"✅ Email sent via Brevo to {to_email}")
            result["success"] = True

            if log is not None:
                log.status = "sent"
                log.sent_at = datetime.now()
                db.commit()
        else:
            err = f"Brevo {response.status_code}: {response.text[:300]}"
            print(f"❌ {err}")
            result["error"] = err

            if log is not None:
                log.status = "failed"
                log.error = err
                db.commit()

    except requests.exceptions.Timeout:
        err = "Brevo request timed out"
        print(f"❌ {err}")
        result["error"] = err
        if log is not None:
            log.status = "failed"
            log.error = err
            db.commit()

    except Exception as e:
        err = f"Email send failed: {e}"
        print(f"❌ {err}")
        result["error"] = err
        if log is not None:
            log.status = "failed"
            log.error = err
            db.commit()

    return result