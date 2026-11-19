<#
.SYNOPSIS
    Continuous Git Auto-Sync script for InvoiceFlow.
    Synchronizes local commits and uncommitted file changes with GitHub every 20 seconds.

.DESCRIPTION
    1. Rebase-pulls latest changes from origin main.
    2. Inspects git status for untracked, modified, or deleted files.
    3. Stages, commits with an ISO timestamp, and pushes to origin main.
    4. Loops every 20 seconds until stopped (Ctrl+C).
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "InvoiceFlow Git Auto-Sync"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " InvoiceFlow — Real-Time Git Auto-Sync Watcher" -ForegroundColor Green
Write-Host " Target Remote: https://github.com/pavan-s-17/AGENTIC-AI-HACKATHON.git" -ForegroundColor Gray
Write-Host " Branch: main | Interval: 20s" -ForegroundColor Gray
Write-Host " Press [Ctrl+C] at any time to pause or stop synchronization." -ForegroundColor Yellow
Write-Host "=================================================================`n" -ForegroundColor Cyan

while ($true) {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$now] Checking synchronization status..." -ForegroundColor Gray

    # 1. Fetch & pull remote changes first with rebase
    try {
        $pullOutput = git pull --rebase origin main 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[$now] [Notice] Rebase pull check: $pullOutput" -ForegroundColor DarkYellow
        }
    } catch {
        Write-Host "[$now] [Warning] Failed to reach remote during pull: $_" -ForegroundColor DarkRed
    }

    # 2. Check for local modifications, additions, or deletions
    $statusOutput = git status --porcelain
    if ($statusOutput) {
        Write-Host "[$now] Detected local modifications:" -ForegroundColor Cyan
        $statusOutput | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }

        # Stage all changes
        git add -A

        # Commit with timestamp
        $commitMsg = "chore: auto-sync $now"
        git commit -m "$commitMsg"

        # Push to remote origin main
        Write-Host "[$now] Pushing updates to origin main..." -ForegroundColor Green
        $pushOutput = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[$now] Successfully synced and pushed to GitHub!" -ForegroundColor Green
        } else {
            Write-Host "[$now] Push encountered an issue: $pushOutput" -ForegroundColor Red
        }
    } else {
        Write-Host "[$now] Workspace clean. Local and GitHub are in sync." -ForegroundColor DarkGray
    }

    Write-Host "[$now] Sleeping for 20 seconds...`n" -ForegroundColor DarkGray
    Start-Sleep -Seconds 20
}
