@echo off
chcp 65001 >nul
echo ========================================
echo   AI Chat Agent - 取消开机自启
echo ========================================
echo.

set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AI-Chat-Agent.lnk

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo 已删除开机自启快捷方式
) else (
    echo 未找到开机自启快捷方式，无需卸载
)

echo.
pause
