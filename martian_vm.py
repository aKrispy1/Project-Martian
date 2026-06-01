import os
import sys
import re
import json

# UTF-8 Console Reconfiguration to prevent Windows CP1252 encoding crashes on math symbols
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
if sys.stderr.encoding != 'utf-8':
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

class MartianVM:
    def __init__(self):
        self.variables = {}  # Symbol -> (Type, Value)
        self.transitions = [] # List of transitions
        self.ctl_invariants = [] # CTL expressions to check

    def parse_msm(self, msm_string):
        """Parse MSM blocks containing typings (Γ), transitions (Φ), and safety assertions (CTL)."""
        lines = [line.strip() for line in msm_string.split('\n') if line.strip()]
        
        for line in lines:
            # 1. Parse typing contexts: Γ ⊢ x : ℤ, y : ℤ
            if 'Γ ⊢' in line:
                decls = line.split('Γ ⊢')[1].split(',')
                for decl in decls:
                    if ':' in decl:
                        var_name, var_type = decl.split(':')
                        var_name = var_name.strip()
                        var_type = var_type.strip()
                        # Default initialization based on type
                        default_val = 0 if 'ℤ' in var_type or 'ℝ' in var_type else False
                        self.variables[var_name] = {'type': var_type, 'value': default_val}
                        print(f"[MSM Parser] Typed: {var_name} as {var_type}")

            # 2. Parse state transitions: Φ_state: ⟨x, y⟩ ⤞ ⟨x + y, x - y⟩
            elif 'Φ_state:' in line or 'Φ_mutation:' in line:
                match = re.search(r'⟨(.*?)⟩\s*⤞\s*⟨(.*?)⟩', line)
                if match:
                    inputs = [i.strip() for i in match.group(1).split(',')]
                    outputs = [o.strip() for o in match.group(2).split(',')]
                    self.transitions.append({'inputs': inputs, 'outputs': outputs})
                    print(f"[MSM Parser] Transition Registered: {inputs} ➔ {outputs}")

            # 3. Parse CTL invariant checks: CTL: AG(x > 0 ∧ y >= 0)
            elif 'CTL:' in line:
                match = re.search(r'CTL:\s*AG\((.*?)\)', line)
                if match:
                    expr = match.group(1).strip()
                    # Convert logic symbols to python operators
                    python_expr = expr.replace('∧', 'and').replace('∨', 'or').replace('¬', 'not')
                    self.ctl_invariants.append(python_expr)
                    print(f"[MSM Parser] Safety Invariant Registered: {python_expr}")

    def execute_transition(self, input_state):
        """Execute the transition on the VM stack and return the new state."""
        # Load input values into memory
        for var, val in input_state.items():
            if var in self.variables:
                self.variables[var]['value'] = val
            else:
                raise ValueError(f"Variable '{var}' is not defined in the typing context (Γ).")

        print(f"[VM Execution] Starting State: {input_state}")
        
        # We simulate the stack operations for the transitions
        output_state = {}
        for transition in self.transitions:
            # Map values
            for idx, out_expr in enumerate(transition['outputs']):
                out_var = transition['inputs'][idx]
                
                # Simple math expression evaluator
                eval_expr = out_expr
                for var in self.variables:
                    eval_expr = re.sub(r'\b' + var + r'\b', str(self.variables[var]['value']), eval_expr)
                
                # Evaluate expression mathematically
                # Safety note: eval_expr is sanitized by matching simple math operators
                sanitized_expr = re.sub(r'[^0-9+\-*/().\s]', '', eval_expr)
                try:
                    new_val = int(eval(sanitized_expr))
                except Exception as e:
                    new_val = 0
                    print(f"[VM Error] Execution failed for expression: {out_expr} -> {e}")

                output_state[out_var] = new_val
                
        # Update VM variables to new state
        for var, val in output_state.items():
            self.variables[var]['value'] = val

        print(f"[VM Execution] Transition Output State: {output_state}")

        # Check safety invariants
        self.verify_safety_invariants()
        return output_state

    def verify_safety_invariants(self):
        """Evaluate CTL safety properties on the current VM memory state."""
        for inv in self.ctl_invariants:
            eval_inv = inv
            # Replace variables with their values
            for var in self.variables:
                eval_inv = re.sub(r'\b' + var + r'\b', str(self.variables[var]['value']), eval_inv)
            
            try:
                # Evaluate boolean safety logic
                result = eval(eval_inv)
                if not result:
                    print(f"[CTL Violation] Safety assertion '{inv}' FAILED on state: {self.get_current_state()}")
                    return False
                else:
                    print(f"[CTL Safety] Verification check '{inv}' passed.")
            except Exception as e:
                print(f"[CTL Error] Evaluation failed for invariant: {inv} -> {e}")
                return False
        return True

    def get_current_state(self):
        return {var: self.variables[var]['value'] for var in self.variables}

    def compile_to_wat(self):
        """Translate the parsed MSM state transition into WebAssembly Text format."""
        if not self.transitions:
            return ""

        wat_code = "(module\n"
        
        # Gather param lists
        variables_ordered = list(self.variables.keys())
        params_str = " ".join([f"(param ${v} i32)" for v in variables_ordered])
        results_str = " ".join(["(result i32)" for _ in variables_ordered])
        
        wat_code += f"  (func $transition {params_str} {results_str}\n"
        
        # We translate the expression output sequence
        # WebAssembly uses stack instructions. We push values onto the stack.
        # e.g., to compute x + y: local.get $x, local.get $y, i32.add
        for transition in self.transitions:
            for out_expr in transition['outputs']:
                # Parse operators
                if '+' in out_expr:
                    parts = [p.strip() for p in out_expr.split('+')]
                    for part in parts:
                        if part in self.variables:
                            wat_code += f"    local.get ${part}\n"
                        else:
                            wat_code += f"    i32.const {part}\n"
                    wat_code += "    i32.add\n"
                elif '-' in out_expr:
                    parts = [p.strip() for p in out_expr.split('-')]
                    for part in parts:
                        if part in self.variables:
                            wat_code += f"    local.get ${part}\n"
                        else:
                            wat_code += f"    i32.const {part}\n"
                    wat_code += "    i32.sub\n"
                else:
                    # Single constant or variable
                    if out_expr in self.variables:
                        wat_code += f"    local.get ${out_expr}\n"
                    else:
                        wat_code += f"    i32.const {out_expr}\n"
                        
        wat_code += "  )\n"
        wat_code += "  (export \"transition\" (func $transition))\n"
        wat_code += ")\n"
        
        return wat_code

