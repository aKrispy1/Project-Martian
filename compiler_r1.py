import os
import sys
import re
import json
import random

# UTF-8 Console Reconfiguration
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

class CompilerR1Env:
    def __init__(self, raw_wat_path):
        self.raw_wat_path = raw_wat_path
        self.raw_wat_lines = []
        self.load_wat()
        self.reset()

    def load_wat(self):
        if os.path.exists(self.raw_wat_path):
            with open(self.raw_wat_path, "r", encoding="utf-8") as f:
                self.raw_wat_lines = [line.rstrip() for line in f.readlines()]
        else:
            print(f"[Compiler-R1 Error] File {self.raw_wat_path} does not exist.")

    def reset(self):
        # Extract transition function body
        self.wat_lines = list(self.raw_wat_lines)
        self.transition_insts, self.start_idx, self.end_idx = self.parse_transition()
        self.local_decls = []
        self.history = [self.get_instruction_count()]
        self.applied_passes = []
        return self.get_state()

    def parse_transition(self):
        start_idx = -1
        end_idx = -1
        for idx, line in enumerate(self.wat_lines):
            if "(func $transition" in line:
                start_idx = idx
                break
        if start_idx == -1:
            return [], -1, -1
        
        # Count braces/parens to find end
        paren_count = 0
        for idx in range(start_idx, len(self.wat_lines)):
            line = self.wat_lines[idx]
            paren_count += line.count('(') - line.count(')')
            if paren_count <= 0 and idx > start_idx:
                end_idx = idx
                break
        if end_idx == -1:
            for idx in range(start_idx + 1, len(self.wat_lines)):
                if self.wat_lines[idx].strip() == ")" or (self.wat_lines[idx].strip() == "" and self.wat_lines[idx-1].strip() == ")"):
                    end_idx = idx
                    break
        
        body = []
        for line in self.wat_lines[start_idx+1 : end_idx]:
            stripped = line.strip()
            if stripped and not stripped.startswith("(") and not stripped.startswith(";"):
                body.append(stripped)
        return body, start_idx, end_idx

    def get_instruction_count(self):
        return len(self.transition_insts)

    def get_state(self):
        # State represented by counts of instructions
        count_const = sum(1 for inst in self.transition_insts if "i32.const" in inst)
        count_get = sum(1 for inst in self.transition_insts if "global.get" in inst or "local.get" in inst)
        count_set = sum(1 for inst in self.transition_insts if "global.set" in inst or "local.set" in inst)
        count_math = sum(1 for inst in self.transition_insts if any(op in inst for op in ["i32.add", "i32.sub", "i32.and", "i32.or", "i32.xor", "select"]))
        # Feature representation as a string state key
        return f"{count_const}_{count_get}_{count_set}_{count_math}_{len(self.transition_insts)}"

    # ==========================================
    # OPTIMIZATION PASSES
    # ==========================================
    
    def pass_constant_folding(self):
        """Fold adjacent constants. E.g. i32.const A, i32.const B, i32.add -> i32.const A+B"""
        new_insts = []
        i = 0
        folded = False
        while i < len(self.transition_insts):
            if i + 2 < len(self.transition_insts):
                inst1 = self.transition_insts[i]
                inst2 = self.transition_insts[i+1]
                inst3 = self.transition_insts[i+2]
                
                match1 = re.match(r"^i32\.const\s+(-?\d+)$", inst1)
                match2 = re.match(r"^i32\.const\s+(-?\d+)$", inst2)
                
                if match1 and match2:
                    val1 = int(match1.group(1))
                    val2 = int(match2.group(1))
                    result = None
                    if inst3 == "i32.add": result = val1 + val2
                    elif inst3 == "i32.sub": result = val1 - val2
                    elif inst3 == "i32.and": result = val1 & val2
                    elif inst3 == "i32.or": result = val1 | val2
                    elif inst3 == "i32.xor": result = val1 ^ val2
                    
                    if result is not None:
                        new_insts.append(f"i32.const {result}")
                        i += 3
                        folded = True
                        continue
            new_insts.append(self.transition_insts[i])
            i += 1
        self.transition_insts = new_insts
        return folded

    def pass_algebraic_simplification(self):
        """Simplify identities like X + 0 -> X, X ^ 0 -> X, 1 - (1 - X) -> X"""
        new_insts = []
        i = 0
        simplified = False
        while i < len(self.transition_insts):
            # 1 - (1 - X) double negation
            if i + 4 < len(self.transition_insts):
                if (self.transition_insts[i] == "i32.const 1" and
                    self.transition_insts[i+1] == "i32.const 1" and
                    (self.transition_insts[i+2].startswith("global.get") or self.transition_insts[i+2].startswith("local.get")) and
                    self.transition_insts[i+3] == "i32.sub" and
                    self.transition_insts[i+4] == "i32.sub"):
                    # Replace with just the load
                    new_insts.append(self.transition_insts[i+2])
                    i += 5
                    simplified = True
                    continue
            
            # X + 0, X - 0, X ^ 0 simplification
            if i + 1 < len(self.transition_insts):
                inst1 = self.transition_insts[i]
                inst2 = self.transition_insts[i+1]
                if inst1 == "i32.const 0" and inst2 in ["i32.add", "i32.xor", "i32.or"]:
                    # i32.const 0 is on top of stack, just remove both since it's identity
                    # wait, this works if stack has [X], then [X, 0], then [X ^ 0 = X]
                    i += 2
                    simplified = True
                    continue
            new_insts.append(self.transition_insts[i])
            i += 1
        self.transition_insts = new_insts
        return simplified

    def pass_cse(self):
        """Common Subexpression Elimination. Identify repeated src[pc] loads and cache in a local variable."""
        # Target expression pattern: global.get $pc, i32.const 4, i32.mul, i32.add, i32.load
        target_seq = [
            "i32.const 0",
            "global.get $pc",
            "i32.const 4",
            "i32.mul",
            "i32.add",
            "i32.load"
        ]
        
        # Count occurrences
        occurrences = 0
        i = 0
        while i <= len(self.transition_insts) - len(target_seq):
            if self.transition_insts[i:i+len(target_seq)] == target_seq:
                occurrences += 1
                i += len(target_seq)
            else:
                i += 1
                
        if occurrences > 1:
            # We will use local variable $src_pc
            local_name = "$src_pc"
            if local_name not in self.local_decls:
                self.local_decls.append(local_name)
            
            # Insert the caching load at the top of the instructions
            new_insts = [
                "i32.const 0",
                "global.get $pc",
                "i32.const 4",
                "i32.mul",
                "i32.add",
                "i32.load",
                f"local.set {local_name}"
            ]
            
            # Replace target sequences with local.get
            i = 0
            while i < len(self.transition_insts):
                if i <= len(self.transition_insts) - len(target_seq) and self.transition_insts[i:i+len(target_seq)] == target_seq:
                    new_insts.append(f"local.get {local_name}")
                    i += len(target_seq)
                else:
                    new_insts.append(self.transition_insts[i])
                    i += 1
            self.transition_insts = new_insts
            return True
        return False

    def pass_peephole_contraction(self):
        """Find peephole optimization patterns. E.g. c_0_2 = 1 - c_0_1 -> c_0_0 (direct substitution)"""
        # Let's search for sequences:
        # i32.const 1, global.get $c_0_1, i32.sub, global.set $c_0_2
        # where we know c_0_1 is 1 - c_0_0, so c_0_2 can just be global.get $c_0_0, global.set $c_0_2
        # We can implement a simplified copy propagation replacement for CA variables!
        new_insts = []
        i = 0
        contracted = False
        
        # We know c_r_c variables are binary nodes.
        # c_r_1 is 1 - c_r_0
        # c_r_2 is 1 - c_r_1 -> c_r_0
        # Let's look for:
        # i32.const 1, global.get $c_R_1, i32.sub, global.set $c_R_2
        # and replace with global.get $c_R_0, global.set $c_R_2
        # And similar for other double negations:
        while i < len(self.transition_insts):
            if i + 3 < len(self.transition_insts):
                inst1 = self.transition_insts[i]
                inst2 = self.transition_insts[i+1]
                inst3 = self.transition_insts[i+2]
                inst4 = self.transition_insts[i+3]
                
                if inst1 == "i32.const 1" and inst2.startswith("global.get $c_") and inst3 == "i32.sub" and inst4.startswith("global.set $c_"):
                    # Check variable indices
                    # E.g. get $c_0_1, set $c_0_2
                    match_get = re.match(r"^global\.get\s+\$c_(\d+)_(\d+)$", inst2)
                    match_set = re.match(r"^global\.set\s+\$c_(\d+)_(\d+)$", inst4)
                    if match_get and match_set:
                        r_g, c_g = int(match_get.group(1)), int(match_get.group(2))
                        r_s, c_s = int(match_set.group(1)), int(match_set.group(2))
                        
                        # Check if they are in same row and c_s = c_g + 1, and c_g in [1, 2]
                        if r_g == r_s and c_s == c_g + 1 and c_g in [1, 2]:
                            # Double negation holds: c_g is 1 - c_(g-1), so 1 - c_g is c_(g-1)
                            prev_col = c_g - 1
                            new_insts.append(f"global.get $c_{r_g}_{prev_col}")
                            new_insts.append(inst4)
                            i += 4
                            contracted = True
                            continue
            new_insts.append(self.transition_insts[i])
            i += 1
            
        self.transition_insts = new_insts
        return contracted

    def step(self, action):
        """Execute one optimization pass."""
        prev_len = len(self.transition_insts)
        
        # Map actions to methods
        if action == 0:
            success = self.pass_constant_folding()
        elif action == 1:
            success = self.pass_algebraic_simplification()
        elif action == 2:
            success = self.pass_cse()
        elif action == 3:
            success = self.pass_peephole_contraction()
            
        current_len = len(self.transition_insts)
        reduction = prev_len - current_len
        
        # Reward is the instruction count reduction minus a small sequence penalty
        reward = float(reduction) - 0.1
        if not success:
            reward = -0.5 # penalty for useless pass
            
        self.applied_passes.append(action)
        self.history.append(current_len)
        
        return self.get_state(), reward, current_len

    def get_optimized_wat(self):
        """Reconstruct the optimized WAT lines."""
        opt_lines = list(self.wat_lines[:self.start_idx])
        # Reconstruct function definition with locals
        func_decl = self.wat_lines[self.start_idx]
        # Append locals
        opt_lines.append(func_decl)
        for loc in self.local_decls:
            opt_lines.append(f"    (local {loc} i32)")
            
        # Add optimized instructions
        for inst in self.transition_insts:
            opt_lines.append(f"    {inst}")
            
        # Append remainder
        opt_lines.extend(self.wat_lines[self.end_idx:])
        return "\n".join(opt_lines) + "\n"


