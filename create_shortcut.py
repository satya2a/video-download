import os
import subprocess

desktop_dir = r"C:\Users\omkar\OneDrive\Desktop"
target_bat = os.path.join(os.path.dirname(os.path.abspath(__file__)), "start_app.bat")
shortcut_path = os.path.join(desktop_dir, "URL Video Download.lnk")

vbs_code = f'''
Set WshShell = CreateObject("WScript.Shell")
Set Shortcut = WshShell.CreateShortcut("{shortcut_path}")
Shortcut.TargetPath = "{target_bat}"
Shortcut.WorkingDirectory = "{os.path.dirname(os.path.abspath(__file__))}"
Shortcut.Description = "Launch URL Video Download"
Shortcut.Save
'''

temp_vbs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_sc.vbs")
with open(temp_vbs, "w", encoding="utf-8") as f:
    f.write(vbs_code)

subprocess.run(["wscript.exe", temp_vbs], check=True)
if os.path.exists(temp_vbs):
    os.remove(temp_vbs)

print(f"Created shortcut at: {shortcut_path}")
