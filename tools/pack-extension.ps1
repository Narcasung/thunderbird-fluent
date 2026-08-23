<#
.SYNOPSIS
  Build the Fluent 2 Transparency Bridge into an installable .xpi.

.DESCRIPTION
  The theme is CSS everywhere except one thing: content tabs cannot sit on the
  Mica backdrop without an attribute on their <browser>, and CSS sets no
  attributes. The add-on in ..\extension sets it, and nothing else. See the
  header of extension\api.js for why it has to be an add-on at all.

  This build is deliberately trivial -- an .xpi is a zip with the manifest at
  its ROOT, not inside a folder, which is the one thing that is easy to get
  wrong and gives an unhelpful "corrupt" error on install.

  Signing is not needed on this build: xpinstall.signatures.required defaults
  to false (greprefs.js) and MOZ_REQUIRE_SIGNING is false, which is also what
  lets an unsigned add-on use an Experiment API at all
  (AddonSettings.sys.mjs gates EXPERIMENTS_ENABLED on exactly that).

  INSTALL: Add-ons Manager > gear > Install Add-on From File, pick the .xpi,
  then restart Thunderbird. Re-running this after an edit overwrites the .xpi;
  bump "version" in extension\manifest.json so the install replaces rather
  than refuses.

.EXAMPLE
  .\pack-extension.ps1
#>
[CmdletBinding()]
param(
  [string]$OutDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist')
)

$ErrorActionPreference = 'Stop'

$source = Join-Path (Split-Path $PSScriptRoot -Parent) 'extension'
if (-not (Test-Path $source)) { throw "Extension source not found: $source" }

$manifestPath = Join-Path $source 'manifest.json'
if (-not (Test-Path $manifestPath)) { throw "No manifest.json in $source" }

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version  = $manifest.version
$id       = $manifest.browser_specific_settings.gecko.id

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$xpi = Join-Path $OutDir 'fluent-transparency.xpi'
if (Test-Path $xpi) { Remove-Item $xpi -Force }

# Compress-Archive on the folder itself would nest everything one level down.
# The wildcard keeps the manifest at the archive root, where the loader wants it.
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $xpi -CompressionLevel Optimal

$size = [math]::Round((Get-Item $xpi).Length / 1KB, 1)
Write-Host ""
Write-Host "  built  $xpi  ($size KB)"
Write-Host "  id     $id"
Write-Host "  ver    $version"
Write-Host ""
Write-Host "  Install: Add-ons Manager > gear > Install Add-on From File, then restart."
Write-Host ""
