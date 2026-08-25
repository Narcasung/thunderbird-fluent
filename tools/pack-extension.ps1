<#
.SYNOPSIS
  Build the Thunderbird Fluent add-on into an installable .xpi.

.DESCRIPTION
  Builds the whole theme into one file. The archive is ..\extension plus a
  staged copy of ..\chrome and a generated chrome-files.json index; api.js
  writes that CSS into the profile on first run, so a user installs one .xpi
  and nothing else. See DEPLOYING THE STYLESHEETS in extension\api.js for why
  the add-on deploys files rather than registering the sheets itself.

  An .xpi is a zip with the manifest at its ROOT, not inside a folder, which is
  the one thing that is easy to get wrong and gives an unhelpful "corrupt"
  error on install.

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

$chrome = Join-Path (Split-Path $PSScriptRoot -Parent) 'chrome'
if (-not (Test-Path $chrome)) { throw "Chrome folder not found: $chrome" }

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$xpi = Join-Path $OutDir 'thunderbird-fluent.xpi'
if (Test-Path $xpi) { Remove-Item $xpi -Force }

# The archive is extension\ plus a copy of chrome\, staged rather than zipped
# in place: chrome\ stays the single source of truth and the CSS is never
# duplicated in git. api.js reads it back out at runtime and writes it to the
# profile -- see DEPLOYING THE STYLESHEETS in that file.
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("fluent-pack-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $stage | Out-Null

try {
  Copy-Item (Join-Path $source '*') $stage -Recurse -Force
  Copy-Item $chrome (Join-Path $stage 'chrome') -Recurse -Force

  # The file index api.js reads, so adding a module to chrome\ needs no code
  # edit. Sorted for a reproducible archive; userChrome.css's @import order is
  # what actually sequences the cascade, not this list.
  $cssNames = Get-ChildItem $chrome -Filter *.css |
              Sort-Object Name |
              Select-Object -ExpandProperty Name
  if (-not $cssNames) { throw "No .css files in $chrome" }
  ConvertTo-Json @($cssNames) |
    Set-Content (Join-Path $stage 'chrome-files.json') -Encoding utf8NoBOM

  # Compress-Archive on the folder itself would nest everything one level down.
  # The wildcard keeps the manifest at the archive root, where the loader wants it.
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $xpi -CompressionLevel Optimal
} finally {
  Remove-Item $stage -Recurse -Force
}

$size = [math]::Round((Get-Item $xpi).Length / 1KB, 1)
Write-Host ""
Write-Host "  built  $xpi  ($size KB)"
Write-Host "  id     $id"
Write-Host "  ver    $version"
Write-Host ""
Write-Host "  Install: Add-ons Manager > gear > Install Add-on From File, then restart."
Write-Host ""
