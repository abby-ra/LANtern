# Target Machine WinRM Configuration
# Run this script as Administrator on the TARGET machine (192.168.20.56)

Write-Host "Configuring Target Machine for WinRM..." -ForegroundColor Green

# Enable PowerShell Remoting
Write-Host "Enabling PowerShell Remoting..." -ForegroundColor Yellow
try {
    Enable-PSRemoting -Force -SkipNetworkProfileCheck
    Write-Host "✓ PowerShell Remoting enabled" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to enable PowerShell Remoting: $($_.Exception.Message)" -ForegroundColor Red
}

# Configure WinRM settings
Write-Host "Configuring WinRM settings..." -ForegroundColor Yellow
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/client '@{AllowUnencrypted="true"}'
winrm set winrm/config/client/auth '@{Basic="true"}'

# Add control machine to trusted hosts (replace with your control machine IP)
Write-Host "Adding control machine to TrustedHosts..." -ForegroundColor Yellow
$controlMachineIP = "192.168.20.3"  # Replace with your control machine IP
Set-Item WSMan:\localhost\Client\TrustedHosts -Value $controlMachineIP -Force
Write-Host "✓ Added $controlMachineIP to TrustedHosts" -ForegroundColor Green

# Configure Windows Firewall for WinRM
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
netsh advfirewall firewall add rule name="WinRM-HTTP-In-Private" dir=in action=allow protocol=TCP localport=5985 profile=private
netsh advfirewall firewall add rule name="WinRM-HTTP-In-Domain" dir=in action=allow protocol=TCP localport=5985 profile=domain

# Ensure WinRM service is running
Write-Host "Starting WinRM service..." -ForegroundColor Yellow
Start-Service WinRM
Set-Service WinRM -StartupType Automatic

Write-Host "`n=== Configuration Complete ===" -ForegroundColor Green
Write-Host "Target machine is now configured for WinRM" -ForegroundColor Green

# Test local WinRM
Write-Host "`nTesting local WinRM..." -ForegroundColor Cyan
try {
    Test-WSMan -ComputerName localhost
    Write-Host "✓ Local WinRM test passed" -ForegroundColor Green
} catch {
    Write-Host "✗ Local WinRM test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. From control machine, test connection: Test-WSMan -ComputerName 192.168.20.56" -ForegroundColor White
Write-Host "2. Test with credentials: Test-WSMan -ComputerName 192.168.20.56 -Authentication Basic -Credential (Get-Credential)" -ForegroundColor White
