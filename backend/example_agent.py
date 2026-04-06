import sys
import requests
from playwright.sync_api import sync_playwright
from synapse_sdk import Synapse

# Use your actual Render URL and API Key
synapse = Synapse(api_key="syn-YOUR-KEY", base_url="https://synapse-backend-b5k1.onrender.com")
session_id = "god-mode-demo"
synapse.start_session(session_id=session_id, goal="Extract Top 3 AI Startups")

# Check current memory to see if we are recovering from a crash
res = requests.get(f"{synapse.base_url}/memory/session/{session_id}").json()
memories = [m['key'] for m in res.get('memories', [])]

def run_agent():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        if "top_3_startups" not in memories:
            # --- PHASE 1: INITIAL RUN ---
            input("\n[PRESS ENTER TO START AGENT ROUTINE]")
            print("🚀 Navigating to search engine...")
            page.goto("https://duckduckgo.com/")
            page.fill("input[name='q']", "Top 3 AI startups 2026")
            
            synapse.capture_step(page, "Initialize Search", "Typed query into DuckDuckGo")
            
            input("\n[PRESS ENTER TO EXECUTE SEARCH]")
            page.press("input[name='q']", "Enter")
            page.wait_for_load_state("networkidle")
            
            synapse.capture_step(page, "Search Results", "Landed on results page")
            
            print("🧠 Extracting data and saving to Synapse Memory...")
            # Simulate extraction
            synapse.save_memory("top_3_startups", "1. OpenAI, 2. Anthropic, 3. Perplexity")
            
            print("\n💥 FATAL ERROR: CONNECTION LOST!")
            print("❌ Backend instance terminated abruptly.")
            browser.close()
            sys.exit(1) # CRASH THE SCRIPT
            
        else:
            # --- PHASE 2: RECOVERY RUN ---
            input("\n[PRESS ENTER TO RESTART CRASHED AGENT]")
            print("🔄 Agent Restarting...")
            print("🧠 Checking Synapse Memory for previous state...")
            
            print("✅ Found 'top_3_startups' in cloud memory! Skipping Search Phase.")
            
            # Skip DuckDuckGo entirely and go straight to Wikipedia to write the report
            page.goto("https://en.wikipedia.org/wiki/Startup_company")
            synapse.capture_step(page, "Drafting Report", "Using recovered memory to draft final report.")
            
            print("\n✅ Task Complete! Agent successfully recovered and finished the job.")
            
        browser.close()

if __name__ == "__main__":
    run_agent()

