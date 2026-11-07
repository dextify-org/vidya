$ErrorActionPreference = "Stop"

$NpmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($NpmCmd) {
    Set-Alias npm $NpmCmd.Source -Scope Script
}

$RepoRoot = $PSScriptRoot
$StagingDir = Join-Path $RepoRoot "staging"
$StagingApp = Join-Path $StagingDir "app"
$BackendDir = Join-Path $RepoRoot "backend"
$BuildDir = Join-Path $RepoRoot "build"
$NodeDir = Join-Path $RepoRoot "node"
$NodeExe = Join-Path $NodeDir "node.exe"

# Step 0: Ensure node.exe is present (downloads Node.js 22 LTS if missing)
if (Test-Path $NodeExe) {
    Write-Host ">>> node.exe already present in node/ — skipping download. (Delete node\node.exe to force a fresh download.)" -ForegroundColor DarkGray
} else {
    Write-Host ">>> Fetching latest Node.js 22 LTS version info..." -ForegroundColor Cyan
    $releases = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
    $latestV22 = $releases | Where-Object { $_.version -like "v22.*" -and $_.lts } | Select-Object -First 1
    if (-not $latestV22) { Write-Error "Could not find a Node.js 22 LTS release from nodejs.org."; exit 1 }

    $nodeVersion = $latestV22.version
    $zipName = "node-$nodeVersion-win-x64.zip"
    $zipUrl = "https://nodejs.org/dist/$nodeVersion/$zipName"
    $zipTemp = Join-Path $env:TEMP $zipName
    $extractTemp = Join-Path $env:TEMP "node-$nodeVersion-win-x64"

    Write-Host ">>> Downloading Node.js $nodeVersion x64 from nodejs.org..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipTemp -UseBasicParsing

    Write-Host ">>> Extracting node.exe..." -ForegroundColor Cyan
    if (Test-Path $extractTemp) { Remove-Item -Recurse -Force $extractTemp }
    Expand-Archive -Path $zipTemp -DestinationPath $env:TEMP -Force

    $extractedExe = Join-Path $extractTemp "node.exe"
    if (-not (Test-Path $extractedExe)) { Write-Error "node.exe not found in extracted archive at $extractedExe"; exit 1 }

    if (-not (Test-Path $NodeDir)) { New-Item -ItemType Directory -Path $NodeDir | Out-Null }
    Copy-Item $extractedExe $NodeExe -Force

    Remove-Item $zipTemp -Force -ErrorAction SilentlyContinue
    Remove-Item $extractTemp -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ">>> Node.js $nodeVersion → node\node.exe" -ForegroundColor Green
}

# Step 1: Build frontend
Write-Host ">>> Building frontend..." -ForegroundColor Cyan
Set-Location $RepoRoot
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed."; exit 1 }

# Step 2: Clean and recreate staging
Write-Host ">>> Creating staging directory..." -ForegroundColor Cyan
if (Test-Path $StagingDir) {
    Remove-Item -Recurse -Force $StagingDir
}
New-Item -ItemType Directory -Path $StagingApp | Out-Null

# Step 3: Copy backend to staging, excluding node_modules
Write-Host ">>> Copying backend to staging (excluding node_modules)..." -ForegroundColor Cyan
robocopy $BackendDir $StagingApp /E /XD node_modules /XF "*.log" | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Error "robocopy failed with code $LASTEXITCODE"; exit 1 }

# Step 4: Install production dependencies inside staged backend
Write-Host ">>> Installing production dependencies..." -ForegroundColor Cyan
Set-Location $StagingApp
npm install --production
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed."; exit 1 }

# Step 5: Run NSIS
Write-Host ">>> Running NSIS compiler..." -ForegroundColor Cyan
Set-Location $RepoRoot

$PackageJson = Get-Content (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json
$AppVersion = $PackageJson.version
if (-not $AppVersion) { Write-Error "Could not read the app version from package.json"; exit 1 }
Write-Host ">>> Application version: $AppVersion" -ForegroundColor Cyan

$NsisPaths = @(
    "C:\Program Files (x86)\NSIS\makensis.exe",
    "C:\Program Files\NSIS\makensis.exe"
)
$Makensis = $NsisPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Makensis) {
    Write-Error "NSIS not found. Install NSIS or add its path to `$NsisPaths in this script."
    exit 1
}

& $Makensis "/DAPPVERSION=$AppVersion" "installer.nsi"
if ($LASTEXITCODE -ne 0) { Write-Error "NSIS compilation failed."; exit 1 }

Write-Host ">>> Build complete! Installer created." -ForegroundColor Green
