$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "1. Restoring source index.html..."
Copy-Item index.source.html index.html -Force

Write-Host "2. Building web bundle..."
Remove-Item -Recurse -Force dist,assets -ErrorAction SilentlyContinue
npm run build

Write-Host "3. Copying built files to root for Nitron..."
Copy-Item dist\index.html index.html -Force
Copy-Item -Recurse dist\assets assets
Copy-Item public\favicon.svg . -Force
Copy-Item public\logo.svg . -Force
Copy-Item public\logo-white.svg . -Force
Copy-Item public\icons.svg . -Force

Write-Host "4. Building APK..."
npx nitron build

Write-Host "5. Restoring source for next build..."
Copy-Item index.source.html index.html -Force
Remove-Item -Recurse -Force assets -ErrorAction SilentlyContinue
Remove-Item -Force favicon.svg,logo.svg,logo-white.svg,icons.svg -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done. APK at: $PSScriptRoot\dist\app.apk"