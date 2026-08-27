<#
  Pushes chrome/ into the profile during development, bypassing the add-on's
  version gate. Run through PowerShell, not Bash. A "differs" report on one file
  is usually CRLF vs LF.
#>

[CmdletBinding()]
param(
  [switch]$Pull,
  [switch]$Push,
  [string]$ProfileChrome = "$env:APPDATA\Thunderbird\Profiles\jwiaz7ph.default-esr\chrome"
)

$ErrorActionPreference = 'Stop'

if ($Pull -and $Push) { throw "Choose one of -Pull or -Push, not both." }

$repoChrome = Join-Path (Split-Path $PSScriptRoot -Parent) 'chrome'

if (-not (Test-Path $repoChrome))    { throw "Repo chrome folder not found: $repoChrome" }
if (-not (Test-Path $ProfileChrome)) { throw "Profile chrome folder not found: $ProfileChrome" }

function Get-Sha { param($p) if (Test-Path $p) { (Get-FileHash $p -Algorithm SHA256).Hash } else { $null } }

$names = @(
  Get-ChildItem $repoChrome    -Filter *.css | Select-Object -ExpandProperty Name
  Get-ChildItem $ProfileChrome -Filter *.css | Select-Object -ExpandProperty Name
) | Sort-Object -Unique

$diffs = @()
foreach ($n in $names) {
  $r = Join-Path $repoChrome $n
  $p = Join-Path $ProfileChrome $n
  $rh = Get-Sha $r
  $ph = Get-Sha $p
  $state = if ($null -eq $rh)      { 'profile only' }
           elseif ($null -eq $ph)  { 'repo only' }
           elseif ($rh -ne $ph)    { 'differs' }
           else                    { 'same' }
  if ($state -ne 'same') { $diffs += [pscustomobject]@{ File = $n; State = $state } }
}

if ($diffs.Count -eq 0) { Write-Output "In sync - $($names.Count) files identical."; return }

Write-Output "Differences:"
$diffs | ForEach-Object { Write-Output ("  {0,-14} {1}" -f $_.State, $_.File) }

if (-not $Pull -and -not $Push) {
  Write-Output ""
  Write-Output "Report only. Re-run with -Pull (profile -> repo) or -Push (repo -> profile)."
  return
}

if ($Pull) { $from = $ProfileChrome; $to = $repoChrome;    $label = 'profile -> repo' }
else       { $from = $repoChrome;    $to = $ProfileChrome; $label = 'repo -> profile' }

Write-Output ""
Write-Output "Copying $label ..."
Get-ChildItem $from -Filter *.css | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $to $_.Name) -Force
  Write-Output "  $($_.Name)"
}

if ($Push) { Write-Output ""; Write-Output "Restart Thunderbird for changes to take effect - there is no hot reload." }
