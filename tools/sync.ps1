<#
.SYNOPSIS
  Sync the theme between this repo and the live Thunderbird profile.

.DESCRIPTION
  Thunderbird only ever reads from the profile chrome folder. This repo is the
  source of truth for history; the profile is what actually runs. Neither
  location is authoritative by accident, so this script never guesses:

    -Pull   profile -> repo   (capture edits made while iterating)
    -Push   repo    -> profile (deploy; requires a Thunderbird restart)

  With no switch it only reports differences and changes nothing.
  It never deletes files in either direction.

  THE ADD-ON WRITES TO THE SAME FOLDER. Since 2.0.0 the .xpi carries the
  stylesheets and deploys them to the profile on startup, so -Push is no longer
  the only thing that writes there. The deploy is gated on the add-on's own
  version (see DEPLOYING THE STYLESHEETS in extension\api.js), which means a
  -Push survives every restart until the next version bump in
  extension\manifest.json -- and that bump then overwrites the folder with
  whatever was in chrome\ at pack time. Two consequences while iterating:

    - Don't bump the add-on version mid-CSS-session; it reclaims the folder.
    - After a bump, -Push again, or run the profile on the packed copy.

  On a profile that has only ever had the .xpi installed, the chrome folder does
  not exist until the add-on has run once. The "not found" throw below means
  that, not a broken setup: start Thunderbird once, then -Push.

.EXAMPLE
  .\sync.ps1              # report only
  .\sync.ps1 -Pull
  .\sync.ps1 -Push
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

# Union of css filenames on both sides.
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
