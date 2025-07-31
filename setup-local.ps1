# Dynamic Widget System - Local Setup Script

Write-Host "🚀 Setting up Dynamic Widget System locally..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host "🔍 Checking MongoDB connection..." -ForegroundColor Yellow
try {
    # Test MongoDB connection
    $mongoTest = mongo --eval "db.runCommand('ping')" --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        throw "MongoDB not accessible"
    }
} catch {
    Write-Host "❌ MongoDB is not running. Please:" -ForegroundColor Red
    Write-Host "   1. Install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host "   2. Start MongoDB service" -ForegroundColor Yellow
    Write-Host "   3. Or use MongoDB Atlas (cloud) by updating MONGODB_URI in backend/.env" -ForegroundColor Yellow
    
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location -Path "backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Set-Location -Path ".."

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location -Path "frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Set-Location -Path ".."

# Install widget dependencies
Write-Host "📦 Installing widget dependencies..." -ForegroundColor Yellow
Set-Location -Path "widget"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install widget dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Widget dependencies installed" -ForegroundColor Green
Set-Location -Path ".."

Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the backend:     cd backend && npm run dev" -ForegroundColor White
Write-Host "2. Start the frontend:    cd frontend && npm start" -ForegroundColor White
Write-Host "3. Start the widget:      cd widget && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "- Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "- Frontend App:   http://localhost:3000" -ForegroundColor White
Write-Host "- Widget Demo:    http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Open 3 separate terminal windows to run all services simultaneously" -ForegroundColor Yellow
