import os
import sys
import json
import re

# UTF-8 Console Reconfiguration
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

class KripkeState:
    def __init__(self, variables_dict):
        self.variables = dict(variables_dict)
        # Unique state key
        self.key = self.get_key()

    def get_key(self):
        sorted_items = sorted(self.variables.items())
        # Convert list to tuple to make it hashable
        val_str = []
        for k, v in sorted_items:
            if isinstance(v, list):
                val_str.append(f"{k}:{tuple(v)}")
            else:
                val_str.append(f"{k}:{v}")
        return ";".join(val_str)

    def __eq__(self, other):
        return self.key == other.key

    def __hash__(self):
        return hash(self.key)

    def __repr__(self):
        return f"State({self.variables})"


class CTLModelChecker:
    def __init__(self, initial_state, transition_fn, max_depth=15):
        self.initial_state = KripkeState(initial_state)
        self.transition_fn = transition_fn # state -> list of KripkeStates
        self.max_depth = max_depth
        
        # Build the transition graph
        self.states = {} # key -> KripkeState
        self.transitions = {} # KripkeState -> set of KripkeStates
        self.build_graph()

    def build_graph(self):
        queue = [(self.initial_state, 0)]
        self.states[self.initial_state.key] = self.initial_state
        
        while queue:
            curr_state, depth = queue.pop(0)
            
            if depth >= self.max_depth:
                continue
                
            next_states = self.transition_fn(curr_state.variables)
            curr_transitions = self.transitions.setdefault(curr_state, set())
            
            for ns_vars in next_states:
                ns = KripkeState(ns_vars)
                if ns.key not in self.states:
                    self.states[ns.key] = ns
                    queue.append((ns, depth + 1))
                else:
                    ns = self.states[ns.key]
                curr_transitions.add(ns)

    # ==========================================
    # CTL TEMPORAL OPERATORS
    # ==========================================
    
    def check_predicate(self, state, pred_fn):
        return pred_fn(state.variables)

    def eval_EX(self, pred_fn):
        """EX p: There exists a next state where p holds."""
        results = {}
        for state in self.states.values():
            next_states = self.transitions.get(state, set())
            results[state] = any(self.check_predicate(ns, pred_fn) for ns in next_states)
        return results

    def eval_AX(self, pred_fn):
        """AX p: For all next states, p holds."""
        results = {}
        for state in self.states.values():
            next_states = self.transitions.get(state, set())
            if not next_states:
                results[state] = False
            else:
                results[state] = all(self.check_predicate(ns, pred_fn) for ns in next_states)
        return results

    def eval_EF(self, pred_fn):
        """EF p: There exists a path where p eventually holds."""
        results = {}
        # Simple backward reachability
        satisfied = {state for state in self.states.values() if self.check_predicate(state, pred_fn)}
        
        changed = True
        while changed:
            changed = False
            for state in self.states.values():
                if state not in satisfied:
                    next_states = self.transitions.get(state, set())
                    if any(ns in satisfied for ns in next_states):
                        satisfied.add(state)
                        changed = True
                        
        for state in self.states.values():
            results[state] = state in satisfied
        return results

    def eval_AF(self, pred_fn):
        """AF p: For all paths, p eventually holds."""
        results = {}
        satisfied = {state for state in self.states.values() if self.check_predicate(state, pred_fn)}
        
        # Fixed point iteration
        changed = True
        while changed:
            changed = False
            for state in self.states.values():
                if state not in satisfied:
                    next_states = self.transitions.get(state, set())
                    if next_states and all(ns in satisfied for ns in next_states):
                        satisfied.add(state)
                        changed = True
                        
        for state in self.states.values():
            results[state] = state in satisfied
        return results

    def eval_EG(self, pred_fn):
        """EG p: There exists a path where p always holds."""
        results = {}
        # Start with all states satisfying predicate, iteratively remove those that cannot step to a satisfied state
        satisfied = {state for state in self.states.values() if self.check_predicate(state, pred_fn)}
        
        changed = True
        while changed:
            changed = False
            to_remove = set()
            for state in satisfied:
                next_states = self.transitions.get(state, set())
                if not any(ns in satisfied for ns in next_states):
                    to_remove.add(state)
            if to_remove:
                satisfied -= to_remove
                changed = True
                
        for state in self.states.values():
            results[state] = state in satisfied
        return results

    def eval_AG(self, pred_fn):
        """AG p: For all paths, p always holds."""
        # AG p is equivalent to not EF(not p)
        neg_pred = lambda vars: not pred_fn(vars)
        ef_neg = self.eval_EF(neg_pred)
        
        results = {}
        for state, val in ef_neg.items():
            results[state] = not val
        return results

    def get_counterexample_EF(self, pred_fn):
        """Retrieve path violating AG(not p) which is a counterexample for EF p."""
        # Find shortest path from initial_state to a state satisfying predicate
        visited = {self.initial_state: None}
        queue = [self.initial_state]
        target = None
        
        while queue:
            curr = queue.pop(0)
            if self.check_predicate(curr, pred_fn):
                target = curr
                break
            for ns in self.transitions.get(curr, set()):
                if ns not in visited:
                    visited[ns] = curr
                    queue.append(ns)
                    
        if target is None:
            return None
            
        path = []
        curr = target
        while curr is not None:
            path.insert(0, curr.variables)
            curr = visited[curr]
        return path


