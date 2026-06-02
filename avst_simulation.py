import os
import sys
import random
import json
import time

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

class VSAEngine:
    def __init__(self, dimension=10000, seed=42):
        self.D = dimension
        random.seed(seed)
        # Pre-generate coordinate codebooks
        # 10 vectors for X axis, 10 for Y axis
        self.X = [self.generate_vector() for _ in range(10)]
        self.Y = [self.generate_vector() for _ in range(10)]
        # Context vector
        self.context = self.generate_vector()

    def generate_vector(self):
        """Generate a random binary hypervector of size D."""
        return [random.choice([0, 1]) for _ in range(self.D)]

    def bind(self, a, b):
        """Bitwise XOR represents binding in binary VSA spaces."""
        return [ai ^ bi for ai, bi in zip(a, b)]

    def unbind(self, a, b):
        """XOR is self-inverse, so unbinding is also XOR."""
        return self.bind(a, b)

    def bundle(self, vectors):
        """Bundling via majority-rule thresholding."""
        # Convert binary vectors to bipolar (-1, 1) sums
        sums = [0] * self.D
        for vec in vectors:
            for i in range(self.D):
                sums[i] += 1 if vec[i] == 1 else -1
        # Threshold back to binary
        return [1 if s >= 0 else 0 for s in sums]

    def similarity(self, a, b):
        """Cosine similarity in bipolar space."""
        # Cosine similarity in binary space matches: 1 - 2 * (Hamming distance / D)
        hamming_dist = sum(ai ^ bi for ai, bi in zip(a, b))
        cosine_sim = 1.0 - 2.0 * (hamming_dist / self.D)
        return cosine_sim

    def decode_position(self, pos_vector):
        """Scan coordinate grid combinations to find the highest match."""
        best_x, best_y = 0, 0
        best_sim = -2.0
        
        # We unbind context vector first: pos_vector_unbound = pos_vector ^ context
        pos_clean = self.unbind(pos_vector, self.context)
        
        for y in range(10):
            # Unbind Y[y] coordinate to check X candidates
            x_candidate_vector = self.unbind(pos_clean, self.Y[y])
            for x in range(10):
                sim = self.similarity(x_candidate_vector, self.X[x])
                if sim > best_sim:
                    best_sim = sim
                    best_x = x
                    best_y = y
        return best_x, best_y, best_sim

