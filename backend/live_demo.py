import sys
from playwright.sync_api import sync_playwright
from synapse_sdk import Synapse

# Initialize Synapse
synapse = Synapse(api_key="syn-YOUR-KEY", base_url="https://synapse-backend-b5k1.onrender.com")
session_id = "peak-synapse-live"
synapse.start_session(session_id=session_id, goal="Autonomously monitor live tech news")

def run_peak_demo():
    print("🚀 Booting Autonomous Agent...")
    
    with sync_playwright() as p:
        # headless=False is mandatory here so the room sees the magic
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # --- STEP 1: LIVE NAVIGATION ---
        print("🌐 Navigating to Y Combinator Hacker News...")
        page.goto("https://news.ycombinator.com/")
        synapse.capture_step(page, "Initialize", "Loaded Hacker News front page")

        # --- STEP 2: REAL DOM SCRAPING ---
        print("🧠 Analyzing live DOM and extracting top tech stories...")
        
        # Playwright autonomously grabs all story titles currently on the front page
        titles = page.locator(".titleline > a").all_inner_texts()
        
        if not titles:
            print("❌ Could not read DOM. Scraping failed.")
            browser.close()
            sys.exit(1)

        # Extract the absolute top 3 stories happening *right now*
        top_3 = titles[:3]
        print(f"\n✅ LIVE DATA EXTRACTED:")
        for i, title in enumerate(top_3):
            print(f"{i+1}. {title}")
        print("\n")

        # --- STEP 3: PEAK SYNAPSE COMPRESSION ---
        print("💾 Compressing context and uploading to Synapse Cloud...")
        
        # We don't save the HTML. We only save the exact 3 strings we need.
        synapse.save_memory("live_frontpage_news", str(top_3), memory_type="extracted_data")
        synapse.capture_step(page, "Data Extraction", f"Saved {len(top_3)} live headlines to memory")

        print("🎉 Autonomous run complete. Check the Synapse Dashboard!")
        browser.close()

if __name__ == "__main__":
    run_peak_demo()