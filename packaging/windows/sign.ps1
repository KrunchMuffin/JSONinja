# Signs Windows files with DAB Worx's certificate in Azure Artifact Signing (Microsoft's signing
# service, called Trusted Signing until 2025), so Windows names DAB Worx Inc. as the publisher
# instead of warning about an unknown one. Tauri calls it while building (signCommand in
# src-tauri/tauri.signing.conf.json) for jsoninja.exe, the uninstaller and the installer, and
# release.yml calls it for the portable exe, which Tauri leaves unsigned.
# Adapted from Simple Markdown Viewer's sign.ps1, itself from BucketWorx's and CaptureWorx's.
#
# Usage: pwsh packaging/windows/sign.ps1 <file> [<file> ...]
#        pwsh packaging/windows/sign.ps1 -Check   (says whether signing is set up, signs nothing)
#
# -Check exits 0 when signing is set up, 2 when it isn't (no settings at all) and 1 when the
# settings are there but wrong, so the release workflow can tell "not set up" from a mistake.
#
# Which certificate: the account's address (its "Account URI"), the account name and the
# certificate profile name, from packaging/windows/signing.json, or from the environment variables
# JSONINJA_SIGN_ENDPOINT, JSONINJA_SIGN_ACCOUNT and JSONINJA_SIGN_PROFILE, which win. None of the three is a
# secret: signing also needs an Azure sign-in that holds the role "Artifact Signing Certificate
# Profile Signer" on that account.
#
# The sign-in: on this computer, Azure PowerShell (`Connect-AzAccount`) or the Azure CLI
# (`az login`), once; if neither is signed in, a browser window asks. On GitHub Actions, an app
# registration's AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET in the environment
# (Azure's EnvironmentCredential; release.yml takes them from the repository's secrets, and
# setup-github-signing.ps1 puts them there). See CONTRIBUTING.md, "Signing".
#
# The work is done by Microsoft's ArtifactSigning PowerShell module (installed for the current
# user if missing, at the version Microsoft's own GitHub action pins), which fetches signtool and
# the signing client itself. It needs the .NET 8 runtime.
param(
    [switch]$Check,
    [Parameter(ValueFromRemainingArguments)][string[]]$Files = @()
)
$ErrorActionPreference = 'Stop'

# The module version azure/artifact-signing-action pins.
$moduleVersion = '0.1.20'

# The RFC 3161 timestamp service Artifact Signing documents. The certificate itself lasts three
# days; the timestamp is what keeps a signature good after that.
$timestampUrl = 'http://timestamp.acs.microsoft.com'

# The three settings, or $null when signing isn't set up here.
function Get-SigningSettings {
    $settings = @{ Endpoint = ''; Account = ''; Profile = '' }
    $file = Join-Path $PSScriptRoot 'signing.json'
    if (Test-Path $file) {
        $json = Get-Content -Raw $file | ConvertFrom-Json
        $settings.Endpoint = [string]$json.endpoint
        $settings.Account = [string]$json.account
        $settings.Profile = [string]$json.profile
    }
    if ($env:JSONINJA_SIGN_ENDPOINT) { $settings.Endpoint = $env:JSONINJA_SIGN_ENDPOINT }
    if ($env:JSONINJA_SIGN_ACCOUNT) { $settings.Account = $env:JSONINJA_SIGN_ACCOUNT }
    if ($env:JSONINJA_SIGN_PROFILE) { $settings.Profile = $env:JSONINJA_SIGN_PROFILE }
    if (-not ($settings.Endpoint -or $settings.Account -or $settings.Profile)) {
        return $null
    }
    # Half set up is a mistake, not "not set up": it would otherwise build unsigned quietly.
    foreach ($key in 'Endpoint', 'Account', 'Profile') {
        if (-not $settings[$key]) {
            throw "signing is only half set up: the $($key.ToLower()) is missing (packaging/windows/signing.json or JSONINJA_SIGN_$($key.ToUpper()))"
        }
    }
    # The endpoint names the account's region (https://eus.codesigning.azure.net); a wrong region
    # fails later with a bare 403, so a wrong shape is stopped here.
    if ($settings.Endpoint -notmatch '^https://[a-z0-9]+\.codesigning\.azure\.net/?$') {
        throw "the signing endpoint `"$($settings.Endpoint)`" should look like https://eus.codesigning.azure.net (the Account URI on the account's Overview page)"
    }
    return $settings
}

$settings = Get-SigningSettings
if ($Check) {
    if ($settings) {
        Write-Host "signing with $($settings.Account)/$($settings.Profile) at $($settings.Endpoint)"
        exit 0
    }
    Write-Host 'signing is not set up (packaging/windows/signing.json or JSONINJA_SIGN_*)'
    exit 2
}
if (-not $settings) {
    throw 'signing is not set up: add packaging/windows/signing.json or set JSONINJA_SIGN_ENDPOINT, JSONINJA_SIGN_ACCOUNT and JSONINJA_SIGN_PROFILE'
}
if ($Files.Count -eq 0) {
    throw 'no files to sign'
}
$paths = foreach ($f in $Files) { (Resolve-Path -LiteralPath $f).Path }
foreach ($p in $paths) {
    # The module takes the files as one comma-separated list.
    if ($p.Contains(',')) {
        throw "can't sign $p`: the signing module can't take a path with a comma in it"
    }
}

