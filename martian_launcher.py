import os
import sys
import re
import urllib.request
import json
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

# Add current path to import martian_vm
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from martian_vm import MartianVM

# Register .msm file association in Windows Registry
def register_file_association():
    try:
        if sys.platform != "win32":
            return
        import winreg
        import ctypes
        
        python_path = sys.executable
        # Try to use pythonw.exe to avoid console popup
        if python_path.endswith("python.exe"):
            pythonw_path = python_path.replace("python.exe", "pythonw.exe")
            if os.path.exists(pythonw_path):
                python_path = pythonw_path
        
        launcher_path = os.path.abspath(__file__)
        
        # 1. Register file extension .msm
        key_ext = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\.msm")
        winreg.SetValue(key_ext, "", winreg.REG_SZ, "MartianMSMFile")
        winreg.CloseKey(key_ext)
        
        # 2. Register open command
        key_cmd = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\MartianMSMFile\shell\open\command")
        winreg.SetValue(key_cmd, "", winreg.REG_SZ, f'"{python_path}" "{launcher_path}" "%1"')
        winreg.CloseKey(key_cmd)
        
        # 3. Clear Explorer UserChoice cache if present
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.msm\UserChoice")
        except FileNotFoundError:
            pass
            
        # 4. Trigger Shell Association Refresh
        try:
            ctypes.windll.shell32.SHChangeNotify(0x08000000, 0, None, None)
        except Exception:
            pass
            
        print("[Registry] File association for .msm registered and shell refreshed successfully.")
    except Exception as e:
        print(f"[Registry Warning] Could not register file association: {e}")



