<#
  Builds extension/ + chrome/ + icons/fluent/ into dist/thunderbird-fluent.zip.
  The manifest MUST land at the archive root or the install fails as "corrupt".
  Named .zip and not .xpi so GitHub serves it as a download -- see CLAUDE.md.
  A change under chrome/ or icons/ needs a manifest version bump to deploy.
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

$icons = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons\fluent'

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$archive = Join-Path $OutDir 'thunderbird-fluent.zip'
if (Test-Path $archive) { Remove-Item $archive -Force }

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("fluent-pack-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $stage | Out-Null

try {
  Copy-Item (Join-Path $source '*') $stage -Recurse -Force
  Copy-Item $chrome (Join-Path $stage 'chrome') -Recurse -Force

  $cssNames = Get-ChildItem $chrome -Filter *.css |
              Sort-Object Name |
              Select-Object -ExpandProperty Name
  if (-not $cssNames) { throw "No .css files in $chrome" }
  ConvertTo-Json @($cssNames) |
    Set-Content (Join-Path $stage 'chrome-files.json') -Encoding utf8NoBOM

  if (Test-Path $icons) {
    Copy-Item $icons (Join-Path $stage 'icons') -Recurse -Force
    $iconNames = Get-ChildItem $icons -Filter *.svg |
                 Sort-Object Name |
                 Select-Object -ExpandProperty Name
    ConvertTo-Json @($iconNames) |
      Set-Content (Join-Path $stage 'icon-files.json') -Encoding utf8NoBOM
  } else {
    ConvertTo-Json @() |
      Set-Content (Join-Path $stage 'icon-files.json') -Encoding utf8NoBOM
  }

  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -CompressionLevel Optimal
} finally {
  Remove-Item $stage -Recurse -Force
}

$size = [math]::Round((Get-Item $archive).Length / 1KB, 1)
Write-Host ""
Write-Host "  built  $archive  ($size KB)"
Write-Host "  id     $id"
Write-Host "  ver    $version"
Write-Host ""
Write-Host "  Install: Add-ons Manager > gear > Install Add-on From File, then restart."
Write-Host ""
