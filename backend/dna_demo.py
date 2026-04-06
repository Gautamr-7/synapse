import time
from synapse_sdk import Synapse

# Initialize a BRAND NEW agent session
synapse = Synapse(api_key="syn-YOUR-KEY", base_url="https://synapse-backend-b5k1.onrender.com")
session_id = "new-agent-008"
synapse.start_session(session_id=session_id, goal="Research AI Startups")

task_type = "web_search_extraction"

def run_hive_agent():
    print("\n🤖 Booting up fresh AI Agent...")
    time.sleep(1)
    
    # 1. Ask Synapse for Collective DNA
    print("\n📡 Querying Synapse Hive Mind for Task DNA...")
    time.sleep(2)
    inherited_dna = synapse.get_dna(task_type)
    
    if inherited_dna:
        # THE MIC DROP MOMENT
        print(f"\n⚡ DNA ACQUIRED! Bypassing trial-and-error.")
        print(f"Optimal Path Loaded: {inherited_dna}")
        print("Executing exact perfect sequence...")
        # (Agent does the task perfectly in 1 second)
        
    else:
        # What happens the first time
        print("\n⚠️ No DNA found. Agent must learn from scratch.")
        print("Running slow, expensive web search...")
        time.sleep(3) # Simulate a long, slow scrape
        
        optimal_path = "1. Go to DuckDuckGo -> 2. Scrape Headers -> 3. Format as JSON"
        print("✅ Task finished. Distilling knowledge to Synapse...")
        
        # Share with the hive
        synapse.distill_dna(task_type, optimal_path)

if __name__ == "__main__":
    run_hive_agent()