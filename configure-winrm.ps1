# WinRM Configuration Script for LANtern Remote Screenshot
# Run this script as Administrator on both the LANtern control machine and target machines

Write-Host "Configuring WinRM for LANtern Remote Screenshots..." -ForegroundColor Green

# 1. Configure WinRM on the control machine (LANtern server)
Write-Host "`n=== Configuring Control Machine (LANtern Server) ===" -ForegroundColor Yellow

# Enable WinRM service
Enable-PSRemoting -Force -SkipNetworkProfileCheck

# Configure WinRM to allow unencrypted traffic (for local network)
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/client '@{AllowUnencrypted="true"}'

# Set authentication methods
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/client/auth '@{Basic="true"}'

# Add target machines to trusted hosts (replace with your actual IP range)
# You'll need to run this for each target machine IP
Write-Host "Adding target machines to TrustedHosts..." -ForegroundColor Cyan
$targetIPs = @("192.168.20.56") # Add more IPs as needed

foreach ($ip in $targetIPs) {
    $currentHosts = (Get-Item WSMan:\localhost\Client\TrustedHosts).Value
    if ($currentHosts -eq "" -or $currentHosts -eq $null) {
        Set-Item WSMan:\localhost\Client\TrustedHosts -Value $ip -Force
    } else {
        if ($currentHosts -notlike "*$ip*") {
            Set-Item WSMan:\localhost\Client\TrustedHosts -Value "$currentHosts,$ip" -Force
        }
    }
    Write-Host "Added $ip to TrustedHosts" -ForegroundColor Green
}

# 2. Configure Windows Firewall for WinRM
Write-Host "`n=== Configuring Firewall ===" -ForegroundColor Yellow
netsh advfirewall firewall add rule name="WinRM-HTTP-In-Private" dir=in action=allow protocol=TCP localport=5985 profile=private
netsh advfirewall firewall add rule name="WinRM-HTTP-In-Domain" dir=in action=allow protocol=TCP localport=5985 profile=domain
netsh advfirewall firewall add rule name="WinRM-HTTPS-In-Private" dir=in action=allow protocol=TCP localport=5986 profile=private
netsh advfirewall firewall add rule name="WinRM-HTTPS-In-Domain" dir=in action=allow protocol=TCP localport=5986 profile=domain

Write-Host "`n=== Configuration Complete ===" -ForegroundColor Green
Write-Host "WinRM Service Status:" -ForegroundColor Cyan
Get-Service WinRM

Write-Host "`nTrustedHosts Configuration:" -ForegroundColor Cyan
Get-Item WSMan:\localhost\Client\TrustedHosts

Write-Host "`nWinRM Configuration:" -ForegroundColor Cyan
winrm get winrm/config

Write-Host "`n=== IMPORTANT NOTES ===" -ForegroundColor Red
Write-Host "1. Run this same script on ALL target machines (remote PCs)"
Write-Host "2. Ensure the user account on target machines:"
Write-Host "   - Has administrative privileges"
Write-Host "   - Has a password set (not blank)"
Write-Host "   - Is enabled for remote access"
Write-Host "3. Test the connection with: Test-WSMan -ComputerName TARGET_IP"
Write-Host "4. If still failing, try: Test-WSMan -ComputerName TARGET_IP -Authentication Basic -Credential (Get-Credential)"
