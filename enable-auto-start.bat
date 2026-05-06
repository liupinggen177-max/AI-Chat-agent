@echo off
chcp 65001 >nul
echo ========================================
echo   AI Chat Agent - 开机自启设置
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
set APP_PATH=%SCRIPT_DIR%start.bat
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AI-Chat-Agent.lnk

echo 当前项目路径: %SCRIPT_DIR%
echo.

echo 正在创建启动脚本...
(
echo @echo off
echo cd /d "%SCRIPT_DIR%"
echo node server.js
echo pause
) > "%SCRIPT_DIR%start.bat"

echo 正在创建快捷方式...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'cmd.exe'; $s.Arguments = '/c \"%SCRIPT_DIR%start.bat\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 7; $s.Save()"

echo.
echo ========================================
echo   设置完成！
echo ========================================
echo.
echo 已创建开机自启快捷方式
echo 每次开机时，应用将自动在后台启动
echo.
echo 如需卸载开机自启，请手动删除:
echo %SHORTCUT_PATH%
echo.
pause
