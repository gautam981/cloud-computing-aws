# PowerShell script to fix CreateVoiceRoomHandler environment variables
# Run this if the voice chat is stuck on "Creating voice room..."

Write-Host "Checking CreateVoiceRoomHandler configuration..." -ForegroundColor Cyan

# Get current configuration
Write-Host "`nCurrent environment variables:" -ForegroundColor Yellow
aws lambda get-function-configuration --function-name CreateVoiceRoomHandler --query 'Environment.Variables' --output json

Write-Host "`nCurrent timeout:" -ForegroundColor Yellow
aws lambda get-function-configuration --function-name CreateVoiceRoomHandler --query 'Timeout' --output text

Write-Host "`nCurrent memory:" -ForegroundColor Yellow
aws lambda get-function-configuration --function-name CreateVoiceRoomHandler --query 'MemorySize' --output text

# Ask if user wants to fix
Write-Host "`n" -NoNewline
$fix = Read-Host "Do you want to update the configuration? (y/n)"

if ($fix -eq 'y') {
    Write-Host "`nUpdating environment variables..." -ForegroundColor Green
    aws lambda update-function-configuration `
      --function-name CreateVoiceRoomHandler `
      --environment "Variables={CONNECTIONS_TABLE=ChatConnections,ROOMS_TABLE=ChatRooms,VOICE_ROOMS_TABLE=VoiceRooms}"
    
    Write-Host "`nUpdating timeout to 30 seconds..." -ForegroundColor Green
    aws lambda update-function-configuration `
      --function-name CreateVoiceRoomHandler `
      --timeout 30
    
    Write-Host "`n✅ Configuration updated!" -ForegroundColor Green
    Write-Host "Now try creating a voice room again in the browser." -ForegroundColor Cyan
} else {
    Write-Host "`nNo changes made." -ForegroundColor Yellow
}