class DiffLogicCA:
    def __init__(self, size=4):
        self.size = size # keep small (4x4) for clean visualization and fast convergence
        self.num_gates = 6
        # AND (0), OR (1), XOR (2), NOT_L (3), NAND (4), NOR (5)
        # Initialize gate probability tables randomly
        self.gate_probs = []
        for _ in range(size * size):
            # Equal probability initialization
            self.gate_probs.append([1.0 / self.num_gates] * self.num_gates)

    def get_neighbors(self, r, c, grid):
        """Fetch left and top neighbors, wrapping boundaries."""
        left = grid[r][(c - 1) % self.size]
        top = grid[(r - 1) % self.size][c]
        return left, top

    def apply_gate(self, gate_type, left, top):
        if gate_type == 0: return left & top
        elif gate_type == 1: return left | top
        elif gate_type == 2: return left ^ top
        elif gate_type == 3: return 1 - left
        elif gate_type == 4: return 1 - (left & top)
        elif gate_type == 5: return 1 - (left | top)
        return 0

    def rollout(self, gate_selection, steps=5):
        """Simulate grid updates over steps using selected discrete gates."""
        # Initialize seed grid with cell (0,0) set to 1
        grid = [[0] * self.size for _ in range(self.size)]
        grid[0][0] = 1
        
        history = [self.flatten_grid(grid)]
        
        for _ in range(steps):
            new_grid = [[0] * self.size for _ in range(self.size)]
            for r in range(self.size):
                for c in range(self.size):
                    left, top = self.get_neighbors(r, c, grid)
                    gate = gate_selection[r * self.size + c]
                    new_grid[r][c] = self.apply_gate(gate, left, top)
            grid = new_grid
            history.append(self.flatten_grid(grid))
        return grid, history

    def flatten_grid(self, grid):
        return [cell for row in grid for cell in row]

    def stochastic_search(self, target_checkerboard, max_epochs=100):
        """Optimize gate selections using a simple evolutionary hill-climbing search."""
        current_selection = [random.randint(0, self.num_gates-1) for _ in range(self.size * self.size)]
        current_grid, _ = self.rollout(current_selection)
        current_error = self.evaluate_error(current_grid, target_checkerboard)
        
        errors = [current_error]
        
        for _ in range(max_epochs):
            # Mutate gate selection
            candidate = list(current_selection)
            idx_to_mutate = random.randint(0, len(candidate) - 1)
            candidate[idx_to_mutate] = random.randint(0, self.num_gates - 1)
            
            cand_grid, _ = self.rollout(candidate)
            cand_error = self.evaluate_error(cand_grid, target_checkerboard)
            
            if cand_error < current_error:
                current_selection = candidate
                current_error = cand_error
                current_grid = cand_grid
            errors.append(current_error)
            
            if current_error == 0:
                break
        return current_selection, current_grid, errors

    def evaluate_error(self, grid, target):
        error = 0
        for r in range(self.size):
            for c in range(self.size):
                if grid[r][c] != target[r][c]:
                    error += 1
        return error

    def export_to_msm(self, crystallized_gates):
        """Export the logic CA grid circuit as MSM transition rules."""
        msm = "Γ ⊢ "
        # Generate cell variables
        cell_names = [f"c_{r}_{c}" for r in range(self.size) for c in range(self.size)]
        msm += ", ".join([f"{name} : ℤ" for name in cell_names]) + "\n"
        
        # Generate inputs/outputs mappings
        inputs_str = ", ".join(cell_names)
        
        outputs = []
        for r in range(self.size):
            for c in range(self.size):
                # Neighbors mapping
                left_r, left_c = r, (c - 1) % self.size
                top_r, top_c = (r - 1) % self.size, c
                
                left_var = f"c_{left_r}_{left_c}"
                top_var = f"c_{top_r}_{top_c}"
                
                gate = crystallized_gates[r * self.size + c]
                # Express as python string formulas
                if gate == 0: expr = f"{left_var} & {top_var}"
                elif gate == 1: expr = f"{left_var} | {top_var}"
                elif gate == 2: expr = f"{left_var} ^ {top_var}"
                elif gate == 3: expr = f"1 - {left_var}"
                elif gate == 4: expr = f"1 - ({left_var} & {top_var})"
                elif gate == 5: expr = f"1 - ({left_var} | {top_var})"
                outputs.append(expr)
                
        outputs_str = ", ".join(outputs)
        msm += f"Φ_state: ⟨{inputs_str}⟩ ➔ ⟨{outputs_str}⟩\n"
        msm += f"CTL: AG(" + " ∧ ".join([f"{name} >= 0" for name in cell_names]) + ")\n"
        return msm