def main():
    print("========================================")
    print("Computational Tree Logic Model Checker")
    print("========================================")

    # 1. Compiler Transitions Model
    print("\n[Model Checker] Initializing compiler verification transitions...")
    # State maps pc, wat_len
    compiler_initial = {
        "pc": 0,
        "wat_len": 0
    }

    def compiler_transition(state):
        pc = state["pc"]
        wat_len = state["wat_len"]
        
        # Bounded simulation halts when pc reaches 3 (length of "x+y")
        if pc >= 3:
            return []
            
        # Transition depends on input character: 'x' (120), '+' (43), 'y' (121)
        # This branches!
        nexts = []
        # Case A: Reading 'x' or 'y' (increases wat_len by 14, pc by 1)
        nexts.append({"pc": pc + 1, "wat_len": wat_len + 14})
        # Case B: Reading '+' (increases wat_len by 8, pc by 1)
        nexts.append({"pc": pc + 1, "wat_len": wat_len + 8})
        
        return nexts

    checker = CTLModelChecker(compiler_initial, compiler_transition, max_depth=10)
    print(f"  * Explored {len(checker.states)} unique compiler states.")

    # Property 1: AG(pc >= 0) -> Safety
    p1 = lambda vars: vars["pc"] >= 0
    results_p1 = checker.eval_AG(p1)
    p1_verified = results_p1[checker.initial_state]
    print(f"  * Spec AG(pc >= 0): {'VERIFIED' if p1_verified else 'FAILED'}")

    # Property 2: AG(wat_len < 25) -> Safety bound.
    # This should fail because a trace of 2 variables 'x' and 'y' yields 14 + 14 = 28.
    p2 = lambda vars: vars["wat_len"] < 25
    results_p2 = checker.eval_AG(p2)
    p2_verified = results_p2[checker.initial_state]
    print(f"  * Spec AG(wat_len < 25): {'VERIFIED' if p2_verified else 'FAILED'}")
    
    counterexample = None
    if not p2_verified:
        # Counterexample is path to state where wat_len >= 25
        counterexample = checker.get_counterexample_EF(lambda vars: vars["wat_len"] >= 25)
        print("  * Counterexample Path:")
        for idx, step in enumerate(counterexample):
            print(f"    Step {idx}: pc={step['pc']}, wat_len={step['wat_len']}")

    # 2. CA Grid Transitions Model (4x4 checkerboard grid)
    print("\n[Model Checker] Initializing CA grid safety evaluations...")
    # Initial state with cell 0,0 set to 1
    ca_initial = {
        "c_0_0": 1, "c_0_1": 0, "c_0_2": 0, "c_0_3": 0,
        "c_1_0": 0, "c_1_1": 0, "c_1_2": 0, "c_1_3": 0,
        "c_2_0": 0, "c_2_1": 0, "c_2_2": 0, "c_2_3": 0,
        "c_3_0": 0, "c_3_1": 0, "c_3_2": 0, "c_3_3": 0
    }

    # Fetch crystallized gates from avst metrics if possible
    avst_path = "docs/avst_metrics.json"
    crystallized_gates = [2, 3, 2, 5, 3, 1, 0, 1, 5, 2, 4, 1, 2, 0, 0, 5]
    if os.path.exists(avst_path):
        try:
            with open(avst_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
                crystallized_gates = metrics["ca"]["crystallized_gates"]
        except Exception:
            pass

    def apply_gate(gate_type, left, top):
        if gate_type == 0: return left & top
        elif gate_type == 1: return left | top
        elif gate_type == 2: return left ^ top
        elif gate_type == 3: return 1 - left
        elif gate_type == 4: return 1 - (left & top)
        elif gate_type == 5: return 1 - (left | top)
        return 0

    def ca_transition(state):
        # Deterministic CA transition
        next_state = {}
        for r in range(4):
            for c in range(4):
                left = state[f"c_{r}_{(c-1)%4}"]
                top = state[f"c_{(r-1)%4}_{c}"]
                gate = crystallized_gates[r * 4 + c]
                next_state[f"c_{r}_{c}"] = apply_gate(gate, left, top)
        return [next_state] # Only 1 next state (deterministic)

    ca_checker = CTLModelChecker(ca_initial, ca_transition, max_depth=10)
    print(f"  * Explored {len(ca_checker.states)} unique states in CA transition cycles.")

    # Property: AG(c_0_0 >= 0) -> Safety bounds check
    ca_p1 = lambda vars: all(v >= 0 for v in vars.values())
    ca_p1_verified = ca_checker.eval_AG(ca_p1)[ca_checker.initial_state]
    print(f"  * Spec AG(all_cells >= 0): {'VERIFIED' if ca_p1_verified else 'FAILED'}")

    # Export model checking metrics
    verification_report = {
        "ctl_checker": {
            "compiler": {
                "states_explored": len(checker.states),
                "property_pc_non_negative": {
                    "formula": "AG(pc >= 0)",
                    "verified": p1_verified
                },
                "property_wat_len_bounded": {
                    "formula": "AG(wat_len < 25)",
                    "verified": p2_verified,
                    "counterexample": counterexample
                }
            },
            "ca_grid": {
                "states_explored": len(ca_checker.states),
                "property_cells_non_negative": {
                    "formula": "AG(all_cells >= 0)",
                    "verified": ca_p1_verified
                }
            }
        }
    }

    # Save to metrics report
    report_path = "docs/verification_metrics.json"
    # Merge if exists
    if os.path.exists(report_path):
        try:
            with open(report_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                existing.update(verification_report)
                verification_report = existing
        except Exception:
            pass

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(verification_report, f, indent=2)
    print(f"[Model Checker Success] Report exported to {report_path}")


if __name__ == "__main__":
    main()
