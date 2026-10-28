$ErrorActionPreference = "Stop"

# Ensure npm resolves to npm.cmd if PowerShell execution policy restricts scripts
$NpmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($NpmCmd) {
    Set-Alias npm $NpmCmd.Source -Scope Process
}

$NodeVersion = "v22.14.0"
$NodeZipSha256 = "55b639295920b219bb2acbcfa00f90393a2789095b7323f79475c9f34795f217"
$RepoRoot = $PSScriptRoot
$StagingDir = Join-Path $RepoRoot "staging"
$StagingBackend = Join-Path $StagingDir "backend"
$BackendDir = Join-Path $RepoRoot "backend"
$NodeDir = Join-Path $RepoRoot "node"
$NodeExe = Join-Path $NodeDir "node.exe"
$NodeZipName = "node-$NodeVersion-win-x64.zip"
$NodeZip = Join-Path $NodeDir $NodeZipName
$NodeZipUrl = "https://nodejs.org/dist/$NodeVersion/$NodeZipName"

# Step 0: Ensure node.exe is present (downloads and verifies pinned Node.js runtime if missing)
if (Test-Path $NodeExe) {
    Write-Host ">>> node.exe already present in node/ - skipping download. (Delete node\node.exe to force a fresh download.)" -ForegroundColor DarkGray
} else {
    if (-not (Test-Path $NodeDir)) {
        New-Item -ItemType Directory -Path $NodeDir | Out-Null
    }
    if (-not (Test-Path $NodeZip)) {
        Write-Host ">>> Downloading Node.js $NodeVersion x64 from nodejs.org..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $NodeZipUrl -OutFile $NodeZip -UseBasicParsing
    }

    $ActualNodeZipSha256 = (Get-FileHash -Path $NodeZip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ActualNodeZipSha256 -ne $NodeZipSha256) {
        Remove-Item $NodeZip -Force
        Write-Error "Node.js archive checksum mismatch. Expected $NodeZipSha256, received $ActualNodeZipSha256."
        exit 1
    }

    $ExtractRoot = Join-Path $env:TEMP "vidya-node-$NodeVersion"
    $ExtractedNodeDir = Join-Path $ExtractRoot "node-$NodeVersion-win-x64"
    if (Test-Path $ExtractRoot) {
        Remove-Item -Recurse -Force $ExtractRoot
    }
    New-Item -ItemType Directory -Path $ExtractRoot | Out-Null
    Expand-Archive -Path $NodeZip -DestinationPath $ExtractRoot -Force

    $ExtractedNodeExe = Join-Path $ExtractedNodeDir "node.exe"
    if (-not (Test-Path $ExtractedNodeExe)) {
        Write-Error "node.exe not found in verified archive at $ExtractedNodeExe"
        exit 1
    }
    Copy-Item $ExtractedNodeExe $NodeExe -Force
    Remove-Item $ExtractRoot -Recurse -Force
    Remove-Item $NodeZip -Force -ErrorAction SilentlyContinue
    Write-Host ">>> Verified Node.js $NodeVersion -> node\node.exe" -ForegroundColor Green
}

# Step 1: Install locked workspace dependencies and build frontend
Write-Host ">>> Building frontend..." -ForegroundColor Cyan
Set-Location $RepoRoot
npm ci
if ($LASTEXITCODE -ne 0) { Write-Error "Workspace dependency installation failed."; exit 1 }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed."; exit 1 }

# Step 2: Clean and recreate staging
Write-Host ">>> Creating staging directory..." -ForegroundColor Cyan
if (Test-Path $StagingDir) {
    Remove-Item -Recurse -Force $StagingDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $StagingBackend -Force | Out-Null

# Step 3: Copy backend to staging, excluding node_modules
Write-Host ">>> Copying backend to staging (excluding node_modules)..." -ForegroundColor Cyan
robocopy $BackendDir $StagingBackend /E /XD node_modules /XF "*.log" | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Error "robocopy failed with code $LASTEXITCODE"; exit 1 }
Copy-Item (Join-Path $RepoRoot "package.json") $StagingDir
Copy-Item (Join-Path $RepoRoot "package-lock.json") $StagingDir

# Step 4: Install backend production dependencies from the workspace lockfile
Write-Host ">>> Installing locked production dependencies..." -ForegroundColor Cyan
Set-Location $StagingDir
npm ci --omit=dev --workspace backend --include-workspace-root=false
if ($LASTEXITCODE -ne 0) { Write-Error "Production dependency installation failed."; exit 1 }

# Step 5: Run NSIS
Write-Host ">>> Running NSIS compiler..." -ForegroundColor Cyan
Set-Location $RepoRoot

$NsisPaths = @(
    "C:\Program Files (x86)\NSIS\makensis.exe",
    "C:\Program Files\NSIS\makensis.exe"
)
$Makensis = $NsisPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Makensis) {
    $NsisCmd = Get-Command makensis.exe -ErrorAction SilentlyContinue
    if ($NsisCmd) {
        $Makensis = $NsisCmd.Source
    }
}
if (-not $Makensis) {
    Write-Error "NSIS not found. Install NSIS or add its path to `$NsisPaths in this script."
    exit 1
}

& $Makensis "installer.nsi"
if ($LASTEXITCODE -ne 0) { Write-Error "NSIS compilation failed."; exit 1 }

Write-Host ">>> Build complete! Installer created." -ForegroundColor Green
