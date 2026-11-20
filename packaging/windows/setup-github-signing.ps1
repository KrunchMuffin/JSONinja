# Sets up signing for GitHub Actions (release.yml), run once on the person's computer, and again
# before the secret it makes runs out (two years) to give GitHub a new one.
#
# Adapted from Simple Markdown Viewer's setup-github-signing.ps1, itself from CaptureWorx's.
#
# Usage: pwsh packaging/windows/setup-github-signing.ps1
#
# What it does, signed in as the person (Connect-AzAccount first):
# 1. Makes an app registration "JSONinja GitHub signing" in Microsoft Entra ID (or finds the
#    one made before): the sign-in GitHub uses.
# 2. Gives it the "Artifact Signing Certificate Profile Signer" role on the signing account named in
#    signing.json, and nothing else.
# 3. Makes a new client secret for it, good for two years.
# 4. Puts AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET into the repository's Actions
#    secrets with the GitHub CLI (gh). Without gh it opens the secrets page and copies each value to
#    the clipboard in turn, for pasting.
#
# The secret is never printed or written to a file. Needs the Az.Accounts and Az.Resources modules
# (Az.Resources is installed for the current user if missing).
param(
    [string]$Repo = 'KrunchMuffin/JSONinja',
    [string]$Name = 'JSONinja GitHub signing'
)
$ErrorActionPreference = 'Stop'

if (-not (Get-Module -ListAvailable -Name Az.Resources)) {
    Write-Host 'installing the Az.Resources module for this user'
    Install-Module -Name Az.Resources -Scope CurrentUser -Repository PSGallery -Force
}
Import-Module Az.Accounts
Import-Module Az.Resources

$context = Get-AzContext
if (-not $context) {
    throw 'not signed in to Azure: run Connect-AzAccount first'
}
$tenant = $context.Tenant.Id

# The signing account, by the name in signing.json, in the subscription signed in to.
$settings = Get-Content -Raw (Join-Path $PSScriptRoot 'signing.json') | ConvertFrom-Json
$account = Get-AzResource -ResourceType 'Microsoft.CodeSigning/codeSigningAccounts' -Name $settings.account
if (-not $account) {
    throw "no signing account `"$($settings.account)`" in subscription `"$($context.Subscription.Name)`": pick the right one with Set-AzContext -Subscription <name>"
}
Write-Host "signing account: $($account.ResourceId)"

# The role's name changed with the service's (Trusted Signing to Artifact Signing), so it is looked
# up by its ending.
$role = Get-AzRoleDefinition | Where-Object { $_.Name -like '*Certificate Profile Signer' } | Select-Object -First 1
if (-not $role) {
    throw 'no "Certificate Profile Signer" role found in this subscription'
}

# The app registration and its service principal, made once.
$app = Get-AzADApplication -DisplayName $Name | Select-Object -First 1
if ($app) {
    Write-Host "using the app registration made before ($($app.AppId))"
} else {
    $app = New-AzADApplication -DisplayName $Name
    Write-Host "made the app registration $Name ($($app.AppId))"
}
$sp = Get-AzADServicePrincipal -ApplicationId $app.AppId
if (-not $sp) {
    $sp = New-AzADServicePrincipal -ApplicationId $app.AppId
}

$assigned = Get-AzRoleAssignment -ObjectId $sp.Id -Scope $account.ResourceId -ErrorAction SilentlyContinue |
    Where-Object { $_.RoleDefinitionName -eq $role.Name }
if (-not $assigned) {
    # A new service principal can take a few seconds to be seen by role assignments.
    for ($try = 1; ; $try++) {
        try {
            New-AzRoleAssignment -ObjectId $sp.Id -RoleDefinitionName $role.Name -Scope $account.ResourceId | Out-Null
            break
        } catch {
            if ($try -ge 6) { throw }
            Start-Sleep -Seconds 10
        }
    }
    Write-Host "gave it the role `"$($role.Name)`" on the signing account"
} else {
    Write-Host "it already has the role `"$($role.Name)`""
}

$cred = New-AzADAppCredential -ObjectId $app.Id -EndDate (Get-Date).AddYears(2)
$secret = $cred.SecretText
Write-Host "made a new client secret, good until $($cred.EndDateTime.ToString('yyyy-MM-dd'))"

$values = [ordered]@{
    AZURE_TENANT_ID     = $tenant
    AZURE_CLIENT_ID     = $app.AppId
    AZURE_CLIENT_SECRET = $secret
}
if (Get-Command gh -ErrorAction SilentlyContinue) {
    foreach ($key in $values.Keys) {
        # Through standard input, so the value isn't on a command line.
        $values[$key] | gh secret set $key --repo $Repo
        if ($LASTEXITCODE -ne 0) { throw "gh secret set $key failed (is gh signed in? gh auth login)" }
        Write-Host "set the GitHub secret $key"
    }
} else {
    $page = "https://github.com/$Repo/settings/secrets/actions/new"
    Write-Host "the GitHub CLI isn't installed, so each value goes to the clipboard for pasting at $page"
    Start-Process $page
    foreach ($key in $values.Keys) {
        Set-Clipboard -Value $values[$key]
        Read-Host "Name: $key   Value: on the clipboard. Paste it, click Add secret, then press Enter here"
    }
    Set-Clipboard -Value ' '
}
$secret = $null
Write-Host "done: release builds on GitHub can sign now. Run this again before $($cred.EndDateTime.ToString('yyyy-MM-dd')) for a new secret."
