@echo off
:: ============================================
:: ApnaMate Backend Startup Script (Windows)
:: ============================================

echo ============================================
echo 🚀 Starting ApnaMate Backend
echo ============================================
echo.

:: Change to backend directory
cd /d "C:\Users\admin\ApnaMate\backend"

:: Check if virtual environment exists
if not exist "venv\" (
    echo ❌ Virtual environment not found!
    echo.
    echo Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created!
    echo.
)

:: Activate virtual environment
echo 📦 Activating virtual environment...
call venv\Scripts\activate.bat

:: Check if requirements are installed
echo.
echo 📋 Checking dependencies...
pip show fastapi > nul 2>&1
if errorlevel 1 (
    echo ❌ Dependencies not installed!
    echo.
    echo Installing requirements...
    pip install -r requirements.txt
    echo ✅ Dependencies installed!
) else (
    echo ✅ Dependencies already installed
)

:: Check if .env file exists
echo.
if not exist ".env" (
    echo ❌ .env file not found!
    echo.
    echo Creating default .env file...
    (
        echo DATABASE_URL=sqlite:///./apnamate.db
        echo SECRET_KEY=your-super-secret-key-change-this-in-production
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo.
        echo # Email Configuration ^(Optional^)
        echo SENDGRID_API_KEY=your-sendgrid-api-key
        echo FROM_EMAIL=noreply@apnamate.com
    ) > .env
    echo ✅ .env file created!
) else (
    echo ✅ .env file found
)

:: Check if database exists
echo.
if not exist "apnamate.db" (
    echo 📦 Creating database...
    python -c "import sqlite3; conn = sqlite3.connect('apnamate.db'); conn.close()"
    echo ✅ Database created!
) else (
    echo ✅ Database already exists
)

:: Update database schema
echo.
echo 🔧 Updating database schema...
python -c "from app.database import engine; from app import models; models.Base.metadata.create_all(bind=engine); print('✅ Database tables created')"

:: Check if database needs column updates
echo.
echo 📊 Checking database columns...
python -c "
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
db_path = os.getenv('DATABASE_URL', 'sqlite:///./apnamate.db').replace('sqlite:///', '')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check bookings table
cursor.execute('PRAGMA table_info(bookings)')
cols = [c[1] for c in cursor.fetchall()]
if 'created_at' not in cols:
    cursor.execute('ALTER TABLE bookings ADD COLUMN created_at TIMESTAMP')
    cursor.execute('UPDATE bookings SET created_at = CURRENT_TIMESTAMP')
    print('✅ Added created_at to bookings')
if 'updated_at' not in cols:
    cursor.execute('ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP')
    print('✅ Added updated_at to bookings')

# Check notifications table
cursor.execute('PRAGMA table_info(notifications)')
cols = [c[1] for c in cursor.fetchall()]
if 'created_at' not in cols:
    cursor.execute('ALTER TABLE notifications ADD COLUMN created_at TIMESTAMP')
    cursor.execute('UPDATE notifications SET created_at = CURRENT_TIMESTAMP')
    print('✅ Added created_at to notifications')
if 'updated_at' not in cols:
    cursor.execute('ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP')
    print('✅ Added updated_at to notifications')

conn.commit()
conn.close()
"

echo.
echo ============================================
echo ✅ All checks passed!
echo 🌐 Starting server...
echo ============================================
echo.
echo 📚 API Docs: http://localhost:8000/docs
echo 🏥 Health Check: http://localhost:8000/health
echo.
echo Press Ctrl+C to stop the server
echo ============================================
echo.

:: Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

:: If server stops, pause to see error
pause