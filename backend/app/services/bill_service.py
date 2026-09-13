# backend/app/services/bill_service.py
import os
import hmac
import hashlib
from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)


# ==============================
# CONFIG
# ==============================

BILL_SECRET = os.getenv("BILL_SECRET", "change-me-in-prod")
BRAND_BLUE = colors.HexColor("#2563eb")
BRAND_LIGHT = colors.HexColor("#eff6ff")
BRAND_GREEN = colors.HexColor("#16a34a")
TEXT_DARK = colors.HexColor("#334155")
TEXT_MUTED = colors.HexColor("#64748b")
BORDER = colors.HexColor("#cbd5e1")
BORDER_LIGHT = colors.HexColor("#e2e8f0")
BG_SOFT = colors.HexColor("#f8fafc")


# ==============================
# BILL NUMBER
# ==============================

def generate_bill_number(booking_id: int) -> str:
    """AM-YYYYMMDD-BKID-HHMMSS"""
    now = datetime.now()
    return f"AM-{now.strftime('%Y%m%d')}-{booking_id}-{now.strftime('%H%M%S')}"


def sign_bill(bill_number: str, amount: float) -> str:
    """Short HMAC signature — helps admins spot tampering."""
    msg = f"{bill_number}:{amount:.2f}".encode()
    return hmac.new(BILL_SECRET.encode(), msg, hashlib.sha256).hexdigest()[:16]


# ==============================
# HELPERS
# ==============================

def _rupees(v) -> str:
    try:
        return f"{float(v):,.2f}"
    except Exception:
        return "0.00"


def _fmt_date(v) -> str:
    if not v:
        return "-"
    if isinstance(v, datetime):
        return v.strftime("%d %b %Y, %I:%M %p")
    # Try parsing YYYY-MM-DD
    try:
        return datetime.strptime(str(v), "%Y-%m-%d").strftime("%d %b %Y")
    except Exception:
        return str(v)


def _styles():
    ss = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle("brand", parent=ss["Heading1"],
                                fontSize=20, textColor=colors.white, spaceAfter=0),
        "brand_sub": ParagraphStyle("brand_sub", parent=ss["Normal"],
                                    fontSize=9, textColor=colors.HexColor("#dbeafe"),
                                    spaceAfter=0, alignment=2),
        "title": ParagraphStyle("title", parent=ss["Heading2"],
                                fontSize=14, textColor=TEXT_DARK, spaceAfter=4),
        "body": ParagraphStyle("body", parent=ss["Normal"],
                               fontSize=10, textColor=TEXT_DARK, leading=14),
        "muted": ParagraphStyle("muted", parent=ss["Normal"],
                                fontSize=9, textColor=TEXT_MUTED, leading=12),
        "label": ParagraphStyle("label", parent=ss["Normal"],
                                fontSize=8.5, textColor=BRAND_BLUE),
        "label_w": ParagraphStyle("label_w", parent=ss["Normal"],
                                  fontSize=9, textColor=colors.white),
        "amount_big": ParagraphStyle("amount_big", parent=ss["Normal"],
                                     fontSize=22, textColor=BRAND_GREEN,
                                     leading=26, alignment=2),
    }


