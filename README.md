# ApnaMate — Local Services on Demands

A full-stack home services marketplace that connects customers with local providers (electricians, plumbers, AC technicians, cleaners, computer/appliance repair). Quote-based pricing, admin-verified UPI payments, auto-generated PDF bills, and a working Android APK.

**Live web app:** https://apnamate.vercel.app  
**Backend API:** https://apnamate-backend-2026.onrender.com  
**API docs:** https://apnamate-backend-2026.onrender.com/docs

---

## Features

### Customer
- Register / login (email + password, optional phone OTP)
- Browse 6 service categories: Electrician, Plumber, AC Repair, Cleaning, Computer Repair, Appliance Repair
- Search providers by location
- Create booking (date, time, address, problem description)
- Accept or reject provider price quotes
- Pay via UPI (scan QR, submit UTR) or Cash on Delivery
- Download PDF bills, view booking history, leave ratings and reviews
- In-app notifications

### Provider
- Register with skills, category, experience, price range
- Receive booking requests
- Send price quotes with optional notes
- Toggle availability (Available / Busy / Offline)
- Manage payout UPI ID
- View earnings, payouts, and customer reviews

### Admin
- Platform-wide dashboard (users, bookings, revenue)
- Verify UPI payments by matching UTR against quote
- Approve or reject payments
- Manage users (block / unblock / change role / delete)
- View and moderate reviews
- Process provider payouts (mark as paid with reference)
- Full audit trail of all admin actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + React Router 7 (HashRouter) |
| Backend | FastAPI (Python 3.11+) + Uvicorn |
| Database | PostgreSQL 16 (Neon) · SQLite (local dev) |
| ORM | SQLAlchemy 2 |
| Auth | JWT (python-jose) + bcrypt |
| OTP | Fast2SMS (India) |
| Email | SMTP (Gmail) / Brevo |
| Payments | UPI (manual verification) · Cash on Delivery · Razorpay (optional) |
| PDF Generation | ReportLab |
| QR Code | qrcode + Pillow |
| APK Wrapper | Nitron (Capacitor-based) |
| Hosting | Render (backend) · Vercel (frontend) · Neon (database) |

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env           # fill in your values
uvicorn app.main:app --reload --port 8000
