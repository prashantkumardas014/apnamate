$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Copy-Item index.source.html index.html -Force
Remove-Item -Recurse -Force dist,assets -ErrorAction SilentlyContinue
npm run build

Copy-Item dist\index.html index.html -Force
Copy-Item -Recurse dist\assets assets
Copy-Item public\favicon.svg . -Force
Copy-Item public\logo.svg . -Force
Copy-Item public\logo-white.svg . -Force

npx nitron build

Copy-Item index.source.html index.html -Force
Remove-Item -Recurse -Force assets -ErrorAction SilentlyContinue

Write-Host "`n✓ APK at: $PSScriptRoot\dist\app.apk" -ForegroundColor Green