<!-- ═══════════════════════════════════════════════════════════════ -->
<!--                        APNAMATE README                          -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2563eb,50:1e40af,100:0f172a&height=240&section=header&text=ApnaMate&fontSize=80&fontColor=ffffff&animation=twinkling&fontAlignY=32&desc=Local%20Services%20on%20Demand&descAlignY=52&descSize=20&descAlign=50" width="100%"/>

<a href="https://apnamate.vercel.app">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=22&duration=2800&pause=1000&color=2563EB&center=true&vCenter=true&width=700&lines=Home+Services+Marketplace;Quote-Based+Pricing+%E2%80%A2+Admin-Verified+Payments;Built+on+React+%2B+FastAPI+%2B+PostgreSQL" alt="Typing SVG" />
</a>

<br/><br/>

<a href="https://apnamate.vercel.app">
  <img src="https://img.shields.io/badge/🌐_Live_App-Explore_Now-2563eb?style=for-the-badge&logoColor=white" alt="Live App" />
</a>
<a href="https://apnamate-backend-2026.onrender.com">
  <img src="https://img.shields.io/badge/⚙️_Backend-API-16a34a?style=for-the-badge&logoColor=white" alt="Backend" />
</a>
<a href="https://apnamate-backend-2026.onrender.com/docs">
  <img src="https://img.shields.io/badge/📚_Docs-Swagger-9333ea?style=for-the-badge&logoColor=white" alt="Docs" />
</a>
<a href="https://github.com/prashantkumardas014/apnamate">
  <img src="https://img.shields.io/github/stars/prashantkumardas014/apnamate?style=for-the-badge&logo=github&color=f59e0b&label=Stars" alt="Stars" />
</a>

</div>

<br/>

<div align="center">

<!-- ─── Tech Stack ─────────────────────────────────────────────── -->

### 🧰 Built With

<p>
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Router_7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLAlchemy_2-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white" />
  <img src="https://img.shields.io/badge/Uvicorn-4B5563?style=for-the-badge&logo=gunicorn&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/ReportLab-FF6B6B?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" />
  <img src="https://img.shields.io/badge/Nitron-3DDC84?style=for-the-badge&logo=capacitor&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
</p>

</div>

---

<!-- ─── Overview ────────────────────────────────────────────────── -->

## 📌 Overview

**ApnaMate** is a production-ready home services marketplace that connects customers with verified local providers — electricians, plumbers, AC technicians, cleaners, and computer/appliance repair specialists.

The platform solves a genuine problem in India's informal service economy: **finding trusted providers quickly, agreeing on a fair price, and getting a proper receipt** — all of which are hit-or-miss today.

> 💡 **The key insight:** Every transaction is **quote-based**. The provider proposes a price, the customer accepts, and an admin verifies the UPI payment before the booking is marked complete. No fixed price lists. No disputes. No lost receipts.

<div align="center">

| 🎯 What makes us different |
|:---|
| 💰 **10% commission** — far below Urban Company's 20–25% |
| 💬 **Quote-based pricing** — transparent, no hidden fees |
| ✅ **Admin-verified UPI payments** — protects both sides |
| 📄 **Auto-generated PDF bills** — emailed to customer AND provider |
| 📱 **Web + Android APK** — same codebase, two platforms |
| 💸 **Free-tier infrastructure** — proof that you don't need paid hosting to launch |

</div>

---

<!-- ─── Architecture ────────────────────────────────────────────── -->

## 🏗️ Architecture

```
                        ┌───────────────────────────┐
                        │       CLIENT LAYER        │
                        ├─────────────┬─────────────┤
                        │  Web (SPA)  │  Android    │
                        │  React 19   │  APK        │
                        │  HashRouter │  (Nitron)   │
                        └──────┬──────┴──────┬──────┘
                               │             │
                               └──────┬──────┘
                                      │  HTTPS · REST · JWT
                                      ▼
                        ┌───────────────────────────┐
                        │      BACKEND (FastAPI)    │
                        │  ┌─────────────────────┐  │
                        │  │  Auth · Bookings    │  │
                        │  │  Quotes · Payments  │  │
                        │  │  Bills · Reviews    │  │
                        │  │  Notifications      │  │
                        │  └─────────────────────┘  │
                        │      SQLAlchemy ORM       │
                        └─────────────┬─────────────┘
                                      │  SQL
                                      ▼
                        ┌───────────────────────────┐
                        │   PostgreSQL (Neon)       │
                        │   9 tables · indexed      │
                        └───────────────────────────┘

                        ┌───────────────────────────┐
                        │    EXTERNAL SERVICES      │
                        │  SMTP · Fast2SMS · UPI    │
                        └───────────────────────────┘
```

