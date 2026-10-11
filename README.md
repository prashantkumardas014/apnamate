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
```

API docs available at http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
ENVIRONMENT=development
DEBUG=True
HOST=127.0.0.1
PORT=8000

APP_URL=http://localhost:5173
API_URL=http://localhost:8000

SECRET_KEY=change-this-to-a-long-random-string-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

DATABASE_URL=sqlite:///./apnamate.db
# Production: postgresql://user:pass@host:5432/dbname

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

UPI_ID=yourupi@bank
UPI_PHONE=9999999999
UPI_NAME=ApnaMate

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password

BILL_SECRET=random-string
BILL_PREFIX=AM
COMMISSION_RATE=0.10

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

FAST2SMS_API_KEY=
OTP_DEV_MODE=true

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123
ADMIN_NAME=ApnaMate Admin
```

---

## Deployment

### Backend → Render

1. Push to GitHub.
2. Render → New → Web Service → connect this repo.
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (DATABASE_URL, CORS_ORIGINS=*, SECRET_KEY, SMTP credentials, admin bootstrap vars).
7. Create a PostgreSQL database (Render or Neon) and set DATABASE_URL to its connection string.

### Frontend → Vercel

1. Vercel → New Project → import this repo.
2. Root Directory: `frontend`
3. Framework Preset: Vite
4. Build Command: `npm run build` · Output Directory: `dist`

---

## Building the Android APK

The APK is built with **Nitron** — a Capacitor-based wrapper that packages the frontend into a WebView.

**Important:** Nitron packs the frontend project root, not `dist/`. The built web files must sit at the frontend root before running the APK build.

### One-command build

```powershell
cd frontend
.\build-apk.ps1
```

Output: `frontend/dist/app.apk`

### WebView Compatibility Notes

These settings are required for the APK to work — do not revert them:

| Setting | File | Why |
|---|---|---|
| HashRouter (not BrowserRouter) | src/main.jsx | WebView can't resolve path-based URLs like /dashboard |
| base: './' | vite.config.js | Absolute paths break inside the WebView origin |
| cssCodeSplit: false | vite.config.js | Per-route CSS chunks fail to preload |
| inlineDynamicImports: true | vite.config.js | React.lazy chunks fail to load |
| Static imports (no React.lazy) | src/App.jsx | Same reason |
| navigate() / hash-based redirects | all pages | window.location.href triggers a real navigation and fails |
| Relative asset paths (./logo.svg) | all components | Absolute paths don't resolve in the WebView |
| icon.png with ~15% transparent padding | project root | Android launcher masks crop edge-to-edge icons |

---

## Admin CLI

`backend/create_admin.py` manages users without going through the API:

```bash
cd backend

python create_admin.py list
python create_admin.py create-admin
python create_admin.py reset user@example.com NewPassword123
python create_admin.py custom "Name" user@example.com Password123 admin
python create_admin.py delete user@example.com
```

These commands run against whatever DATABASE_URL your .env points to.

---

## Known Constraints

- **Render free Postgres expires after 30 days.** Migrate to Neon (https://neon.tech) before then, or upgrade Render.
- **Free backend cold starts** take 30–60 seconds after idle. A GitHub Actions pinger reduces this but doesn't eliminate it.
- **APK rebuild required for every frontend change.** The web app on Vercel updates automatically on git push; the installed APK does not.
- **PDF downloads in the APK use copy-link.** Nitron's WebView has no built-in file download handler.
- **Android only.** No iOS build in the current version.

---

## Migrating to Neon

```bash
# 1. Dump from Render
pg_dump -Fc -v -d "<RENDER_EXTERNAL_URL>" --schema=public -f render_dump.bak

# 2. Create a Neon project at https://neon.tech

# 3. Restore to Neon
pg_restore -v -d "<NEON_URL>" --no-owner --no-acl render_dump.bak

# 4. Update DATABASE_URL on Render to the Neon connection string
# 5. Redeploy
```

---

## Security Notes

- Passwords are hashed with **bcrypt** (cost factor 12) and never stored in plain text.
- JWTs expire after **24 hours**. Refresh tokens are not implemented yet.
- CORS is set to `*` on Render because the Android WebView uses a non-standard origin. Tighten this before public launch.
- Never commit `backend/.env` — use `.env.example` as the template.

---

## License

Private project. All rights reserved.