if (-not (Get-Module -ListAvailable -Name ArtifactSigning | Where-Object { $_.Version -eq $moduleVersion })) {
    Write-Host "installing the ArtifactSigning module $moduleVersion for this user"
    Install-Module -Name ArtifactSigning -RequiredVersion $moduleVersion -Scope CurrentUser -Repository PSGallery -Force
}
$module = Get-Module -ListAvailable -Name ArtifactSigning | Where-Object { $_.Version -eq $moduleVersion } |
    Select-Object -First 1
if (-not $module) {
    throw "the ArtifactSigning module $moduleVersion didn't install"
}
# Microsoft signs every script of the module. One that isn't signed by Microsoft any more has been
# changed since, so it isn't run.
foreach ($script in Get-ChildItem -LiteralPath $module.ModuleBase -Recurse -Include '*.psm1', '*.psd1', '*.ps1') {
    $sig = Get-AuthenticodeSignature -LiteralPath $script.FullName
    if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch '^CN=Microsoft Corporation,') {
        throw "the ArtifactSigning module's $($script.Name) isn't signed by Microsoft ($($sig.Status)): reinstall it with Install-Module ArtifactSigning -RequiredVersion $moduleVersion -Force"
    }
}
Import-Module $module.Path

$params = @{
    Endpoint               = $settings.Endpoint
    CodeSigningAccountName = $settings.Account
    CertificateProfileName = $settings.Profile
    Files                  = ($paths -join ',')
    FileDigest             = 'SHA256'
    TimestampRfc3161       = $timestampUrl
    TimestampDigest        = 'SHA256'
    # What Windows shows as the program's name when the installer asks for administrator rights.
    Description            = 'JSONinja'
    DescriptionUrl         = 'https://jsoninja.dabworx.com'
    # Only the sign-ins that can apply here, so a missing one doesn't hold things up.
    ExcludeManagedIdentityCredential   = $true
    ExcludeWorkloadIdentityCredential  = $true
    ExcludeSharedTokenCacheCredential  = $true
    ExcludeVisualStudioCredential      = $true
    ExcludeVisualStudioCodeCredential  = $true
}
if ($env:GITHUB_ACTIONS) {
    # Nobody is there to sign in through a browser.
    $params.ExcludeInteractiveBrowserCredential = $true
}
Invoke-ArtifactSigning @params

# The module doesn't always stop on a failure, so each file is checked: a good signature, with a
# timestamp.
foreach ($p in $paths) {
    $sig = Get-AuthenticodeSignature -LiteralPath $p
    if ($sig.Status -ne 'Valid') {
        throw "$p isn't signed properly: $($sig.Status) $($sig.StatusMessage)"
    }
    if (-not $sig.TimeStamperCertificate) {
        throw "$p is signed but has no timestamp"
    }
    Write-Host "signed $p by $($sig.SignerCertificate.Subject)"
}
