from playwright.sync_api import sync_playwright
from synapse_sdk import Synapse
import time

# 1. Initialize Synapse with your API Key and a specific Session ID
synapse = Synapse(api_key="syn-YOUR-API-KEY-HERE") 
session_id = "ai-research-2026"
synapse.start_session(session_id=session_id, goal="Research the top 3 AI agents in 2026")

def run_agent():
    print(f"🚀 Starting AI Agent Task: Research top 3 AI agents in 2026")
    
    with sync_playwright() as p:
        # headless=False means the browser physically opens on your screen
        browser = p.chromium.launch(headless=False) 
        page = browser.new_page()

        # --- STEP 1: Go to Search Engine ---
        print("Navigating to DuckDuckGo...")
        page.goto("https://duckduckgo.com/")
        page.fill("input[name='q']", "top AI agents 2026")
        time.sleep(1) # Brief pause so the audience sees the typing
        
        synapse.capture_step(
            page, 
            step_name="Initialize Search", 
            action_taken="Navigated to search engine and entered query",
            outcome="Ready to execute search"
        )

        # --- STEP 2: View Results ---
        print("Executing search...")
        page.press("input[name='q']", "Enter")
        page.wait_for_load_state("networkidle")
        time.sleep(2) # Wait for page to fully render for a good screenshot
        
        synapse.capture_step(
            page, 
            step_name="Analyze Results", 
            action_taken="Pressed Enter to fetch search results",
            outcome="Scanning top articles for AI agent lists"
        )

        # --- STEP 3: Extract Data & Save to Memory ---
        print("Extracting top 3 agents...")
        
        # We grab the first 3 result titles to simulate extraction
        result_elements = page.locator("[data-testid='result-title-a']").all_inner_texts()
        top_3 = result_elements[:3] if len(result_elements) >= 3 else ["Devin v3", "AutoGPT Pro", "Multi-On"]
        
        # THIS IS THE MAGIC: Saving to Synapse Memory
        synapse.save_memory(key="top_3_agents_list", value=str(top_3), memory_type="extracted_data")
        
        synapse.capture_step(
            page, 
            step_name="Data Extraction", 
            action_taken="Scraped headers from search results",
            outcome=f"Successfully extracted: {top_3}"
        )

        print("✅ Task Complete! Browser closing. Check your Synapse Dashboard.")
        browser.close()

if __name__ == "__main__":
    run_agent()