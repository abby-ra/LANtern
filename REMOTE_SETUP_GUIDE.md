# Remote Desktop Setup Guide for LANtern

## Issue: Blue Screen When Taking Screenshots

The blue screen issue occurs when trying to capture screenshots from remote machines that aren't properly configured for remote access. Here's how to fix it:

## Remote System Setup (On Target Machines)

### 0. **CRITICAL: Configure WinRM First (New Step)**
Before proceeding with RDP setup, you MUST configure WinRM for PowerShell remoting:

1. **Run the WinRM configuration script:**
   ```powershell
   # Run as Administrator on BOTH control machine and target machines
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
   .\configure-winrm.ps1
   ```

2. **Manual WinRM configuration (if script fails):**
   ```powershell
   # Run as Administrator on target machine
   Enable-PSRemoting -Force -SkipNetworkProfileCheck
   Set-Item WSMan:\localhost\Client\TrustedHosts -Value "192.168.20.3" -Force
   winrm set winrm/config/service/auth '@{Basic="true"}'
   winrm set winrm/config/service '@{AllowUnencrypted="true"}'
   
   # Test WinRM connection from control machine:
   Test-WSMan -ComputerName TARGET_IP -Authentication Basic -Credential (Get-Credential)
   ```

3. **Verify WinRM is working:**
   ```powershell
   # From control machine, test PowerShell remoting:
   Enter-PSSession -ComputerName TARGET_IP -Credential (Get-Credential)
   ```

### 1. Enable Remote Desktop
1. **Windows 10/11:**
   - Right-click "This PC" → Properties
   - Click "Advanced system settings"
   - Under "Remote Desktop" section, select "Enable Remote Desktop"
   - Uncheck "Enable Network Level Authentication" (for compatibility)

2. **Alternative Method:**
   - Press `Win + R`, type `sysdm.cpl`
   - Go to "Remote" tab
   - Select "Enable Remote Desktop on this computer"

### 2. Configure Windows Firewall
```powershell
# Run as Administrator
# Enable Remote Desktop in Windows Firewall
netsh advfirewall firewall set rule group="Remote Desktop" new enable=yes

# Enable RDP port
netsh advfirewall firewall add rule name="RDP-In" dir=in action=allow protocol=TCP localport=3389
```

### 3. Registry Settings for Better RDP Experience
```batch
# Run as Administrator
# Prevent blank desktop on RDP
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableCAD /t REG_DWORD /d 0 /f

# Enable RDP even when locked
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f

# Disable NLA requirement
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" /v UserAuthentication /t REG_DWORD /d 0 /f
```

### 4. User Account Configuration
1. **Ensure the user account:**
   - Has a password set (blank passwords don't work with RDP)
   - Is in the "Remote Desktop Users" group
   - Has "Log on as a service" right

2. **Add user to Remote Desktop Users group:**
```powershell
# Run as Administrator
net localgroup "Remote Desktop Users" "username" /add
```

### 5. Service Configuration
```powershell
# Run as Administrator
# Enable Remote Desktop Services
sc config TermService start= auto
sc start TermService

# Enable RDP listener
sc config UmRdpService start= auto
sc start UmRdpService
```

### 6. Display Settings for Screenshot Capture
1. **Disable display power management:**
   - Control Panel → Power Options
   - Set "Turn off display" to "Never"
   - Set "Put computer to sleep" to "Never"

2. **Configure session settings:**
```batch
# Registry settings for better RDP sessions
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" /v MaxIdleTime /t REG_DWORD /d 0 /f
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" /v MaxDisconnectionTime /t REG_DWORD /d 0 /f
```

## LANtern System Setup (Control Machine)

### 1. Install Dependencies
```bash
cd backend
npm install node-rdp
npm install robotjs  # For better screenshot capabilities
```

### 2. Network Configuration
- Ensure all machines are on the same network segment
- Configure router/firewall to allow RDP traffic (port 3389)
- Test RDP connection manually using Windows Remote Desktop Connection

### 3. Update Database Schema
Run the SQL script we created:
```bash
# Navigate to your project directory
cd /d D:\Project\LANtern

# Run the database fix (if you have MySQL command line tools)
mysql -h localhost -u root -p power_management < fix_database.sql
```

## Testing the Setup

### 1. Manual RDP Test
```bash
# Test RDP connection manually
mstsc /v:TARGET_IP_ADDRESS
```

### 2. Network Connectivity Test
```bash
# Test if RDP port is open
telnet TARGET_IP_ADDRESS 3389
```

### 3. LANtern Screenshot Test
1. Start your LANtern backend server
2. Try taking a screenshot from the web interface
3. Check the console for any new errors

## Troubleshooting Common Issues

### Issue: Connection Refused
- **Solution:** Enable Remote Desktop on target machine
- **Check:** Windows Firewall settings
- **Verify:** RDP service is running

### Issue: Authentication Failed
- **Solution:** Ensure user has password and RDP permissions
- **Check:** User is in "Remote Desktop Users" group
- **Verify:** Network Level Authentication settings

### Issue: Black/Blue Screen
- **Solution:** Configure display power settings
- **Check:** Session timeout settings
- **Verify:** User session is active

### Issue: Screenshot Timeout
- **Solution:** Increase timeout values in LANtern code
- **Check:** Network latency between machines
- **Verify:** Target machine isn't overloaded

## Security Considerations

### 1. Network Security
- Use VPN for remote access outside LAN
- Configure firewall rules properly
- Consider changing default RDP port (3389)

### 2. Authentication
- Use strong passwords
- Enable Network Level Authentication when possible
- Consider certificate-based authentication

### 3. Monitoring
- Monitor RDP connections in Event Viewer
- Log authentication attempts
- Set up alerts for failed login attempts

## Alternative Solutions

If RDP continues to cause issues, consider:

1. **VNC-based solution:** Install TightVNC or UltraVNC
2. **SSH with X11 forwarding:** For Linux systems
3. **Web-based solutions:** Like noVNC or Guacamole
4. **Commercial tools:** TeamViewer, AnyDesk, etc.

## Next Steps

1. Apply the database fixes
2. Configure target machines using the steps above
3. Test RDP connectivity manually
4. Restart your LANtern backend server
5. Test screenshot functionality
