import os
import sys
import winreg
import ctypes

def main():
    print("========================================")
    print("Martian .MSM File Association Utility")
    print("========================================\n")
    
    python_path = sys.executable
    if python_path.endswith("python.exe"):
        pythonw_path = python_path.replace("python.exe", "pythonw.exe")
        if os.path.exists(pythonw_path):
            python_path = pythonw_path
            
    workspace_dir = r"c:\Users\Camer\OneDrive\Desktop\THE FOLDER\AI\ProjectMartian"
    launcher_path = os.path.join(workspace_dir, "martian_launcher.py")
    
    print(f"[Registry] Python Interpreter: {python_path}")
    print(f"[Registry] Launcher Script:    {launcher_path}")
    
    # 1. Register .msm extension
    key_ext = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\.msm")
    winreg.SetValue(key_ext, "", winreg.REG_SZ, "MartianMSMFile")
    winreg.CloseKey(key_ext)
    
    # 2. Register Open Command
    key_cmd = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\MartianMSMFile\shell\open\command")
    winreg.SetValue(key_cmd, "", winreg.REG_SZ, f'"{python_path}" "{launcher_path}" "%1"')
    winreg.CloseKey(key_cmd)
    
    # 3. Clean up Explorer FileExts UserChoice override if it exists
    # (Forces Windows to check Software\Classes\.msm and reload)
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.msm\UserChoice")
        print("[Registry] Cleared Explorer FileExts UserChoice override key.")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"[Registry Warning] Could not delete UserChoice: {e}")
        
    # 4. Trigger Shell Refresh
    try:
        # SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0
        ctypes.windll.shell32.SHChangeNotify(0x08000000, 0, None, None)
        print("[Registry] Shell refreshed via SHChangeNotify.")
    except Exception as e:
        print(f"[Registry Warning] Failed shell refresh: {e}")

    print("\n[Registry Success] File association registered and shell updated successfully.")

if __name__ == "__main__":
    main()
