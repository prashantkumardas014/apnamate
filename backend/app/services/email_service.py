# backend/app/services/email_service.py
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta

from jinja2 import Environment, FileSystemLoader, select_autoescape


# ==============================
# CONFIG
# ==============================

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"

SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ApnaMate")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)

SUPPORT_URL = os.getenv("SUPPORT_URL", "mailto:support@apnamate.local")

# Templates folder — resolves to backend/app/templates/emails/
TEMPLATE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "templates", "emails"
)

_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


def render_template(template_name: str, **kwargs) -> str:
    """Render an email template from app/templates/emails/."""
    # Always provide common defaults
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
    """Return how many emails were sent to this address in the last N hours."""
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
# SEND EMAIL
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
    Send an email via SMTP. Returns:
      {"success": bool, "error": str | None}

    - attachments: list of dicts with keys: data (bytes), maintype, subtype, filename
    - db: SQLAlchemy Session — if passed, an EmailLog row is written
    """
    result = {"success": False, "error": None}

    # ----- Rate limit -----
    if db is not None and _recent_email_count(db, to_email, hours=1) >= 5:
        result["error"] = "Rate limit: too many emails to this address in the last hour"
        print(f"Rate limited: {to_email}")
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
            print(f"EmailLog create failed: {e}")
            log = None

    # ----- SMTP not configured? skip real send -----
    if not _smtp_configured():
        msg = "SMTP not configured — email skipped"
        print(msg)
        if log is not None:
            log.status = "failed"
            log.error = msg
            db.commit()
        result["error"] = msg
        return result

    try:
        # Build MIME
        msg = MIMEMultipart("mixed")
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        # Body: alternative text + html
        alt = MIMEMultipart("alternative")
        if text_body:
            alt.attach(MIMEText(text_body, "plain", "utf-8"))
        alt.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(alt)

        # Attachments
        if attachments:
            for att in attachments:
                part = MIMEApplication(att["data"], _subtype=att.get("subtype", "pdf"))
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=att.get("filename", "attachment.pdf"),
                )
                msg.attach(part)

        # Connect
        if SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)
            server.ehlo()
            if SMTP_USE_TLS:
                server.starttls()
                server.ehlo()

        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()

        print(f"Email sent to {to_email}")
        result["success"] = True

        if log is not None:
            log.status = "sent"
            log.sent_at = datetime.now()
            db.commit()

    except Exception as e:
        err = str(e)
        print(f"Email failed to {to_email}: {err}")
        result["error"] = err
        if log is not None:
            log.status = "failed"
            log.error = err
            db.commit()

    return result
