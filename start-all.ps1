# Dynamic Widget System - Start All Services

Write-Host "🚀 Starting all services..." -ForegroundColor Green

# Start backend in a new window
Write-Host "🔧 Starting backend server..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in a new window
Write-Host "🎨 Starting frontend dashboard..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm start" -WindowStyle Normal

# Wait a moment for frontend to start
Start-Sleep -Seconds 3

# Start widget in a new window
Write-Host "🧩 Starting widget demo..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PWD\widget'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ All services are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "- Backend API:    http://localhost:5000" -ForegroundColor White
Write-Host "- Frontend App:   http://localhost:3000" -ForegroundColor White
Write-Host "- Widget Demo:    http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "📝 Wait a moment for all services to fully start before accessing the URLs" -ForegroundColor Yellow
