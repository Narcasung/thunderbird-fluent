# Capture the Thunderbird main window to a timestamped PNG.
#   .\capture.ps1                 -> .fluent-shots\tb-<timestamp>.png
#   .\capture.ps1 -Name gutters   -> .fluent-shots\gutters.png
#   .\capture.ps1 -DelaySeconds 6 -> wait 6s first, so you can focus
#                                    Thunderbird and open a menu
#
# This script NEVER raises, restores or focuses Thunderbird. You put the
# window where you want it; the script only checks that it is actually the
# foreground window at the moment of capture and refuses otherwise. That
# check matters: CopyFromScreen grabs screen pixels, so with Thunderbird
# buried the result is a perfectly plausible-looking screenshot of whatever
# is on top at Thunderbird's coordinates.
param(
  [string]$Name = "",
  [int]$DelaySeconds = 0
)

Add-Type -AssemblyName System.Drawing

# A .NET type cannot be redefined in a session that already loaded it, and
# Add-Type then fails with "type name already exists". Guard the call, and
# bump the class name whenever the member list changes, or long-lived shells
# keep the stale type.
if (-not ('Win32Cap2' -as [type])) {
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Cap2 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hWnd, int attr, out RECT r, int size);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
}

$proc = Get-Process thunderbird -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { Write-Error "No Thunderbird window found."; exit 1 }
$h = $proc.MainWindowHandle

if ($DelaySeconds -gt 0) {
  Write-Output "Waiting ${DelaySeconds}s -- focus Thunderbird now (open a menu if you want one captured)."
  Start-Sleep -Seconds $DelaySeconds
}

$fg = [Win32Cap2]::GetForegroundWindow()
if ($fg -ne $h) {
  # An open menu owns the foreground while its parent stays visible, so a
  # menu capture is legitimate and must not be rejected here. Only bail when
  # the foreground belongs to a different process entirely.
  $fgProc = Get-Process | Where-Object { $_.MainWindowHandle -eq $fg } | Select-Object -First 1
  if ($fgProc -and $fgProc.Id -ne $proc.Id) {
    Write-Error "Foreground window belongs to '$($fgProc.ProcessName)', not Thunderbird -- refusing to capture the wrong window. Re-run with -DelaySeconds and click Thunderbird."
    exit 1
  }
}

# DWMWA_EXTENDED_FRAME_BOUNDS = 9. GetWindowRect includes invisible resize
# borders on Win11; the DWM frame bounds are the real visible edges.
$r = New-Object Win32Cap2+RECT
if ([Win32Cap2]::DwmGetWindowAttribute($h, 9, [ref]$r, 16) -ne 0) {
  Write-Error "DwmGetWindowAttribute failed."; exit 1
}
$w = $r.Right - $r.Left
$ht = $r.Bottom - $r.Top

$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$g.Dispose()

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($Name) { $file = Join-Path $dir "$Name.png" }
else { $file = Join-Path $dir ("tb-" + (Get-Date -Format "HHmmss") + ".png") }

$bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "saved: $file  (${w}x${ht})"
