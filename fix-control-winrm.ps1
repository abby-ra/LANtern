# Control Machine WinRM Client Fix
# Run this script as Administrator on the CONTROL machine

Write-Host "Fixing WinRM Client Configuration..." -ForegroundColor Green

# Enable unencrypted traffic for client
Write-Host "Enabling unencrypted traffic..." -ForegroundColor Yellow
try {
    winrm set winrm/config/client '@{AllowUnencrypted="true"}'
    Write-Host "✓ Unencrypted traffic enabled" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to enable unencrypted traffic: $($_.Exception.Message)" -ForegroundColor Red
}

# Enable Basic authentication for client
Write-Host "Enabling Basic authentication..." -ForegroundColor Yellow
try {
    winrm set winrm/config/client/auth '@{Basic="true"}'
    Write-Host "✓ Basic authentication enabled" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to enable Basic authentication: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTesting connection to target machine..." -ForegroundColor Cyan
try {
    Test-WSMan -ComputerName 192.168.20.56
    Write-Host "✓ Basic connection test passed" -ForegroundColor Green
    
    # Test with authentication
    Write-Host "Testing with authentication..." -ForegroundColor Yellow
    $cred = Get-Credential -UserName "abby" -Message "Enter password for abby on target machine"
    Test-WSMan -ComputerName 192.168.20.56 -Authentication Basic -Credential $cred
    Write-Host "✓ Authentication test passed" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nConfiguration complete. You can now test screenshot capture." -ForegroundColor Green
