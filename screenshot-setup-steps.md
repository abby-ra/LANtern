# Screenshot Capture Setup - Step by Step Guide

## Current Issue
The error "The handle is invalid" occurs because PowerShell remoting runs in **Session 0** (non-interactive), but screen capture requires access to the **interactive desktop session**.

## Quick Solution Steps

### Step 1: Establish RDP Connection to Target Machine
**Before taking screenshots, you need an active desktop session on the target machine:**

```bash
# From your control machine, connect to the target via RDP
mstsc /v:192.168.20.56
```

1. **Log in with the same credentials** you're using in LANtern (abby/abbi)
2. **Keep this RDP session active** (don't log out)
3. **Minimize the RDP window** but don't close it

### Step 2: Configure Target Machine for Screenshot Capture
**On the target machine (192.168.20.56), run these commands:**

```powershell
# Run as Administrator
# Allow interactive services
sc config "WinRM" type= interact

# Configure session settings to allow desktop interaction
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fSingleSessionPerUser /t REG_DWORD /d 0 /f

# Enable multiple RDP sessions (if needed)
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server\Licensing Core" /v EnableConcurrentSessions /t REG_DWORD /d 1 /f

# Restart WinRM service
Restart-Service WinRM
```

### Step 3: Alternative - Use Scheduled Task Method
**On the target machine, create a screenshot service:**

```powershell
# Create a PowerShell script for screenshot capture
$scriptContent = @'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$filename = "C:\temp\screenshot_$timestamp.png"

if (!(Test-Path "C:\temp")) { New-Item -Path "C:\temp" -ItemType Directory -Force }

$bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output $filename
'@

# Save the script
$scriptPath = "C:\temp\capture_screenshot.ps1"
$scriptContent | Out-File -FilePath $scriptPath -Encoding UTF8

# Create scheduled task that runs in interactive session
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File '$scriptPath'"
$principal = New-ScheduledTaskPrincipal -UserId "abby" -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName "LANternScreenshot" -Action $action -Principal $principal -Force

Write-Host "Screenshot task created. Test it with: Start-ScheduledTask -TaskName 'LANternScreenshot'"
```

### Step 4: Test the Setup

1. **Ensure RDP session is active** on target machine
2. **From LANtern control machine**, try taking a screenshot again
3. **Check the console** for any new error messages

## Alternative Solutions (If Above Doesn't Work)

### Option 1: VNC-Based Screenshot
Install **TightVNC** or **UltraVNC** on target machines for better remote desktop access.

### Option 2: RDP File Transfer Method
1. Use RDP to connect and take screenshots locally
2. Transfer screenshots back via shared folders or file transfer

### Option 3: Windows Service Approach
Create a Windows service that runs in the interactive session and responds to screenshot requests.

## Troubleshooting

### If Screenshots Still Fail:
1. **Check if user is logged in interactively** on target machine
2. **Verify RDP session is active** (not just services)
3. **Try taking screenshot manually** on target machine first
4. **Check Windows Event Logs** for any security/access violations

### Common Issues:
- **"Handle is invalid"** = No interactive desktop session
- **"Access denied"** = User permissions or UAC issues  
- **"Session not found"** = No active user session on target

## Next Steps
1. Apply the fixes above
2. Restart your LANtern backend server
3. Test screenshot capture with an active RDP session
4. Monitor the console for improved error messages