def _header(bill, title_text, subtitle_text, st):
    """Blue header bar with brand on left, bill # + date on right."""
    header = Table(
        [[
            Paragraph("🔧 ApnaMate", st["brand"]),
            Paragraph(
                f"<b>{title_text}</b><br/>{subtitle_text}<br/>"
                f"Bill <b>{bill.bill_number}</b><br/>"
                f"Issued: {_fmt_date(bill.issued_at)}",
                st["brand_sub"],
            ),
        ]],
        colWidths=[90 * mm, 84 * mm],
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_BLUE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return header


def _info_row(label, value, st):
    return [Paragraph(f"<b>{label}</b>", st["body"]), Paragraph(str(value), st["body"])]


# ==============================
# CUSTOMER-FACING PDF
# ==============================

def generate_customer_bill_pdf(bill) -> bytes:
    """
    Customer receipt/invoice.
    Shows: service, provider, dates, amount paid, UTR, bill number.
    Hides:  commission, net-to-provider, quoted-vs-paid breakdown.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"ApnaMate Bill {bill.bill_number}",
        author="ApnaMate",
    )
    st = _styles()
    story = []

    # Header
    story.append(_header(
        bill,
        "PAYMENT RECEIPT",
        "Thank you for your payment",
        st,
    ))
    story.append(Spacer(1, 14))

    # Big green amount
    story.append(Paragraph("Amount Paid", st["muted"]))
    story.append(Paragraph(f"Rs. {_rupees(bill.paid_amount)}", st["amount_big"]))
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT))
    story.append(Spacer(1, 12))

    # Booked for
    story.append(Paragraph("Customer", st["title"]))
    story.append(Spacer(1, 4))
    cust = Table(
        [[
            Paragraph("Name", st["label"]),
            Paragraph("Email", st["label"]),
        ], [
            Paragraph(str(bill.customer_name or "-"), st["body"]),
            Paragraph(str(bill.customer_email or "-"), st["body"]),
        ]],
        colWidths=[87 * mm, 87 * mm],
    )
    cust.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(cust)
    story.append(Spacer(1, 16))

    # Service details
    story.append(Paragraph("Service Details", st["title"]))
    story.append(Spacer(1, 6))

    rows = [
        ["Booking ID", f"#{bill.booking_id}"],
        ["Service", bill.service or "-"],
        ["Service Provider", bill.provider_name or "—"],
        ["Scheduled Date", _fmt_date(bill.booking_date)],
        ["Payment Method", (bill.gateway or "-").upper()],
        ["Transaction Ref (UTR)", bill.utr_number or "-"],
    ]
    svc = Table(
        [_info_row(k, v, st) for k, v in rows],
        colWidths=[55 * mm, 119 * mm],
    )
    svc.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("BACKGROUND", (0, 0), (0, -1), BG_SOFT),
    ]))
    story.append(svc)
    story.append(Spacer(1, 16))

    # Payment summary (customer view — single line)
    story.append(Paragraph("Payment Summary", st["title"]))
    story.append(Spacer(1, 6))

    summary = Table(
        [
            [Paragraph("<b>Description</b>", st["label_w"]),
             Paragraph("<b>Amount (INR)</b>", ParagraphStyle("r", parent=st["label_w"], alignment=2))],
            [Paragraph(f"{bill.service or 'Service'} — Booking #{bill.booking_id}", st["body"]),
             Paragraph(f"Rs. {_rupees(bill.paid_amount)}", st["body"])],
            [Paragraph("<b>Total Paid</b>", st["body"]),
             Paragraph(f"<b>Rs. {_rupees(bill.paid_amount)}</b>", st["body"])],
        ],
        colWidths=[130 * mm, 44 * mm],
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f0fdf4")),
        ("TEXTCOLOR", (1, 2), (1, 2), BRAND_GREEN),
    ]))
    story.append(summary)
    story.append(Spacer(1, 20))

    # Footer
    sig = sign_bill(bill.bill_number, float(bill.paid_amount or 0))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"<b>Verification signature:</b> {sig}",
        st["muted"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This is a computer-generated receipt. No signature required.<br/>"
        "For any queries, contact <font color='#2563eb'>support@apnamate.local</font>.",
        st["muted"],
    ))

    doc.build(story)
    return buf.getvalue()


# ==============================
# PROVIDER-FACING PDF
# ==============================

def generate_provider_bill_pdf(bill) -> bytes:
    """
    Provider statement.
    Shows: full breakdown — gross paid, platform fee, net payout.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"ApnaMate Payout {bill.bill_number}",
        author="ApnaMate",
    )
    st = _styles()
    story = []

    story.append(_header(
        bill,
        "PAYOUT STATEMENT",
        "Payment received from customer",
        st,
    ))
    story.append(Spacer(1, 14))

    # Big green amount = net to provider
    story.append(Paragraph("Your Payout", st["muted"]))
    story.append(Paragraph(f"Rs. {_rupees(bill.net_to_provider)}", st["amount_big"]))
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT))
    story.append(Spacer(1, 12))

    # Parties
    story.append(Paragraph("Parties", st["title"]))
    story.append(Spacer(1, 4))
    parties = Table(
        [[
            Paragraph("Customer", st["label"]),
            Paragraph("You (Provider)", st["label"]),
        ], [
            Paragraph(str(bill.customer_name or "-"), st["body"]),
            Paragraph(str(bill.provider_name or "-"), st["body"]),
        ]],
        colWidths=[87 * mm, 87 * mm],
    )
    parties.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(parties)
    story.append(Spacer(1, 16))

    # Booking details
    story.append(Paragraph("Booking Details", st["title"]))
    story.append(Spacer(1, 6))
    rows = [
        ["Booking ID", f"#{bill.booking_id}"],
        ["Service", bill.service or "-"],
        ["Scheduled Date", _fmt_date(bill.booking_date)],
        ["Payment Method", (bill.gateway or "-").upper()],
        ["UTR / Ref", bill.utr_number or "-"],
    ]
    bk = Table(
        [_info_row(k, v, st) for k, v in rows],
        colWidths=[55 * mm, 119 * mm],
    )
    bk.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("BACKGROUND", (0, 0), (0, -1), BG_SOFT),
    ]))
    story.append(bk)
    story.append(Spacer(1, 16))

    # Payout breakdown
    story.append(Paragraph("Payout Breakdown", st["title"]))
    story.append(Spacer(1, 6))
    breakdown = Table(
        [
            [Paragraph("<b>Description</b>", st["label_w"]),
             Paragraph("<b>Amount (INR)</b>", ParagraphStyle("r", parent=st["label_w"], alignment=2))],
            ["Customer Paid (Gross)", f"Rs. {_rupees(bill.paid_amount)}"],
            ["Platform Fee", f"- Rs. {_rupees(bill.commission or 0)}"],
            ["Net to Provider", f"Rs. {_rupees(bill.net_to_provider or 0)}"],
        ],
        colWidths=[130 * mm, 44 * mm],
    )
    breakdown.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#f0fdf4")),
        ("TEXTCOLOR", (1, 3), (1, 3), BRAND_GREEN),
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
    ]))
    story.append(breakdown)
    story.append(Spacer(1, 16))

    story.append(Paragraph(
        "Your payout will be transferred to your registered UPI ID "
        "within 3 business days of service completion.",
        st["body"],
    ))
    story.append(Spacer(1, 20))

    sig = sign_bill(bill.bill_number, float(bill.paid_amount or 0))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>Verification signature:</b> {sig}", st["muted"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This is a computer-generated statement. No signature required.",
        st["muted"],
    ))

    doc.build(story)
    return buf.getvalue()


# ==============================
# DISPATCHER (keeps old call sites working)
# ==============================

def generate_bill_pdf(bill, role: str = "customer") -> bytes:
    """
    Backwards-compatible dispatcher.
    role="customer" → customer receipt (no commission shown)
    role="provider" → provider payout statement
    role="admin"    → provider statement (admins need full breakdown)
    """
    role = (role or "customer").lower()
    if role in ("provider", "admin"):
        return generate_provider_bill_pdf(bill)
    return generate_customer_bill_pdf(bill)
