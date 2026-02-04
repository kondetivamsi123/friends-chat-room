# Update Backend URL Script
# Run this after deploying backend to Render

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Friends Chat Room - Update Backend URL" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = Read-Host "Enter your Render backend URL (e.g., https://friends-chat-backend-xxxx.onrender.com)"

if ($backendUrl -eq "") {
    Write-Host "Error: URL cannot be empty!" -ForegroundColor Red
    exit 1
}

# Remove trailing slash if present
$backendUrl = $backendUrl.TrimEnd('/')

Write-Host ""
Write-Host "Updating api.js with backend URL: $backendUrl" -ForegroundColor Yellow

$apiFile = "frontend_chat/src/services/api.js"
$content = Get-Content $apiFile -Raw

# Replace the baseURL line
$newContent = $content -replace "baseURL: '',", "baseURL: '$backendUrl',"

Set-Content $apiFile $newContent

Write-Host "✅ Updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run these commands:" -ForegroundColor Cyan
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'Update backend URL'" -ForegroundColor White
Write-Host "  git push" -ForegroundColor White
Write-Host ""
