import os
import sys
import re
import json
import ast

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

def split_by_outer_commas(s):
    parts = []
    current = []
    depth = 0
    brackets = 0
    for char in s:
        if char == '(' or char == '⟨':
            depth += 1
            current.append(char)
        elif char == ')' or char == '⟩':
            depth -= 1
            current.append(char)
        elif char == '[':
            brackets += 1
            current.append(char)
        elif char == ']':
            brackets -= 1
            current.append(char)
        elif char == ',' and depth == 0 and brackets == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(char)
    parts.append("".join(current).strip())
    return [p for p in parts if p]

class MartianVM:
    def __init__(self):
        self.variables = {}  # Symbol -> {'type': str, 'value': obj}
        self.transitions = [] # List of transitions: {'inputs': list, 'outputs': list}
        self.ctl_invariants = [] # List of CTL expressions as strings
        self.step_counter = 0
        self.max_steps = 1000  # Ultrafinitist Chronos-Boundary step limit

    def parse_msm(self, msm_string):
        """Parse MSM blocks containing typings (Γ), transitions (Φ), and safety assertions (CTL)."""
        lines = [line.strip() for line in msm_string.split('\n') if line.strip()]
        
        for line in lines:
            # 1. Parse typing contexts: Γ ⊢ x : ℤ, arr : Vector[ℤ, 256]
            if 'Γ ⊢' in line:
                decls = split_by_outer_commas(line.split('Γ ⊢')[1])
                for decl in decls:
                    if ':' in decl:
                        var_name, var_type = decl.split(':')
                        var_name = var_name.strip()
                        var_type = var_type.strip()
                        
                        # Check for Vector type
                        if 'Vector' in var_type:
                            match_dim = re.search(r'Vector\[.*?,\s*(\d+)\]', var_type)
                            dim = int(match_dim.group(1)) if match_dim else 256
                            default_val = [0] * dim
                        else:
                            # Scalar: ℤ (integer), ℝ (real), 𝔹 (bool)
                            default_val = 0 if 'ℤ' in var_type or 'ℝ' in var_type else False
                        
                        self.variables[var_name] = {'type': var_type, 'value': default_val}
                        print(f"[MSM Parser] Typed: {var_name} as {var_type}")

            # 2. Parse state transitions: Φ_state: ⟨x, arr[idx]⟩ ⤞ ⟨x + 1, y⟩
            elif 'Φ_state:' in line or 'Φ_mutation:' in line or 'Φ_compiler:' in line:
                # Support both ⤞ and ➔ symbols
                match = re.search(r'⟨(.*?)⟩\s*(?:⤞|➔)\s*⟨(.*?)⟩', line)
                if match:
                    inputs = split_by_outer_commas(match.group(1))
                    outputs = split_by_outer_commas(match.group(2))
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
        """Execute a single transition cycle on the VM memory state."""
        # Load input values into memory
        for var, val in input_state.items():
            if var in self.variables:
                # If it's a vector, we copy the elements
                if isinstance(self.variables[var]['value'], list) and isinstance(val, list):
                    # Ensure same size or pad
                    size = len(self.variables[var]['value'])
                    self.variables[var]['value'] = val[:size] + [0] * max(0, size - len(val))
                else:
                    self.variables[var]['value'] = val
            else:
                # Initialize dynamically if not declared
                self.variables[var] = {'type': 'ℤ', 'value': val}

        print(f"[VM Execution] Starting State: {self.get_current_state()}")
        
        # Prepare evaluation local variables context
        local_context = {}
        for var in self.variables:
            local_context[var] = self.variables[var]['value']
            
        # Add helper function for inline Reversible conditionals / gates
        local_context['Toffoli'] = lambda a, b, c: c ^ (a & b)
        local_context['Fredkin_a'] = lambda c, a, b: b if c else a
        local_context['Fredkin_b'] = lambda c, a, b: a if c else b

        pending_updates = {}
        pending_vector_updates = {}

        # Evaluate transitions in parallel using the current state values
        for transition in self.transitions:
            for idx, out_expr in enumerate(transition['outputs']):
                out_var = transition['inputs'][idx]
                
                # Check for double-underscore security sandbox injection
                if '__' in out_expr or 'import' in out_expr or 'open' in out_expr:
                    raise ValueError(f"Security Sandbox Breach detected in expression: {out_expr}")
                
                # Clean mathematical notation to python-executable equivalents
                eval_expr = out_expr.replace('^', '**').replace('⊕', '^') # map standard math mapping
                
                try:
                    # Evaluate expression safely in local context
                    new_val = eval(eval_expr, {"__builtins__": None}, local_context)
                except Exception as e:
                    new_val = 0
                    print(f"[VM Error] Transition evaluation failed for: {out_expr} -> {e}")

                # Process assignment target
                match_idx = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\[(.*)\]$', out_var)
                if match_idx:
                    arr_name = match_idx.group(1)
                    idx_expr = match_idx.group(2)
                    try:
                        index_val = int(eval(idx_expr, {"__builtins__": None}, local_context))
                        pending_vector_updates[(arr_name, index_val)] = new_val
                    except Exception as e:
                        print(f"[VM Error] Index evaluation failed for array {arr_name}[{idx_expr}]: {e}")
                else:
                    pending_updates[out_var] = new_val

        # Apply updates
        for var, val in pending_updates.items():
            if var in self.variables:
                self.variables[var]['value'] = val
        for (arr_name, idx_val), val in pending_vector_updates.items():
            if arr_name in self.variables:
                if 0 <= idx_val < len(self.variables[arr_name]['value']):
                    self.variables[arr_name]['value'][idx_val] = val
                else:
                    print(f"[VM Warning] Out of bounds array write: {arr_name}[{idx_val}] = {val}")

        self.step_counter += 1
        if self.step_counter > self.max_steps:
            raise RecursionError(f"[Chronos-Boundary Violation] Bounded step limit {self.max_steps} exceeded.")

        # Check invariants
        self.verify_safety_invariants()
        return self.get_current_state()

    def verify_safety_invariants(self):
        """Evaluate CTL safety properties on the current VM memory state."""
        local_context = {var: self.variables[var]['value'] for var in self.variables}
        for inv in self.ctl_invariants:
            try:
                result = eval(inv, {"__builtins__": None}, local_context)
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
        state = {}
        for var in self.variables:
            val = self.variables[var]['value']
            # Return copy of list
            if isinstance(val, list):
                state[var] = list(val)
            else:
                state[var] = val
        return state

    def compile_to_wat(self):
        """Translate the parsed MSM state transitions into WebAssembly Text format."""
        if not self.transitions:
            return ""

        # Map vector storage base offsets
        vector_offsets = {}
        current_offset = 0
        
        wat_code = "(module\n"
        
        # Linear memory declaration for vectors
        has_vectors = False
        for var, details in self.variables.items():
            if 'Vector' in details['type']:
                vector_offsets[var] = current_offset
                match_dim = re.search(r'Vector\[.*?,\s*(\d+)\]', details['type'])
                dim = int(match_dim.group(1)) if match_dim else 256
                current_offset += dim * 4 # 4 bytes per 32-bit int
                has_vectors = True

        if has_vectors:
            # Declare 1 page (64KB) of memory
            wat_code += "  (memory (export \"memory\") 1)\n"

        # Declare WebAssembly Globals for scalars
        for var, details in self.variables.items():
            if 'Vector' not in details['type']:
                # Default const initialization
                default_val = details['value'] if isinstance(details['value'], (int, bool)) else 0
                wat_code += f"  (global ${var} (mut i32) (i32.const {int(default_val)}))\n"

        # Compile helper function AST compiler
        def compile_node(node):
            if isinstance(node, ast.Num):
                return f"    i32.const {node.n}\n"
            elif isinstance(node, ast.Constant):
                return f"    i32.const {int(node.value)}\n"
            elif isinstance(node, ast.Name):
                name = node.id
                if name in self.variables:
                    if 'Vector' in self.variables[name]['type']:
                        raise ValueError(f"Direct vector references are not allowed in operations: {name}")
                    return f"    global.get ${name}\n"
                elif name == 'Toffoli':
                    # Toffoli is handled inline or as CNOT / ternary patterns
                    pass
                raise ValueError(f"Unknown variable name: {name}")
            elif isinstance(node, ast.BinOp):
                left = compile_node(node.left)
                right = compile_node(node.right)
                op = ""
                if isinstance(node.op, ast.Add): op = "i32.add"
                elif isinstance(node.op, ast.Sub): op = "i32.sub"
                elif isinstance(node.op, ast.BitXor): op = "i32.xor"
                elif isinstance(node.op, ast.BitAnd): op = "i32.and"
                elif isinstance(node.op, ast.BitOr): op = "i32.or"
                else:
                    raise NotImplementedError(f"Operator {node.op} not implemented.")
                return f"{left}{right}    {op}\n"
            elif isinstance(node, ast.Subscript):
                # E.g. src[pc]
                if isinstance(node.value, ast.Name):
                    arr_name = node.value.id
                    if arr_name in vector_offsets:
                        base = vector_offsets[arr_name]
                        slice_node = node.slice
                        if hasattr(slice_node, 'value'):
                            index_node = slice_node.value
                        else:
                            index_node = slice_node
                        index_wat = compile_node(index_node)
                        wat = f"    i32.const {base}\n"
                        wat += index_wat
                        wat += "    i32.const 4\n"
                        wat += "    i32.mul\n"
                        wat += "    i32.add\n"
                        wat += "    i32.load\n"
                        return wat
                raise ValueError("Unsupported subscript target.")
            elif isinstance(node, ast.Call):
                # Handle special gates: Toffoli(a, b, c) -> c ^ (a & b)
                if isinstance(node.func, ast.Name) and node.func.id == 'Toffoli':
                    a_node, b_node, c_node = node.args
                    # Compile inline CNOT/CCNOT state:
                    a_wat = compile_node(a_node)
                    b_wat = compile_node(b_node)
                    c_wat = compile_node(c_node)
                    # c ^ (a & b)
                    wat = a_wat + b_wat + "    i32.and\n" + c_wat + "    i32.xor\n"
                    return wat
            elif isinstance(node, ast.Compare):
                # Support simple comparisons for conditionals
                left = compile_node(node.left)
                right = compile_node(node.comparators[0])
                op = node.ops[0]
                op_wat = ""
                if isinstance(op, ast.Eq): op_wat = "i32.eq"
                elif isinstance(op, ast.NotEq): op_wat = "i32.ne"
                elif isinstance(op, ast.Lt): op_wat = "i32.lt_s"
                elif isinstance(op, ast.LtE): op_wat = "i32.le_s"
                elif isinstance(op, ast.Gt): op_wat = "i32.gt_s"
                elif isinstance(op, ast.GtE): op_wat = "i32.ge_s"
                return f"{left}{right}    {op_wat}\n"
            elif isinstance(node, ast.IfExp):
                body = compile_node(node.body)
                orelse = compile_node(node.orelse)
                test = compile_node(node.test)
                return f"{body}{orelse}{test}    select\n"
            elif isinstance(node, ast.BoolOp):
                op = "i32.or" if isinstance(node.op, ast.Or) else "i32.and"
                wat = ""
                for idx, val in enumerate(node.values):
                    wat += compile_node(val)
                    if idx > 0:
                        wat += f"    {op}\n"
                return wat
            raise NotImplementedError(f"AST structure {type(node)} not supported in compiler.")

        # Create main execution transition loop
        wat_code += "  (func $transition (export \"transition\")\n"
        
        # Compile all transition outputs
        for transition in self.transitions:
            for idx, out_expr in enumerate(transition['outputs']):
                out_var = transition['inputs'][idx]
                
                # Check for subscript assignment, e.g. wat[wat_len]
                match_idx = re.match(r'^([a-zA-Z_][a-zA-Z0-9_]*)\[(.*)\]$', out_var)
                if match_idx:
                    arr_name = match_idx.group(1)
                    idx_expr = match_idx.group(2)
                    base = vector_offsets[arr_name]
                    
                    # Generate address calculation: base + index * 4
                    idx_node = ast.parse(idx_expr, mode="eval").body
                    idx_wat = compile_node(idx_node)
                    
                    wat_code += f"    i32.const {base}\n"
                    wat_code += idx_wat
                    wat_code += "    i32.const 4\n"
                    wat_code += "    i32.mul\n"
                    wat_code += "    i32.add\n"
                    
                    # Generate value calculation
                    val_node = ast.parse(out_expr, mode="eval").body
                    val_wat = compile_node(val_node)
                    wat_code += val_wat
                    
                    # Store
                    wat_code += "    i32.store\n"
                else:
                    # Global scalar assign
                    val_node = ast.parse(out_expr, mode="eval").body
                    val_wat = compile_node(val_node)
                    wat_code += val_wat
                    wat_code += f"    global.set ${out_var}\n"

        wat_code += "  )\n"
        
        # Add getters for globals to support telemetry retrieval from WASM runtime
        for var, details in self.variables.items():
            if 'Vector' not in details['type']:
                wat_code += f"  (func $get_{var} (export \"get_{var}\") (result i32)\n"
                wat_code += f"    global.get ${var}\n"
                wat_code += "  )\n"

        wat_code += ")\n"
        return wat_code

