Set WshShell = CreateObject("WScript.Shell")
' Run URL Video Download server silently in the background without any console window
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "python app.py", 0, False
