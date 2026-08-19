<#
    Bouwt dist/hgc-credit-calculator.zip voor handmatige upload in WordPress.

    Gebruik NIET Compress-Archive: Windows PowerShell 5.1 schrijft backslashes
    als padscheiding in het archief. WordPress maakt daardoor geen pluginmap aan
    en de activering faalt met "Plugin bestand bestaat niet.". Dit script zet de
    entrynamen expliciet met forward slashes, zoals de ZIP-standaard vereist.
#>

$ErrorActionPreference = 'Stop'

$root    = Split-Path -Parent $PSScriptRoot
$source  = Join-Path $root 'wordpress\wp-content\plugins\hgc-credit-calculator'
$distDir = Join-Path $root 'dist'
$zipPath = Join-Path $distDir 'hgc-credit-calculator.zip'

if (-not (Test-Path $source)) { throw "Pluginmap niet gevonden: $source" }
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory $distDir | Out-Null }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$stream  = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

try {
    $prefix = (Split-Path -Parent $source) + '\'
    $files  = Get-ChildItem -Path $source -Recurse -File | Sort-Object FullName

    foreach ($file in $files) {
        $entryName = $file.FullName.Substring($prefix.Length).Replace('\', '/')
        $entry     = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)

        $entryStream = $entry.Open()
        try {
            $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
            $entryStream.Write($bytes, 0, $bytes.Length)
        } finally {
            $entryStream.Dispose()
        }

        Write-Output $entryName
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

Write-Output ''
Write-Output "Gereed: $zipPath"