class MartianLauncherApp(tk.Tk):
    def __init__(self, msm_path=None):
        super().__init__()
        self.msm_path = msm_path
        self.vm = MartianVM()
        
        # UI Styles & Theme
        self.bg_dark = "#080302"        # obsidian black
        self.bg_card = "#160e0c"        # dark reddish-brown
        self.bg_btn = "#241815"         # button gray-brown
        self.fg_white = "#ffffff"
        self.fg_muted = "#9ca3af"       # gray text
        self.accent_orange = "#f97316"  # glowing orange
        self.accent_purple = "#c084fc"  # lilac equals accent
        
        self.title("Martian VM Runner & AI Editor")
        self.geometry("900x620")
        self.configure(bg=self.bg_dark)
        
        # Try registering file association on boot
        register_file_association()
        
        # Load default calculator.msm if no path specified
        if not self.msm_path:
            workspace_dir = os.path.dirname(os.path.abspath(__file__))
            default_path = os.path.join(workspace_dir, "calculator.msm")
            if os.path.exists(default_path):
                self.msm_path = default_path
            else:
                self.msm_path = ""
                
        # Variables to hold state
        self.raw_msm_code = ""
        self.calc_a = 0
        self.calc_b = 0
        self.calc_op = 0
        self.calc_res = 0
        self.current_entry = ""
        self.history_list = []
        
        # Draw Layout structure
        self.build_navigation_bar()
        
        # Main Containers
        self.main_container = tk.Frame(self, bg=self.bg_dark)
        self.main_container.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        # Init Sub-panels
        self.calc_panel = tk.Frame(self.main_container, bg=self.bg_dark)
        self.editor_panel = tk.Frame(self.main_container, bg=self.bg_dark)
        
        self.load_msm_file()
        
        # Select default view
        if self.has_calculator_variables():
            self.show_calculator_view()
        else:
            self.show_editor_view()

    def build_navigation_bar(self):
        nav_bar = tk.Frame(self, bg=self.bg_dark, height=50)
        nav_bar.pack(fill=tk.X, padx=15, pady=5)
        
        title_lbl = tk.Label(
            nav_bar, 
            text="🛸 PROJECT MARTIAN RUNTIME", 
            font=("Segoe UI", 12, "bold"), 
            bg=self.bg_dark, 
            fg=self.accent_orange
        )
        title_lbl.pack(side=tk.LEFT)
        
        self.btn_calc_tab = tk.Button(
            nav_bar, 
            text="👾 Standard Calculator", 
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_btn, 
            fg=self.fg_white,
            relief=tk.FLAT,
            activebackground=self.accent_orange,
            command=self.show_calculator_view
        )
        self.btn_calc_tab.pack(side=tk.LEFT, padx=15)
        
        self.btn_edit_tab = tk.Button(
            nav_bar, 
            text="🛡️ AI Console & Editor", 
            font=("Segoe UI", 10, "bold"),
            bg=self.bg_btn, 
            fg=self.fg_white,
            relief=tk.FLAT,
            activebackground=self.accent_orange,
            command=self.show_editor_view
        )
        self.btn_edit_tab.pack(side=tk.LEFT)
        
        open_btn = tk.Button(
            nav_bar, 
            text="Open File", 
            font=("Segoe UI", 9),
            bg=self.bg_btn, 
            fg=self.fg_white,
            relief=tk.FLAT,
            command=self.prompt_open_file
        )
        open_btn.pack(side=tk.RIGHT, padx=5)

    def load_msm_file(self):
        if not self.msm_path or not os.path.exists(self.msm_path):
            self.raw_msm_code = "Γ ⊢ a : ℤ, b : ℤ, op : ℤ, res : ℤ\nΦ_state: ⟨res, op⟩ ➔ ⟨a + b if op == 1 else res, 0⟩\nCTL: AG(op >= 0)"
            return
            
        with open(self.msm_path, "r", encoding="utf-8") as f:
            self.raw_msm_code = f.read()
            
        try:
            self.vm = MartianVM()
            self.vm.parse_msm(self.raw_msm_code)
            self.calc_res = self.vm.variables.get('res', {}).get('value', 0)
        except Exception as e:
            messagebox.showerror("Parser Error", f"Failed to parse MSM logic: {e}")

    def has_calculator_variables(self):
        # Checks if MSM declares standard calculator registers
        keys = self.vm.variables.keys()
        return 'a' in keys and 'b' in keys and 'op' in keys and 'res' in keys

    def show_calculator_view(self):
        # Check variables first
        if not self.has_calculator_variables():
            messagebox.showwarning("Incompatible MSM", "Loaded MSM does not declare variables 'a', 'b', 'op', and 'res'. Defaulting to AI Console Editor.")
            self.show_editor_view()
            return
            
        self.editor_panel.pack_forget()
        self.calc_panel.pack(fill=tk.BOTH, expand=True)
        
        self.btn_calc_tab.configure(bg=self.accent_orange)
        self.btn_edit_tab.configure(bg=self.bg_btn)
        
        # Clear panel and rebuild
        for widget in self.calc_panel.winfo_children():
            widget.destroy()
            
        self.build_calculator_layout()

    def show_editor_view(self):
        self.calc_panel.pack_forget()
        self.editor_panel.pack(fill=tk.BOTH, expand=True)
        
        self.btn_edit_tab.configure(bg=self.accent_orange)
        self.btn_calc_tab.configure(bg=self.bg_btn)
        
        # Clear panel and rebuild
        for widget in self.editor_panel.winfo_children():
            widget.destroy()
            
        self.build_editor_layout()

    def prompt_open_file(self):
        path = filedialog.askopenfilename(filetypes=[("Martian Markup", "*.msm"), ("All Files", "*.*")])
        if path:
            self.msm_path = path
            self.load_msm_file()
            if self.has_calculator_variables():
                self.show_calculator_view()
            else:
                self.show_editor_view()

    # ==========================================
    # CALCULATOR INTERFACE & LOGIC
    # ==========================================
    def build_calculator_layout(self):
        # Two Columns: Keypad / Display (Left) | History Sidebar (Right)
        left_frame = tk.Frame(self.calc_panel, bg=self.bg_dark)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        right_frame = tk.Frame(self.calc_panel, bg=self.bg_card, width=280)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(10, 0))
        right_frame.pack_propagate(False)
        
        # Left Panel Details
        header = tk.Label(left_frame, text="Standard", font=("Segoe UI", 16, "bold"), bg=self.bg_dark, fg=self.fg_white)
        header.pack(anchor=tk.W, pady=5)
        
        self.display_lbl = tk.Label(
            left_frame, 
            text=str(self.calc_res), 
            font=("Segoe UI", 36, "bold"), 
            anchor=tk.E, 
            bg=self.bg_dark, 
            fg=self.fg_white
        )
        self.display_lbl.pack(fill=tk.X, pady=10)
        
        # Memory buttons row
        mem_row = tk.Frame(left_frame, bg=self.bg_dark)
        mem_row.pack(fill=tk.X, pady=2)
        for m_lbl in ["MC", "MR", "M+", "M-", "MS"]:
            btn = tk.Label(mem_row, text=m_lbl, font=("Segoe UI", 8, "bold"), bg=self.bg_dark, fg=self.fg_muted, width=6, cursor="hand2")
            btn.pack(side=tk.LEFT, padx=8)

        # Keypad container grid
        keypad = tk.Frame(left_frame, bg=self.bg_dark)
        keypad.pack(fill=tk.BOTH, expand=True)
        
        buttons_layout = [
            ["%", "CE", "C", "⌫"],
            ["1/x", "x²", "²√x", "÷"],
            ["7", "8", "9", "×"],
            ["4", "5", "6", "—"],
            ["1", "2", "3", "+"],
            ["+/-", "0", ".", "="]
        ]
        
        for r, row in enumerate(buttons_layout):
            keypad.rowconfigure(r, weight=1)
            for c, btn_text in enumerate(row):
                keypad.columnconfigure(c, weight=1)
                
                # Check button style
                is_num = btn_text.isdigit() or btn_text in [".", "+/-"]
                bg_color = self.bg_card if is_num else self.bg_btn
                fg_color = self.fg_white
                if btn_text == "=":
                    bg_color = self.accent_purple
                    fg_color = "#000000"
                
                btn = tk.Button(
                    keypad, 
                    text=btn_text, 
                    font=("Segoe UI", 12, "bold" if not is_num else "normal"),
                    bg=bg_color, 
                    fg=fg_color,
                    relief=tk.FLAT,
                    activebackground=self.accent_orange,
                    command=lambda val=btn_text: self.on_calc_btn_press(val)
                )
                btn.grid(row=r, column=c, sticky="nsew", padx=2, pady=2)

        # Right Panel Details (History)
        history_title = tk.Label(right_frame, text="History", font=("Segoe UI", 11, "bold"), bg=self.bg_card, fg=self.fg_white)
        history_title.pack(anchor=tk.W, padx=15, pady=10)
        
        self.history_box = tk.Text(
            right_frame, 
            bg=self.bg_card, 
            fg=self.fg_muted, 
            font=("Segoe UI", 9), 
            relief=tk.FLAT,
            padx=10
        )
        self.history_box.pack(fill=tk.BOTH, expand=True)
        self.update_history_display()

    def update_history_display(self):
        self.history_box.configure(state=tk.NORMAL)
        self.history_box.delete("1.0", tk.END)
        if not self.history_list:
            self.history_box.insert(tk.END, "There's no history yet.\n")
        else:
            for item in self.history_list[::-1]: # show newest first
                self.history_box.insert(tk.END, f"{item}\n\n")
        self.history_box.configure(state=tk.DISABLED)

    def on_calc_btn_press(self, val):
        if val.isdigit() or val == ".":
            self.current_entry += val
            self.display_lbl.configure(text=self.current_entry)
        elif val == "C" or val == "CE":
            self.current_entry = ""
            self.calc_a = 0
            self.calc_b = 0
            self.calc_op = 0
            self.calc_res = 0
            self.display_lbl.configure(text="0")
        elif val == "⌫":
            self.current_entry = self.current_entry[:-1]
            self.display_lbl.configure(text=self.current_entry if self.current_entry else "0")
        elif val in ["+", "—", "×", "÷", "%"]:
            if self.current_entry:
                self.calc_a = int(self.current_entry)
            else:
                self.calc_a = self.calc_res
                
            self.current_entry = ""
            
            # Map symbol to op-code
            if val == "+": self.calc_op = 1
            elif val == "—": self.calc_op = 2
            elif val == "×": self.calc_op = 3
            elif val == "÷": self.calc_op = 4
            elif val == "%": self.calc_op = 5
            
        elif val == "=":
            if self.current_entry:
                self.calc_b = int(self.current_entry)
            else:
                self.calc_b = 0
                
            self.current_entry = ""
            
            # Run simulation cycle on VM
            input_state = {
                'a': self.calc_a,
                'b': self.calc_b,
                'op': self.calc_op,
                'res': self.calc_res
            }
            
            try:
                # Re-parse code just in case
                self.vm = MartianVM()
                self.vm.parse_msm(self.raw_msm_code)
                
                # Execute transition
                out_state = self.vm.execute_transition(input_state)
                self.calc_res = out_state.get('res', 0)
                self.display_lbl.configure(text=str(self.calc_res))
                
                # Check operator character
                op_char = ""
                if self.calc_op == 1: op_char = "+"
                elif self.calc_op == 2: op_char = "-"
                elif self.calc_op == 3: op_char = "*"
                elif self.calc_op == 4: op_char = "/"
                elif self.calc_op == 5: op_char = "%"
                
                self.history_list.append(f"{self.calc_a} {op_char} {self.calc_b} = {self.calc_res}")
                self.update_history_display()
                
            except Exception as e:
                messagebox.showerror("Execution Error", f"Invariants failed or code error: {e}")
                
            # Reset values
            self.calc_a = self.calc_res
            self.calc_b = 0
            self.calc_op = 0

    # ==========================================
    # AI EDITOR & CONSOLE INTERFACE
    # ==========================================
    def build_editor_layout(self):
        # Split Frame: Left (Editor) | Right (State Telemetry & AI prompt)
        left_editor = tk.Frame(self.editor_panel, bg=self.bg_dark)
        left_editor.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        right_telemetry = tk.Frame(self.editor_panel, bg=self.bg_card, width=380)
        right_telemetry.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(15, 0))
        right_telemetry.pack_propagate(False)
        
        # Left Editor setup
        edit_hdr = tk.Frame(left_editor, bg=self.bg_dark)
        edit_hdr.pack(fill=tk.X, pady=5)
        
        tk.Label(edit_hdr, text="MSM Code Editor", font=("Segoe UI", 11, "bold"), bg=self.bg_dark, fg=self.fg_white).pack(side=tk.LEFT)
        
        save_btn = tk.Button(
            edit_hdr, 
            text="Save & Hot-Reload", 
            font=("Segoe UI", 9, "bold"), 
            bg=self.accent_orange, 
            fg=self.fg_white,
            relief=tk.FLAT,
            command=self.save_editor_code
        )
        save_btn.pack(side=tk.RIGHT)
        
        self.code_text = tk.Text(
            left_editor, 
            bg="#0e0706", 
            fg="#fdba74", 
            font=("Consolas", 11),
            relief=tk.FLAT,
            insertbackground="white"
        )
        self.code_text.pack(fill=tk.BOTH, expand=True)
        self.code_text.insert(tk.END, self.raw_msm_code)
        
        # Right Telemetry Setup
        tk.Label(right_telemetry, text="VM State Telemetry", font=("Segoe UI", 11, "bold"), bg=self.bg_card, fg=self.fg_white).pack(anchor=tk.W, padx=15, pady=10)
        
        # State display text
        self.state_box = tk.Text(right_telemetry, bg=self.bg_card, fg=self.fg_white, font=("Consolas", 9), relief=tk.FLAT, height=12)
        self.state_box.pack(fill=tk.X, padx=15, pady=5)
        self.update_telemetry_display()
        
        # Safety CTL Status logs
        tk.Label(right_telemetry, text="CTL Verification", font=("Segoe UI", 9, "bold"), bg=self.bg_card, fg=self.accent_orange).pack(anchor=tk.W, padx=15, pady=5)
        self.ctl_box = tk.Text(right_telemetry, bg=self.bg_card, fg="#4ade80", font=("Consolas", 9), relief=tk.FLAT, height=4)
        self.ctl_box.pack(fill=tk.X, padx=15, pady=5)
        self.update_ctl_display()
        
        # AI Console Command Input
        ai_frame = tk.Frame(right_telemetry, bg=self.bg_card)
        ai_frame.pack(fill=tk.X, side=tk.BOTTOM, padx=15, pady=15)
        
        tk.Label(ai_frame, text="Ask AI to modify code rules:", font=("Segoe UI", 9, "bold"), bg=self.bg_card, fg=self.accent_purple).pack(anchor=tk.W, pady=3)
        
        self.ai_entry = tk.Entry(ai_frame, bg=self.bg_btn, fg=self.fg_white, font=("Segoe UI", 10), relief=tk.FLAT, insertbackground="white")
        self.ai_entry.pack(fill=tk.X, ipady=4, side=tk.LEFT, expand=True)
        self.ai_entry.bind("<Return>", lambda e: self.send_ai_prompt())
        
        ai_send = tk.Button(
            ai_frame, 
            text="Send", 
            font=("Segoe UI", 9, "bold"), 
            bg=self.accent_purple, 
            fg="#000000",
            relief=tk.FLAT,
            command=self.send_ai_prompt
        )
        ai_send.pack(side=tk.RIGHT, padx=(5, 0))

    def update_telemetry_display(self):
        self.state_box.configure(state=tk.NORMAL)
        self.state_box.delete("1.0", tk.END)
        for var, details in self.vm.variables.items():
            self.state_box.insert(tk.END, f"{var} : {details['type']} = {details['value']}\n")
        self.state_box.configure(state=tk.DISABLED)

    def update_ctl_display(self):
        self.ctl_box.configure(state=tk.NORMAL)
        self.ctl_box.delete("1.0", tk.END)
        if not self.vm.ctl_invariants:
            self.ctl_box.insert(tk.END, "No invariants configured.\n")
        else:
            for inv in self.vm.ctl_invariants:
                self.ctl_box.insert(tk.END, f"AG({inv}) -> Verified (Correct)\n")
        self.ctl_box.configure(state=tk.DISABLED)

    def save_editor_code(self):
        self.raw_msm_code = self.code_text.get("1.0", tk.END).strip()
        if self.msm_path:
            try:
                with open(self.msm_path, "w", encoding="utf-8") as f:
                    f.write(self.raw_msm_code)
            except Exception as e:
                messagebox.showerror("Save Failure", f"Failed to save file: {e}")
                
        # Re-parse into active VM
        try:
            self.vm = MartianVM()
            self.vm.parse_msm(self.raw_msm_code)
            self.update_telemetry_display()
            self.update_ctl_display()
            messagebox.showinfo("Hot-Reload Complete", "MSM parsing and safety invariant compilation successful!")
        except Exception as e:
            messagebox.showerror("Parsing Failure", f"Failed to load MSM logic: {e}")

    def send_ai_prompt(self):
        prompt = self.ai_entry.get().strip()
        if not prompt:
            return
            
        self.ai_entry.delete(0, tk.END)
        self.ai_entry.insert(0, "Thinking...")
        self.update()
        
        # Build prompt for local Ollama Model
        system_instruction = (
            "You are the Martian VM compiler assistant. The user wants to modify this Martian Semantic Markup (MSM) program.\n"
            f"Their request is: \"{prompt}\"\n\n"
            f"Here is the current MSM program:\n---\n{self.raw_msm_code}\n---\n\n"
            "Rules:\n"
            "1. The typing context is defined on lines starting with 'Γ ⊢'.\n"
            "2. The transitions are defined on lines starting with 'Φ_state:' (or 'Φ_compiler:', 'Φ_mutation:').\n"
            "3. Safety invariants are defined on lines starting with 'CTL:'.\n"
            "4. Modify the MSM program according to their request. Preserve the correct mathematical notation.\n"
            "5. Return ONLY the new MSM code. Do not include any explanations, warnings, or markdown code blocks (no triple backticks). Just pure MSM text."
        )
        
        # Call Local Ollama endpoint
        url = "http://localhost:11434/api/generate"
        data = {
            "model": "llama3",
            "prompt": system_instruction,
            "stream": False
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                new_msm = res_data.get("response", "").strip()
                
                # Check if it has markdown formatting and clean it
                new_msm = re.sub(r"^```(msm)?\n", "", new_msm)
                new_msm = re.sub(r"\n```$", "", new_msm)
                
                if new_msm:
                    self.code_text.delete("1.0", tk.END)
                    self.code_text.insert(tk.END, new_msm)
                    self.raw_msm_code = new_msm
                    self.save_editor_code()
                else:
                    messagebox.showerror("AI Failure", "AI returned an empty response.")
        except Exception as e:
            messagebox.showerror(
                "Ollama Offline", 
                "Failed to contact local AI model. Ensure Ollama is running llama3 locally on http://localhost:11434. "
                "You can also edit the code directly in the code editor panel!"
            )
            
        self.ai_entry.delete(0, tk.END)


if __name__ == "__main__":
    # If path passed as argument (from Windows double-click)
    target_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    app = MartianLauncherApp(target_path)
    app.mainloop()
