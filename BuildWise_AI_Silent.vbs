Set WshShell = CreateObject("WScript.Shell")
' Run the desktop app runner python script with window style 0 (hidden)
WshShell.Run "python run_desktop.py", 0, False
