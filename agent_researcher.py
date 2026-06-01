import os
import sys
import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import ssl

# SSL Configuration for Windows Environments
try:
    ssl_context = ssl._create_unverified_context()
except AttributeError:
    ssl_context = None


# Configuration
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "llama3")
OUTPUT_FILE = "docs/research_log_msm.md"

def log(message):
    print(f"[Martian Agent] {message}")

def check_ollama():
    """Verify if the local Ollama service is running."""
    try:
        req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags")
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                models = [m['name'] for m in data.get('models', [])]
                log(f"Ollama is running. Available models: {', '.join(models)}")
                if any(MODEL_NAME in m for m in models):
                    log(f"Target model '{MODEL_NAME}' detected.")
                    return True
                else:
                    log(f"Warning: Target model '{MODEL_NAME}' not found in Ollama. Will try to auto-pull or fallback.")
                    return True
    except Exception as e:
        log(f"Error connecting to Ollama at {OLLAMA_HOST}: {e}")
        log("Please verify Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3`).")
        return False

def query_arxiv(query, max_results=5):
    """Query the free, un-authenticated arXiv API."""
    log(f"Searching arXiv for: '{query}'...")
    encoded_query = urllib.parse.quote(query)
    url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_query}&max_results={max_results}"
    
    try:
        with urllib.request.urlopen(url, timeout=10, context=ssl_context) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        # Namespaces in arXiv XML
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        papers = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns).text.strip().replace('\n', ' ')
            summary = entry.find('atom:summary', ns).text.strip().replace('\n', ' ')
            id_url = entry.find('atom:id', ns).text.strip()
            
            papers.append({
                'title': title,
                'abstract': summary,
                'url': id_url,
                'source': 'arXiv'
            })
        log(f"Found {len(papers)} papers on arXiv.")
        return papers
    except Exception as e:
        log(f"arXiv search error: {e}")
        return []

def query_semantic_scholar(query, limit=5):
    """Query the free Semantic Scholar search endpoint."""
    log(f"Searching Semantic Scholar for: '{query}'...")
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={encoded_query}&limit={limit}&fields=title,abstract,url,year"
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10, context=ssl_context) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        papers = []
        for item in data.get('data', []):
            title = item.get('title', '')
            abstract = item.get('abstract', '')
            paper_url = item.get('url', '')
            year = item.get('year', '')
            
            if abstract:  # Only compile papers that have abstracts
                papers.append({
                    'title': f"{title} ({year})" if year else title,
                    'abstract': abstract,
                    'url': paper_url,
                    'source': 'Semantic Scholar'
                })
        log(f"Found {len(papers)} papers on Semantic Scholar.")
        return papers
    except Exception as e:
        log(f"Semantic Scholar search error: {e}")
        return []

def generate_msm_compilation(papers, theme):
    """Feed the abstracts to Ollama and compile them into Martian Semantic Markup (MSM)."""
    if not papers:
        log("No research abstracts to compile.")
        return None
    
    log(f"Synthesizing {len(papers)} papers into Martian Semantic Markup (MSM) for theme '{theme}' via {MODEL_NAME}...")
    
    prompt_context = ""
    for idx, paper in enumerate(papers):
        prompt_context += f"Paper {idx+1}: {paper['title']}\nSource: {paper['source']}\nURL: {paper['url']}\nAbstract: {paper['abstract']}\n\n"
        
    prompt = f"""
You are the Lead Artificial Intelligence System Architect for Project Martian.
Your task is to take the following academic research abstracts regarding "{theme}" and compile them into the alien programming language specification called Martian Semantic Markup (MSM).

MSM is a high-entropy, token-minimized, non-human-readable representation designed to pass structural software architecture states and logic models directly to LLM contexts.

Rules for MSM generation:
1. Do NOT write verbose natural language descriptions. Use mathematical structures, logic symbols, type contexts, state matrices, and temporal operators.
2. Group the compilation by research sub-themes under '{theme}'.
3. For each sub-theme, generate a dense MSM block containing:
   - Typing context (e.g. Γ ⊢ state : Type)
   - State transition mappings (e.g. Φ_state: ⟨X⟩ ⤞ ⟨Y⟩)
   - Temporal logic assertions (e.g. CTL: AG(safe))
   - Reversible constraints (e.g. Λ_reversible: ⟨A⟩ ⇌ ⟨B⟩)
4. At the end of the block, append the academic source links for bootstrapping.

Here are the academic research papers to synthesize:
{prompt_context}

Please output the result in a clean Markdown format. Minimize human conversational filler in your output. Go straight to the MSM output blocks.
"""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }
    
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            f"{OLLAMA_HOST}/api/generate",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        # Increased timeout to 300 seconds (5 minutes) to avoid timeouts on local models
        with urllib.request.urlopen(req, timeout=300) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('response', '')
    except Exception as e:
        log(f"Ollama generation error: {e}")
        return None

def main():
    log("Starting Project Martian Autonomous Research Agent...")
    
    # Ensure docs folder exists
    os.makedirs("docs", exist_ok=True)
    
    ollama_active = check_ollama()
    
    # Define research queries mapping to Project Martian pillars
    queries = {
        "Polymorphic Compilation WASM/WASI": "polymorphic compilation WebAssembly WASI",
        "Reversible Computing & Landauer Limit": "reversible computing compiler Landauer limit",
        "Formal Verification (Alive2 & ACL2)": "formal verification compiler Alive2 ACL2"
    }
    
    # Initialize Output File with front-matter if it doesn't exist
    if not os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write("# Project Martian: Cumulative AI-Native Research Logs\n")
            f.write("> **Automated MSM (Martian Semantic Markup) syntheses synchronized via agent crawling sessions.**\n\n")

    for theme_name, query in queries.items():
        log(f"\n--- Processing Theme: {theme_name} ---")
        
        # Get papers from arXiv
        papers = []
        papers.extend(query_arxiv(query, max_results=3))
        
        # Wait to avoid Semantic Scholar rate limits
        time.sleep(2)
        papers.extend(query_semantic_scholar(query, limit=3))
        
        log(f"Retrieved {len(papers)} papers for '{theme_name}'.")
        
        if not papers:
            continue
            
        if ollama_active:
            msm_output = generate_msm_compilation(papers, theme_name)
            if msm_output:
                epoch_time = time.strftime("%Y-%m-%d %H:%M:%S")
                full_log_entry = f"\n## Theme: {theme_name} (Sync Epoch: {epoch_time})\n\n{msm_output}\n"
                
                with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                    f.write(full_log_entry)
                log(f"Successfully compiled and appended theme: {theme_name}")
            else:
                log(f"Failed to generate MSM output for theme: {theme_name}")
        else:
            log("Ollama is not running. Saving raw metadata of retrieved papers to fallback JSON instead.")
            fallback_file = f"docs/raw_research_{query.replace(' ', '_')}.json"
            with open(fallback_file, "w", encoding="utf-8") as f:
                json.dump(papers, f, indent=2)
            log(f"Saved raw academic metadata to: {fallback_file}")
            
        # Cooling down before next query search
        time.sleep(3)
        
    log("All research sweeps complete.")

if __name__ == "__main__":
    main()

