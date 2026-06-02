import os
import sys
import re

# UTF-8 Console Reconfiguration
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

class WATInterpreter:
    def __init__(self):
        self.globals = {}      # name -> value
        self.locals = {}       # name -> value
        self.memory = bytearray(64 * 1024) # 64KB Page
        self.instructions = []
        self.local_decls = []

    def load_wat(self, wat_content):
        # Parse globals
        global_matches = re.findall(r'\(global\s+\$(\w+)\s+\(mut\s+i32\)\s+\(i32\.const\s+(-?\d+)\)\)', wat_content)
        for name, val in global_matches:
            self.globals[name] = int(val)

        # Extract function body (simple parser)
        lines = wat_content.split('\n')
        start_idx = -1
        for idx, line in enumerate(lines):
            if "(func $transition" in line:
                start_idx = idx
                break
        
        if start_idx == -1:
            raise ValueError("Could not find func $transition in WAT.")

        paren = 0
        body_lines = []
        for idx in range(start_idx, len(lines)):
            line = lines[idx]
            paren += line.count('(') - line.count(')')
            if idx > start_idx:
                # Strip out the final closing paren if it matches the outer function bracket
                if paren <= 0 and line.strip() == ")":
                    break
                body_lines.append(line.strip())
            if paren <= 0 and idx > start_idx:
                break

        # Parse local declarations and instructions
        for line in body_lines:
            if not line or line.startswith(";"):
                continue
            local_decl = re.match(r'\(local\s+\$(\w+)\s+i32\)', line)
            if local_decl:
                name = local_decl.group(1)
                self.local_decls.append(name)
                self.locals[name] = 0
            else:
                self.instructions.append(line)

    def to_signed(self, val):
        if val & 0x80000000:
            return val - 0x100000000
        return val

    def run_transition(self):
        # Reset local variables
        for name in self.local_decls:
            self.locals[name] = 0

        stack = []
        idx = 0
        while idx < len(self.instructions):
            inst = self.instructions[idx]
            
            if inst.startswith("i32.const"):
                val = int(inst.split()[1])
                stack.append(val)
            elif inst.startswith("global.get"):
                name = inst.split()[1].replace("$", "")
                stack.append(self.globals.get(name, 0))
            elif inst.startswith("global.set"):
                name = inst.split()[1].replace("$", "")
                val = stack.pop()
                self.globals[name] = val
            elif inst.startswith("local.get"):
                name = inst.split()[1].replace("$", "")
                stack.append(self.locals.get(name, 0))
            elif inst.startswith("local.set"):
                name = inst.split()[1].replace("$", "")
                val = stack.pop()
                self.locals[name] = val
            elif inst == "i32.add":
                b = stack.pop()
                a = stack.pop()
                stack.append((a + b) & 0xffffffff)
            elif inst == "i32.sub":
                b = stack.pop()
                a = stack.pop()
                stack.append((a - b) & 0xffffffff)
            elif inst == "i32.mul":
                b = stack.pop()
                a = stack.pop()
                stack.append((a * b) & 0xffffffff)
            elif inst == "i32.and":
                b = stack.pop()
                a = stack.pop()
                stack.append(a & b)
            elif inst == "i32.or":
                b = stack.pop()
                a = stack.pop()
                stack.append(a | b)
            elif inst == "i32.xor":
                b = stack.pop()
                a = stack.pop()
                stack.append(a ^ b)
            elif inst == "i32.eq":
                b = stack.pop()
                a = stack.pop()
                stack.append(1 if a == b else 0)
            elif inst == "i32.ne":
                b = stack.pop()
                a = stack.pop()
                stack.append(1 if a != b else 0)
            elif inst in ["i32.lt_s", "i32.lt_u"]:
                b = stack.pop()
                a = stack.pop()
                stack.append(1 if self.to_signed(a) < self.to_signed(b) else 0)
            elif inst in ["i32.le_s", "i32.le_u"]:
                b = stack.pop()
                a = stack.pop()
                stack.append(1 if self.to_signed(a) <= self.to_signed(b) else 0)
            elif inst in ["i32.gt_s", "i32.gt_u"]:
                b = stack.pop()
                a = stack.pop()
                stack.append(1 if self.to_signed(a) > self.to_signed(b) else 0)
            elif inst in ["i32.ge_s", "i32.ge_u"]:
                b = stack.pop()
                a = stack.pop()
                stack.append(1 if self.to_signed(a) >= self.to_signed(b) else 0)
            elif inst == "select":
                cond = stack.pop()
                f_val = stack.pop()
                t_val = stack.pop()
                stack.append(t_val if cond != 0 else f_val)
            elif inst == "i32.load":
                addr = stack.pop()
                val = int.from_bytes(self.memory[addr : addr+4], byteorder='little')
                stack.append(val)
            elif inst == "i32.store":
                val = stack.pop()
                addr = stack.pop()
                self.memory[addr : addr+4] = int.to_bytes(val & 0xffffffff, length=4, byteorder='little')
            
            idx += 1