class MARLCoordinateGame:
    def __init__(self, vsa_engine):
        self.vsa = vsa_engine
        self.grid_size = 10
        # Initialize small Q-table for navigating toward relative target coordinates
        # State key format: (dx, dy) where dx, dy are relative target distances in [-9, 9]
        # Action actions: 0: UP, 1: DOWN, 2: LEFT, 3: RIGHT
        self.q_table = {}

    def get_actions(self):
        return [0, 1, 2, 3] # UP, DOWN, LEFT, RIGHT

    def get_state(self, rx, ry, tx, ty):
        return (tx - rx, ty - ry)

    def choose_action(self, state, epsilon=0.1):
        if random.random() < epsilon:
            return random.choice(self.get_actions())
        
        q_values = self.q_table.get(state, [0.0, 0.0, 0.0, 0.0])
        max_q = max(q_values)
        # Random choice in case of ties
        actions_max = [i for i, q in enumerate(q_values) if q == max_q]
        return random.choice(actions_max)

    def learn_q(self, state, action, reward, next_state, alpha=0.2, gamma=0.9):
        q_values = self.q_table.setdefault(state, [0.0, 0.0, 0.0, 0.0])
        next_q_values = self.q_table.setdefault(next_state, [0.0, 0.0, 0.0, 0.0])
        best_next_q = max(next_q_values)
        
        # Bellman update
        q_values[action] += alpha * (reward + gamma * best_next_q - q_values[action])

    def run_episode(self, tx, ty, epsilon=0.1, max_steps=20):
        # Runner starts at random position
        rx = random.randint(0, self.grid_size - 1)
        ry = random.randint(0, self.grid_size - 1)
        
        # 1. Observer binds coords into a single message
        pos_vector = self.vsa.bind(self.vsa.X[tx], self.vsa.Y[ty])
        # Add context vector binding to secure signal channel
        msg_vector = self.vsa.bind(pos_vector, self.vsa.context)
        
        # 2. Runner decodes hint target coordinates
        dec_x, dec_y, sim = self.vsa.decode_position(msg_vector)
        
        trajectory = [[rx, ry]]
        success = False
        total_reward = 0.0
        
        # Run navigation rollout
        for step in range(max_steps):
            if rx == dec_x and ry == dec_y:
                success = True
                break
                
            state = self.get_state(rx, ry, dec_x, dec_y)
            action = self.choose_action(state, epsilon)
            
            # Perform action
            if action == 0 and ry > 0: ry -= 1 # UP
            elif action == 1 and ry < self.grid_size - 1: ry += 1 # DOWN
            elif action == 2 and rx > 0: rx -= 1 # LEFT
            elif action == 3 and rx < self.grid_size - 1: rx += 1 # RIGHT
            
            next_state = self.get_state(rx, ry, dec_x, dec_y)
            
            # Reward
            if rx == dec_x and ry == dec_y:
                reward = 10.0
            else:
                reward = -0.1
                
            total_reward += reward
            self.learn_q(state, action, reward, next_state)
            trajectory.append([rx, ry])
            
        return {
            "success": success,
            "steps": len(trajectory) - 1,
            "trajectory": trajectory,
            "decoded_sim": sim,
            "decoded_coords": [dec_x, dec_y]
        }