---

<!-- ─── Features ────────────────────────────────────────────────── -->

## ✨ Features

<div align="center">

| 👤 **Customer** | 🔧 **Provider** | 🛡️ **Admin** |
|:---|:---|:---|
| Register / login (email + phone OTP) | Register with skills, category, price range | Platform-wide dashboard |
| Browse 6 service categories | Receive booking requests | Verify UPI payments (UTR ↔ quote) |
| Search providers by location | Send price quotes with notes | Approve or reject payments |
| Create booking (date / time / address / issue) | Toggle availability (Available / Busy / Offline) | Manage users (block, unblock, change role, delete) |
| Accept or reject provider quotes | Manage payout UPI ID | Moderate reviews |
| Pay via UPI (QR + UTR) or Cash on Delivery | View earnings & payout history | Process provider payouts |
| Download PDF bills, view history | See customer reviews | Full audit log of admin actions |
| Leave ratings & reviews | — | Generate / re-send bills |

</div>

---

<!-- ─── Quick Start ─────────────────────────────────────────────── -->

## 🚀 Quick Start

### 📋 Prerequisites

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Optional-4169E1?style=flat-square&logo=postgresql&logoColor=white)

</div>

### 🐍 Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1
# Activate (macOS / Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# → edit .env with your credentials

# Run the API
uvicorn app.main:app --reload --port 8000
```

**API docs:** → http://127.0.0.1:8000/docs

### ⚛️ Frontend

```bash
cd frontend
npm install
npm run dev
```

**App:** → http://localhost:5173

### 🔐 Environment Variables

<details>
<summary><b>Click to expand the full <code>.env</code> template</b></summary>

<br/>

```env
# ─── Environment ──────────────────────────────────────────────
ENVIRONMENT=development
DEBUG=True
HOST=127.0.0.1
PORT=8000

# ─── App URLs ─────────────────────────────────────────────────
APP_URL=http://localhost:5173
API_URL=http://localhost:8000

# ─── Security / JWT ───────────────────────────────────────────
SECRET_KEY=change-this-to-a-long-random-string-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ─── Database ─────────────────────────────────────────────────
DATABASE_URL=sqlite:///./apnamate.db
# Production: postgresql://user:pass@host:5432/dbname

# ─── CORS ─────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ─── UPI ──────────────────────────────────────────────────────
UPI_ID=yourupi@bank
UPI_PHONE=9999999999
UPI_NAME=ApnaMate

# ─── Email (SMTP) ─────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password

# ─── Billing ──────────────────────────────────────────────────
BILL_SECRET=random-string
BILL_PREFIX=AM
COMMISSION_RATE=0.10

# ─── Payments (optional) ──────────────────────────────────────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# ─── SMS / OTP ────────────────────────────────────────────────
FAST2SMS_API_KEY=
OTP_DEV_MODE=true