class CompilerR1Agent:
    def __init__(self, actions=[0, 1, 2, 3]):
        self.actions = actions
        self.q_table = {}
        self.alpha = 0.2
        self.gamma = 0.9
        self.epsilon = 0.3

    def choose_action(self, state, exploit=False):
        if not exploit and random.random() < self.epsilon:
            return random.choice(self.actions)
        q_vals = self.q_table.get(state, [0.0] * len(self.actions))
        max_q = max(q_vals)
        best_actions = [i for i, q in enumerate(q_vals) if q == max_q]
        return random.choice(best_actions)

    def learn(self, state, action, reward, next_state):
        q_vals = self.q_table.setdefault(state, [0.0] * len(self.actions))
        next_q_vals = self.q_table.setdefault(next_state, [0.0] * len(self.actions))
        best_next_q = max(next_q_vals)
        # Bellman Equation
        q_vals[action] += self.alpha * (reward + self.gamma * best_next_q - q_vals[action])


def main():
    print("==========================================")
    print("Compiler-R1 Autotuner Reinforcement Learning")
    print("==========================================")
    
    os.makedirs("docs", exist_ok=True)
    
    target_files = [
        ("docs/ca_crystallized.wat", "docs/ca_crystallized_optimized.wat"),
        ("docs/compiler_executable.wat", "docs/compiler_executable_optimized.wat")
    ]
    
    metrics_history = {}
    
    for input_file, output_file in target_files:
        if not os.path.exists(input_file):
            print(f"[Compiler-R1 Warning] Target file {input_file} not found. Skipping.")
            continue
            
        print(f"\n[RL Optimize] Tuning {input_file}...")
        env = CompilerR1Env(input_file)
        agent = CompilerR1Agent()
        
        episodes_log = []
        
        # Training Phase
        num_episodes = 100
        for ep in range(num_episodes):
            state = env.reset()
            total_reward = 0
            steps = 0
            # Decay epsilon
            agent.epsilon = max(0.05, 0.3 - (ep / float(num_episodes)))
            
            while steps < 5:
                action = agent.choose_action(state)
                next_state, reward, inst_count = env.step(action)
                agent.learn(state, action, reward, next_state)
                state = next_state
                total_reward += reward
                steps += 1
                
            episodes_log.append({
                "episode": ep + 1,
                "reward": total_reward,
                "instructions": env.history[-1]
            })
            
        # Greedy evaluation to find the best pass sequence
        env.reset()
        state = env.get_state()
        passes_name = ["Constant Folding", "Algebraic Simplification", "CSE", "Peephole Contraction"]
        applied_pass_names = []
        
        initial_count = env.get_instruction_count()
        print(f"  * Initial instruction count: {initial_count}")
        
        for step in range(5):
            action = agent.choose_action(state, exploit=True)
            prev_count = env.get_instruction_count()
            state, reward, current_count = env.step(action)
            if current_count < prev_count:
                applied_pass_names.append(passes_name[action])
                print(f"  * Pass [{passes_name[action]}]: {prev_count} -> {current_count} instructions")
            else:
                # No change, break early
                break
                
        final_count = env.get_instruction_count()
        reduction = initial_count - final_count
        reduction_pct = (reduction / float(initial_count)) * 100 if initial_count > 0 else 0
        
        print(f"  * Optimized instruction count: {final_count} (Reduced by {reduction_pct:.2f}%)")
        print(f"  * Optimal sequence: {applied_pass_names if applied_pass_names else 'None (Already Optimal)'}")
        
        # Save optimized WAT
        optimized_wat = env.get_optimized_wat()
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(optimized_wat)
        print(f"[Compiler-R1 Success] Optimized WAT written to {output_file}")
        
        metrics_history[os.path.basename(input_file)] = {
            "initial_instructions": initial_count,
            "final_instructions": final_count,
            "reduction_percentage": reduction_pct,
            "optimal_sequence": applied_pass_names,
            "episodes": episodes_log
        }
        
    # Write metrics to JSON
    with open("docs/compiler_r1_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_history, f, indent=2)
    print("\n[Compiler-R1 Success] Optimization metrics saved to docs/compiler_r1_metrics.json")

if __name__ == "__main__":
    main()