def main():
    print("---------------------------------------------")
    print("Project Martian Virtual Machine & Compiler")
    print("---------------------------------------------")
    
    # 1. Define a sample MSM logic block (Recursive shape-shifting state accumulator)
    msm_sample = """
    Γ ⊢ x : ℤ, y : ℤ
    Φ_state: ⟨x, y⟩ ⤞ ⟨x + y, x - y⟩
    CTL: AG(x >= 0 ∧ y >= -1000)
    """
    
    print("\n[Step 1] Ingesting MSM Logic block...")
    vm = MartianVM()
    vm.parse_msm(msm_sample)
    
    # 2. Execute transition in the VM
    print("\n[Step 2] Executing VM state transitions...")
    state_0 = {'x': 10, 'y': 5}
    state_1 = vm.execute_transition(state_0)
    state_2 = vm.execute_transition(state_1)
    
    # 3. Compile to WebAssembly (WAT) representation
    print("\n[Step 3] Compiling MSM Logic to WebAssembly Text (WAT)...")
    wat_output = vm.compile_to_wat()
    print("Generated WAT Bytecode:\n")
    print(wat_output)
    
    # Save WAT output to docs/compiled_output.wat
    os.makedirs("docs", exist_ok=True)
    with open("docs/compiled_output.wat", "w", encoding="utf-8") as f:
        f.write(wat_output)
    print("[Compiler Success] Compiled output saved to docs/compiled_output.wat")

if __name__ == "__main__":
    main()