# ─── Admin Bootstrap ──────────────────────────────────────────
# Only used the first time; never overwrites existing password.
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123
ADMIN_NAME=ApnaMate Admin
```

</details>

---

<!-- ─── Deployment ──────────────────────────────────────────────── -->

## 🌐 Deployment

<div align="center">

| Component | Platform | Configuration |
|:---:|:---:|:---|
| ⚙️ **Backend** | ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white) | Root: `backend` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| ⚛️ **Frontend** | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) | Root: `frontend` · Build: `npm run build` · Output: `dist` |
| 🗄️ **Database** | ![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square&logo=postgresql&logoColor=white) | Managed Postgres — free forever |

</div>

### Backend → Render

1. Push to GitHub
2. Render → **New → Web Service** → connect this repo
3. Set **Root Directory** to `backend`
4. Add environment variables: `DATABASE_URL`, `CORS_ORIGINS=*`, `SECRET_KEY`, SMTP credentials, admin bootstrap vars
5. Deploy

### Frontend → Vercel

1. Vercel → **New Project** → import this repo
2. Set **Root Directory** to `frontend`
3. Framework Preset: **Vite**
4. Deploy

---

<!-- ─── APK ─────────────────────────────────────────────────────── -->

## 📱 Building the Android APK

The APK is built with **Nitron** — a Capacitor-based wrapper that packages the React app into a WebView.

### One-command build

```powershell
cd frontend
.\build-apk.ps1
```

**Output:** `frontend/dist/app.apk`

### WebView Compatibility Notes

> ⚠️ These settings are **required** for the APK to work — do not revert them.

| Setting | File | Why |
|---|---|---|
| `HashRouter` (not BrowserRouter) | `src/main.jsx` | WebView can't resolve path-based URLs like `/dashboard` |
| `base: './'` | `vite.config.js` | Absolute paths break inside the WebView origin |
| `cssCodeSplit: false` | `vite.config.js` | Per-route CSS chunks fail to preload |
| `inlineDynamicImports: true` | `vite.config.js` | `React.lazy` chunks fail to load |
| Static imports (no `React.lazy`) | `src/App.jsx` | Same reason |
| `navigate()` / hash-based redirects | all pages | `window.location.href` triggers a real navigation and fails |
| Relative asset paths (`./logo.svg`) | all components | Absolute paths don't resolve in the WebView |
| `icon.png` with ~15% transparent padding | project root | Android launcher masks crop edge-to-edge icons |

---

<!-- ─── Admin CLI ───────────────────────────────────────────────── -->

## 🛠️ Admin CLI

`backend/create_admin.py` manages users without going through the API:

```bash
cd backend

# List all users
python create_admin.py list

# Create the default admin
python create_admin.py create-admin

# Reset a user's password
python create_admin.py reset user@example.com NewPassword123

# Create a custom user
python create_admin.py custom "Name" user@example.com Password123 admin

# Delete a user
python create_admin.py delete user@example.com
```

> ⚠️ These commands run against whatever `DATABASE_URL` your `.env` points to.

---

<!-- ─── Constraints ─────────────────────────────────────────────── -->

## ⚠️ Known Constraints

<div align="center">

| # | Constraint | Impact |
|:---:|:---|:---|
| 1 | 🕐 **Render free Postgres expires after 30 days** | Migrate to Neon before then |
| 2 | ❄️ **Free backend cold starts** (30–60s) | Pinger reduces, doesn't eliminate |
| 3 | 🔄 **APK rebuild required per frontend change** | Web auto-deploys; APK does not |
| 4 | 📄 **PDF downloads in APK use copy-link** | WebView has no download handler |
| 5 | 📱 **Android only** | No iOS build yet |

</div>

---

<!-- ─── Migration Guide ─────────────────────────────────────────── -->

## 🔄 Migrating to Neon

<details>
<summary><b>Click to expand the migration steps</b></summary>

<br/>

```bash
# 1. Dump the current Render database
pg_dump -Fc -v -d "<RENDER_EXTERNAL_URL>" --schema=public -f render_dump.bak

# 2. Create a Neon project at https://neon.tech
#    Copy the connection string

# 3. Restore to Neon
pg_restore -v -d "<NEON_URL>" --no-owner --no-acl render_dump.bak

# 4. Update DATABASE_URL on Render to the Neon connection string
# 5. Redeploy
```

</details>

---

<!-- ─── Security ────────────────────────────────────────────────── -->

## 🔐 Security

- ✅ Passwords hashed with **bcrypt** (cost factor 12)
- ✅ JWTs expire after **24 hours**
- ✅ Role-based access control on both frontend and backend
- ✅ CORS restricted on production (currently `*` for WebView compatibility — tighten before public launch)
- ✅ Never commit `backend/.env` — use `.env.example` as the template

---

<!-- ─── Footer ──────────────────────────────────────────────────── -->

<div align="center">

<br/>

### 🙌 Contribute

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

<br/>

### 📬 Connect

[![GitHub](https://img.shields.io/badge/GitHub-prashantkumardas014-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/prashantkumardas014)
[![Email](https://img.shields.io/badge/Email-pd5935306@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:pd5935306@gmail.com)

<br/>

<sub><b>© 2026 ApnaMate · Private project · All rights reserved.</b></sub>

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,50:1e40af,100:2563eb&height=120&section=footer" width="100%"/>

</div>
