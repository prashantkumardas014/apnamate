# start.ps1 - Simple version that works
Clear-Host
Write-Host "🚀 Starting ApnaMate Backend..." -ForegroundColor Green
Write-Host ""

# Navigate to backend
Set-Location "C:\Users\admin\ApnaMate\backend"

# Activate venv
& .\venv\Scripts\Activate.ps1

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000