def main():
    print("=======================================")
    print("Project Martian Phase Five AVST Core Simulator")
    print("=======================================")
    
    # 1. Initialize VSA
    print("[VSA Engine] Initializing codebook hypervectors (D=10,000)...")
    vsa = VSAEngine()
    
    # Run unbinding and noise tests
    print("[VSA Test] Testing coordinate binding and noise robustness...")
    test_tx, test_ty = 4, 7
    pos_encoded = vsa.bind(vsa.X[test_tx], vsa.Y[test_ty])
    pos_encoded_ctx = vsa.bind(pos_encoded, vsa.context)
    
    # Check unbind accuracy
    dec_x, dec_y, init_sim = vsa.decode_position(pos_encoded_ctx)
    print(f"  * Unbound targets: Target ({test_tx}, {test_ty}) -> Decoded ({dec_x}, {dec_y}) | Similarity: {init_sim:.4f}")
    assert dec_x == test_tx and dec_y == test_ty, "VSA Clean Decode Failed!"
    
    # Inject noise (flip 15% of bits)
    noise_ratio = 0.15
    noisy_vector = list(pos_encoded_ctx)
    flip_indices = random.sample(range(vsa.D), int(vsa.D * noise_ratio))
    for idx in flip_indices:
        noisy_vector[idx] = 1 - noisy_vector[idx]
        
    dec_x_n, dec_y_n, noise_sim = vsa.decode_position(noisy_vector)
    print(f"  * Decoded under 15% noise: Decoded ({dec_x_n}, {dec_y_n}) | Similarity: {noise_sim:.4f}")
    
    # 2. Run Cellular Automata Stochastic Gate Search
    print("\n[DiffLogic CA] Starting Stochastic Gate Search on 4x4 grid...")
    ca = DiffLogicCA(size=4)
    # Define target 4x4 checkerboard pattern
    target_checkerboard = [
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1]
    ]
    
    crystallized_gates, evolved_grid, errors = ca.stochastic_search(target_checkerboard, max_epochs=200)
    print(f"  * Gate search error: Evolved {errors[-1]} mismatched cells after {len(errors)} epochs.")
    
    # Run rollout trace
    _, grid_history = ca.rollout(crystallized_gates, steps=10)
    
    # Export crystallized CA code to Martian Semantic Markup (MSM)
    msm_exported = ca.export_to_msm(crystallized_gates)
    print("\n--- Exported Logic Circuit as MSM Transitions ---")
    print(msm_exported)
    print("-------------------------------------------------\n")
    
    # 2b. VM Compilation Bridge: compile the exported CA MSM to WebAssembly
    print("[VM Bridge] Importing MartianVM to compile evolved logic layout...")
    try:
        from martian_vm import MartianVM
        bridge_vm = MartianVM()
        bridge_vm.parse_msm(msm_exported)
        
        # Prepare initial cell state input
        initial_cell_state = {}
        for r in range(ca.size):
            for c in range(ca.size):
                initial_cell_state[f"c_{r}_{c}"] = evolved_grid[r][c]
                
        # Run one execution transition cycle in the VM to check safety
        bridge_vm.execute_transition(initial_cell_state)
        
        # Compile to WebAssembly
        ca_wat = bridge_vm.compile_to_wat()
        with open("docs/ca_crystallized.wat", "w", encoding="utf-8") as f:
            f.write(ca_wat)
        print("[VM Bridge Success] Evolved logic grid compiled to docs/ca_crystallized.wat")
    except Exception as e:
        print(f"[VM Bridge Error] Compilation failed: {e}")
    
    # 3. Train and simulate MARL coordinate game rover
    print("[MARL Game] Training rover coordinate Q-policy over 200 episodes...")
    game = MARLCoordinateGame(vsa)
    
    # Pre-train
    for episode in range(200):
        tx = random.randint(0, 9)
        ty = random.randint(0, 9)
        # decaying epsilon
        eps = max(0.01, 1.0 - (episode / 150.0))
        game.run_episode(tx, ty, epsilon=eps)
        
    # Run simulation evaluations
    print("[MARL Game] Running evaluations...")
    eval_episodes = []
    successes = 0
    for i in range(10):
        tx = random.randint(0, 9)
        ty = random.randint(0, 9)
        ep_data = game.run_episode(tx, ty, epsilon=0.0) # greedy rollout
        if ep_data["success"]:
            successes += 1
        eval_episodes.append({
            "target": [tx, ty],
            "decoded_coords": ep_data["decoded_coords"],
            "steps": ep_data["steps"],
            "success": ep_data["success"],
            "trajectory": ep_data["trajectory"],
            "similarity": ep_data["decoded_sim"]
        })
        
    success_rate = successes / 10.0
    print(f"  * Rover navigation success rate: {success_rate * 100}%")
    
    # 4. Save metrics database
    avst_metrics = {
        "vsa": {
            "dimension": vsa.D,
            "similarities": [init_sim, noise_sim],
            "noise_robustness_verified": dec_x_n == test_tx and dec_y_n == test_ty
        },
        "ca": {
            "grid_size": [ca.size, ca.size],
            "timesteps": 10,
            "patterns": grid_history,
            "crystallized_gates": crystallized_gates,
            "gate_search_errors": errors,
            "msm_exported": msm_exported
        },
        "marl": {
            "success_rate": success_rate,
            "episodes": eval_episodes
        }
    }
    
    os.makedirs("docs", exist_ok=True)
    with open("docs/avst_metrics.json", "w", encoding="utf-8") as f:
        json.dump(avst_metrics, f, indent=2)
    print("[Simulation Success] Telemetry database written to docs/avst_metrics.json")

if __name__ == "__main__":
    main()
