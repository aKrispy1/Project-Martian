import os
import sys
import json
import math

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

# Physics Constants
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K
ROOM_TEMPERATURE = 293.15           # Kelvin (20 C)
JOULES_TO_EV = 6.241509e18          # Conversion factor

class LandauerSimulator:
    def __init__(self, cycles=10000):
        self.cycles = cycles
        self.temp = ROOM_TEMPERATURE
        # Landauer limit in Joules per bit erased: E = kT ln(2)
        self.landauer_joules_per_bit = BOLTZMANN_CONSTANT * self.temp * math.log(2)
        self.landauer_ev_per_bit = self.landauer_joules_per_bit * JOULES_TO_EV

    def run_simulation(self):
        """Simulate irreversible standard computations vs. reversible Martian operations."""
        print(f"[Simulator] Initializing thermal simulation at {self.temp} K...")
        print(f"[Simulator] Theoretical Landauer Limit: {self.landauer_joules_per_bit:.5e} Joules/bit ({self.landauer_ev_per_bit * 1000:.3f} meV/bit)")
        
        # Accumulators
        irreversible_bits_erased = 0
        reversible_bits_erased = 0
        
        data_points = []
        
        for cycle in range(1, self.cycles + 1):
            # 1. Standard Irreversible Operation: Instruction Erasure
            # Let's simulate a standard register overwrite or bitwise operation.
            # AND gate: merges states (2 inputs map to 1, erases on average 1 bit of information per operation)
            # Standard addition (x = x + y): overwrites register x, erasing its previous state (erases 32 bits for a 32-bit integer!)
            # We assume a standard compiler erases approximately 2.4 bits per logic gate cycle.
            erased_in_cycle = 2.4
            irreversible_bits_erased += erased_in_cycle
            
            # 2. Reversible Martian Operation: Toffoli/History preservation
            # Under Martian MSM Λ_reversible rules: ⟨x, y, 0⟩ ⇌ ⟨x, y, x + y⟩ (Bijective mapping, zero bits erased)
            # All states are preserved in the execution history or recycled back to registers.
            reversible_bits_erased += 0.0  # Zero erasure
            
            # Calculate energies
            irrev_energy_j = irreversible_bits_erased * self.landauer_joules_per_bit
            irrev_energy_ev = irrev_energy_j * JOULES_TO_EV
            
            rev_energy_j = reversible_bits_erased * self.landauer_joules_per_bit
            rev_energy_ev = rev_energy_j * JOULES_TO_EV
            
            # Save data points at regular intervals for plotting (e.g. 50 points)
            if cycle % (self.cycles // 50) == 0 or cycle == 1:
                data_points.append({
                    "cycle": cycle,
                    "irreversible_bits": round(irreversible_bits_erased, 1),
                    "irreversible_energy_j": irrev_energy_j,
                    "irreversible_energy_ev": irrev_energy_ev,
                    "reversible_bits": round(reversible_bits_erased, 1),
                    "reversible_energy_j": rev_energy_j,
                    "reversible_energy_ev": rev_energy_ev
                })
                
        # Final summary stats
        summary = {
            "temperature_k": self.temp,
            "total_cycles": self.cycles,
            "irreversible": {
                "total_bits_erased": round(irreversible_bits_erased, 1),
                "total_energy_dissipated_joules": irreversible_bits_erased * self.landauer_joules_per_bit,
                "total_energy_dissipated_ev": (irreversible_bits_erased * self.landauer_joules_per_bit) * JOULES_TO_EV
            },
            "reversible": {
                "total_bits_erased": round(reversible_bits_erased, 1),
                "total_energy_dissipated_joules": reversible_bits_erased * self.landauer_joules_per_bit,
                "total_energy_dissipated_ev": (reversible_bits_erased * self.landauer_joules_per_bit) * JOULES_TO_EV
            },
            "simulation_curve": data_points
        }
        
        # Save output to docs/landauer_stats.json
        os.makedirs("docs", exist_ok=True)
        with open("docs/landauer_stats.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
            
        print(f"[Simulator Success] Simulation data written to docs/landauer_stats.json")
        print(f"  * Irreversible Energy: {summary['irreversible']['total_energy_dissipated_ev']:.3e} eV")
        print(f"  * Reversible Energy: {summary['reversible']['total_energy_dissipated_ev']:.3e} eV (Entropy Conserved)")

def main():
    print("-------------------------------------------------")
    print("Landauer Thermodynamic Limit Computations")
    print("-------------------------------------------------")
    sim = LandauerSimulator(cycles=10000)
    sim.run_simulation()

if __name__ == "__main__":
    main()
