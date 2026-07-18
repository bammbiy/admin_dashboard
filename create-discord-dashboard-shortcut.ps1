$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $projectDir 'Run Discord Dashboard.cmd'
$shortcutPath = Join-Path $projectDir 'Discord Server Intelligence.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$shortcut.Description = 'Start Discord Server Intelligence Dashboard'
$shortcut.Save()

Write-Host "Created shortcut: $shortcutPath"
