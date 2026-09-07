#!/usr/bin/env pwsh
# build-and-deploy.ps1
# Builds the frontend and copies the output into Backend/dist
# Run from the Survey_AI root: .\build-and-deploy.ps1

$ErrorActionPreference = "Stop"

$ROOT     = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND = Join-Path $ROOT "project"
$BACKEND  = Join-Path $ROOT "Backend"
$DIST_SRC = Join-Path $FRONTEND "dist"
$DIST_DST = Join-Path $BACKEND  "dist"

Write-Host ""
Write-Host "=== Step 1: Build frontend ===" -ForegroundColor Cyan
Set-Location $FRONTEND
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== Step 2: Copy dist to Backend/dist ===" -ForegroundColor Cyan
if (Test-Path $DIST_DST) { Remove-Item -Recurse -Force $DIST_DST }
Copy-Item -Recurse -Force $DIST_SRC $DIST_DST

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Frontend built and copied to Backend/dist."
Write-Host "index.html: $((Get-Item (Join-Path $DIST_DST 'index.html')).LastWriteTime)"
Write-Host "Asset count: $((Get-ChildItem (Join-Path $DIST_DST 'assets')).Count)"
Write-Host ""
Write-Host "Next: commit and push the Backend folder to deploy." -ForegroundColor Yellow
