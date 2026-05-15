$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "AI-Chat-Agent.lnk"
$startBat = Join-Path $PSScriptRoot "start-server.bat"

Write-Host "正在移除开机自启..."

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "已删除快捷方式: $shortcutPath"
} else {
    Write-Host "快捷方式不存在: $shortcutPath"
}

if (Test-Path $startBat) {
    Remove-Item $startBat -Force
    Write-Host "已删除启动脚本: $startBat"
} else {
    Write-Host "启动脚本不存在: $startBat"
}

Write-Host ""
Write-Host "开机自启已移除！"