def main():
    print("---------------------------------------------")
    print("Project Martian Virtual Machine & Compiler v2")
    print("---------------------------------------------")
    
    # Simple verification test run of string vector manipulation and reversible gates
    msm_test = """
    Γ ⊢ src : Vector[ℤ, 256], wat : Vector[ℤ, 512], pc : ℤ, wat_len : ℤ, a : ℤ, b : ℤ, c : ℤ
    Φ_state: ⟨pc, wat_len, wat[wat_len], c⟩ ⤞ ⟨pc + 1, wat_len + 1, src[pc], Toffoli(a, b, c)⟩
    CTL: AG(pc >= 0 ∧ wat_len >= 0)
    """
    
    print("\n[Step 1] Ingesting Vector MSM block...")
    vm = MartianVM()
    vm.parse_msm(msm_test)
    
    # Initialize inputs
    input_state = {
        'src': [72, 69, 76, 76, 79], # "HELLO" ASCII codes
        'wat': [0] * 512,
        'pc': 0,
        'wat_len': 0,
        'a': 1,
        'b': 1,
        'c': 0
    }
    
    print("\n[Step 2] Executing VM transition cycles...")
    state = vm.execute_transition(input_state)
    state = vm.execute_transition(state)
    
    print(f"\nResulting output vector: {state['wat'][:5]}")
    print(f"Resulting gate state (c): {state['c']}")
    
    # Compile to WebAssembly (WAT) representation
    print("\n[Step 3] Compiling Vector MSM logic to WAT...")
    wat_output = vm.compile_to_wat()
    print("Generated WAT Bytecode:\n")
    print(wat_output)
    
    # Save WAT output
    os.makedirs("docs", exist_ok=True)
    with open("docs/compiled_output.wat", "w", encoding="utf-8") as f:
        f.write(wat_output)
    print("[Compiler Success] Compiled output saved to docs/compiled_output.wat")

if __name__ == "__main__":
    main()