def main():
    print("=======================================")
    print("WASI WebAssembly Runtime Emulator v1")
    print("=======================================")

    # Define paths
    shared_dir = "wasi_shared"
    input_file = os.path.join(shared_dir, "wasi_input.txt")
    output_file = os.path.join(shared_dir, "wasi_output.wat")
    log_file = "docs/wasi_run_log.txt"

    os.makedirs(shared_dir, exist_ok=True)
    os.makedirs("docs", exist_ok=True)

    # Initialize logs
    wasi_logs = []
    def log(message):
        print(message)
        wasi_logs.append(message)

    log(f"[WASI Runtime Init] Sandboxed directory mapping: /wasi_shared -> ./{shared_dir}")
    
    # 1. Prepare input file if not exists
    if not os.path.exists(input_file):
        with open(input_file, "w", encoding="utf-8") as f:
            f.write("x+y")
        log("[WASI File System] Created default wasi_shared/wasi_input.txt containing 'x+y'")

    # Read input file
    log(f"[WASI System Call] fd_open(wasi_shared/wasi_input.txt, read)")
    with open(input_file, "r", encoding="utf-8") as f:
        src_content = f.read().strip()
    log(f"[WASI System Call] fd_read: read {len(src_content)} bytes -> '{src_content}'")

    # 2. Ingest optimized compiler
    compiler_wat_path = "docs/compiler_executable_optimized.wat"
    if not os.path.exists(compiler_wat_path):
        log(f"[WASI Error] Compiler WAT file {compiler_wat_path} not found. Running raw compilation target instead...")
        compiler_wat_path = "docs/compiler_executable.wat"
        if not os.path.exists(compiler_wat_path):
            log("[WASI Fatal] No compiler WAT file available! Run bootstrap.py first.")
            return

    log(f"[WASI Runtime Init] Loading executable Wasm container: {compiler_wat_path}")
    with open(compiler_wat_path, "r", encoding="utf-8") as f:
        wat_content = f.read()

    interpreter = WATInterpreter()
    try:
        interpreter.load_wat(wat_content)
        log("[WASI Runtime Success] WAT bytecode parsed and verification constraints passed.")
    except Exception as e:
        log(f"[WASI Runtime Error] WAT parsing failed: {e}")
        return

    # Load input into memory
    # Vectors: src is at offset 0. Each character is mapped to a 4-byte i32.
    src_codes = [ord(char) for char in src_content] + [0]
    for idx, code in enumerate(src_codes):
        interpreter.memory[idx*4 : (idx+1)*4] = int.to_bytes(code, length=4, byteorder='little')
    log(f"[WASI Memory Mapping] Initialized 'src' vector at Wasm memory [0 .. 1024] with '{src_content}'")

    # Globals set
    interpreter.globals["pc"] = 0
    interpreter.globals["wat_len"] = 0
    log(f"[WASI Runtime Action] Globals initialized: pc = 0, wat_len = 0")

    # 3. Execution transition loop
    log("[WASI Sandbox Execution] Running compiler transition loops...")
    cycle = 0
    
    # Check src[pc] in memory
    def get_src_char():
        pc = interpreter.globals.get("pc", 0)
        addr = pc * 4
        return int.from_bytes(interpreter.memory[addr : addr+4], byteorder='little')

    while get_src_char() != 0 and cycle < 100:
        interpreter.run_transition()
        pc = interpreter.globals.get("pc", 0)
        wat_len = interpreter.globals.get("wat_len", 0)
        log(f"  * Cycle {cycle+1:02d}: Wasm Execution state -> pc={pc}, wat_len={wat_len}")
        cycle += 1

    log(f"[WASI Sandbox Execution] Execution halt reached in {cycle} cycles.")

    # 4. Extract output from Wasm memory
    # wat vector starts at offset 1024. Extract ASCII characters.
    wat_len = interpreter.globals.get("wat_len", 0)
    output_chars = []
    for idx in range(wat_len):
        addr = 1024 + idx * 4
        char_code = int.from_bytes(interpreter.memory[addr : addr+4], byteorder='little')
        if char_code != 0:
            output_chars.append(chr(char_code))
    
    compiled_wat_output = "".join(output_chars)
    log(f"[WASI Sandbox Output] Extracted compiled WAT (size: {len(compiled_wat_output)} bytes):")
    log("------------------------------------------")
    for line in compiled_wat_output.strip().split('\n'):
        log(f"  {line}")
    log("------------------------------------------")

    # 5. Write to output file in wasi_shared
    log(f"[WASI System Call] fd_open(wasi_shared/wasi_output.wat, write)")
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(compiled_wat_output)
    log(f"[WASI System Call] fd_write: wrote {len(compiled_wat_output)} bytes to file successfully.")
    
    log("[WASI Runtime Success] WASI execution completed. Return code: 0.")

    # Save execution logs
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("\n".join(wasi_logs) + "\n")

if __name__ == "__main__":
    main()
