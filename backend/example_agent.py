import sys
import time
from playwright.sync_api import sync_playwright
from synapse_sdk import Synapse

# Initialize Synapse
synapse = Synapse(api_key="syn-YOUR-API-KEY-HERE")
session_id = "ai-research-crash-demo"
synapse.start_session(session_id=session_id, goal="Find top 3 AI agents and write a summary")

# --- SIMULATE WORKFLOW STATE ---
# In a full app, you'd fetch this from your /workflow/resume endpoint. 
# For the demo, we check if the memory already exists to know if we crashed!
import requests
res = requests.get(f"{synapse.base_url}/memory/session/{session_id}").json()
memories = [m['key'] for m in res.get('memories', [])]

def run_agent():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # STEP 1: The Research Phase
        if "top_3_agents" not in memories:
            print("🚀 Starting fresh: Navigating to research AI agents...")
            page.goto("https://duckduckgo.com/")
            page.fill("input[name='q']", "top AI agents 2026")
            page.press("input[name='q']", "Enter")
            page.wait_for_load_state("networkidle")
            
            synapse.capture_step(page, "Search Initiated", "Searched DuckDuckGo")
            
            # Extract and save
            print("🧠 Saving findings to Synapse Memory...")
            top_agents = "1. Devin, 2. AutoGPT, 3. Multi-On" # Simulated extraction
            synapse.save_memory("top_3_agents", top_agents)
            
            print("💥 FATAL ERROR: Server disconnected! Crashing now...")
            browser.close()
            sys.exit(1) # THIS KILLS THE SCRIPT DEAD
            
        # STEP 2: The Recovery Phase
        else:
            print("🔄 Agent Restarted. Checking Synapse Memory...")
            time.sleep(1)
            print("🧠 Found previous research! Skipping search phase.")
            
            # Proceed directly to next step without opening DuckDuckGo again
            page.goto("https://en.wikipedia.org/wiki/Intelligent_agent")
            synapse.capture_step(page, "Context Gathering", "Loading definitions to write summary")
            
            print("✅ Task Complete: Drafted summary based on recovered memory.")
            
        browser.close()

if __name__ == "__main__":
    run_agent()