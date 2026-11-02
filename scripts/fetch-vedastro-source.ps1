$ErrorActionPreference = 'Stop'

$sourceCommit = '40763952742f76369a505d8db2e9e9fa67f75d78'
$serviceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\services\vedastro-selfhost')).Path
$sourceRoot = Join-Path $serviceRoot 'vendor\VedAstro'
$libraryProject = Join-Path $sourceRoot 'Library\Library.csproj'
$compatibilityPatch = Join-Path $serviceRoot 'patches\net10-cache-persistence.patch'

function Ensure-CompatibilityPatch([string]$repository, [string]$patchPath) {
    $cacheManager = Join-Path $repository 'Library\Logic\CacheManager.cs'
    if (Select-String -Path $cacheManager -SimpleMatch 'private static object GetEntriesCollection(MemoryCache cache)' -Quiet) {
        return
    }

    & git -C $repository apply $patchPath
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to apply the local .NET 10 cache-persistence compatibility patch.'
    }
}

if (Test-Path -LiteralPath $libraryProject) {
    $existingCommit = (& git -C $sourceRoot rev-parse HEAD 2>$null).Trim()
    if ($LASTEXITCODE -eq 0 -and $existingCommit -eq $sourceCommit) {
        Ensure-CompatibilityPatch $sourceRoot $compatibilityPatch
        Write-Output "VedAstro source $sourceCommit is already present."
        exit 0
    }
    throw "Existing VedAstro source is at '$existingCommit'; expected pinned commit $sourceCommit. Refusing to replace it."
}

if (Test-Path -LiteralPath $sourceRoot) {
    throw "Destination exists without the expected library project; refusing to overwrite: $sourceRoot"
}

$runId = [Guid]::NewGuid().ToString('N')
$tempRoot = Join-Path $env:TEMP "vedastro-source-$sourceCommit-$runId"

try {
    & git clone --filter=blob:none --no-checkout --depth 1 https://github.com/VedAstro/VedAstro.git $tempRoot
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to clone the official VedAstro repository.'
    }
    & git -C $tempRoot fetch --depth 1 origin $sourceCommit
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to fetch pinned VedAstro commit $sourceCommit."
    }
    & git -C $tempRoot sparse-checkout init --cone
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to configure sparse checkout for the VedAstro Library project.'
    }
    & git -C $tempRoot sparse-checkout set Library
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to select the VedAstro Library source tree.'
    }
    & git -C $tempRoot checkout --detach $sourceCommit
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to check out pinned VedAstro commit $sourceCommit."
    }
    Ensure-CompatibilityPatch $tempRoot $compatibilityPatch

    $candidateProject = Join-Path $tempRoot 'Library\Library.csproj'
    if (-not (Test-Path -LiteralPath $candidateProject)) {
        throw 'Pinned VedAstro source does not contain Library/Library.csproj.'
    }

    $vendorRoot = Join-Path $serviceRoot 'vendor'
    New-Item -ItemType Directory -Path $vendorRoot -Force | Out-Null
    Move-Item -LiteralPath $tempRoot -Destination $sourceRoot
    Write-Output "Fetched VedAstro source at $sourceCommit to the ignored PoC vendor directory."
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
