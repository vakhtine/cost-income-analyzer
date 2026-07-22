# Start backend (terminal 1)
Set-Location "$PSScriptRoot\backend"
.\run.ps1

# Start frontend (terminal 2)
Set-Location "$PSScriptRoot\frontend"
.\run.ps1
