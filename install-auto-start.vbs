Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\AI-Chat-Agent.lnk"

WScript.Echo "正在设置开机自启..."
WScript.Echo "项目路径: " & scriptDir
WScript.Echo "快捷方式路径: " & shortcutPath

' 创建启动批处理
startBat = scriptDir & "\start-server.bat"
Set batFile = fso.CreateTextFile(startBat, True)
batFile.WriteLine "@echo off"
batFile.WriteLine "cd /d """ & scriptDir & """"
batFile.WriteLine "node server.js"
batFile.Close

' 创建快捷方式
Set shortcut = WshShell.CreateShortcut(shortcutPath)
shortcut.TargetPath = "cmd.exe"
shortcut.Arguments = "/c """ & startBat & """"
shortcut.WorkingDirectory = scriptDir
shortcut.WindowStyle = 7  ' 最小化窗口
shortcut.Save

WScript.Echo ""
WScript.Echo "设置完成！"
WScript.Echo "已创建开机自启快捷方式"
WScript.Echo "每次开机时，应用将自动启动"
