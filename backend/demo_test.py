"""
SYNAPSE AI — WOW MOMENT TEST SCRIPT
Run this to simulate the full restart/resume demo.

Step 1: Start your backend (uvicorn main:app --reload)
Step 2: Run this script
Step 3: When prompted, kill the backend (Ctrl+C in backend terminal)
Step 4: Restart backend
Step 5: Run this script again with --resume flag

Usage:
  python demo_test.py          # Run the workflow (first time)
  python demo_test.py --resume # Resume after restart
"""

import requests
import time
import sys

BASE = "https://synapse-backend-b5k1.onrender.com"
SESSION = "demo-foundry-001"

def run_workflow():
    print("\n🚀 SYNAPSE AI — Starting agent workflow\n")

    # Save goal to memory
    requests.post(f"{BASE}/memory/save", json={
        "session_id": SESSION,
        "key": "goal",
        "value": "Automate invoice extraction from Gmail to Google Sheets",
        "memory_type": "execution"
    })
    print("✅ Goal saved to Synapse memory")

    # Define steps
    steps = [
        ("fetch_gmail_emails", "Fetch unread emails from Gmail"),
        ("parse_invoice_data", "Extract invoice fields from emails"),
        ("validate_data", "Validate parsed invoice data"),
        ("upload_to_sheets", "Upload validated data to Google Sheets"),
        ("send_confirmation", "Send confirmation email to user"),
    ]

    # Register all steps as pending
    for step_name, description in steps:
        requests.post(f"{BASE}/workflow/update", json={
            "session_id": SESSION,
            "step_name": step_name,
            "status": "pending",
            "metadata": description
        })

    print(f"✅ {len(steps)} workflow steps registered\n")
    print("▶ Running workflow steps...\n")

    # Execute first 2 steps (then we'll "crash")
    for i, (step_name, description) in enumerate(steps[:2]):
        print(f"   Running: {step_name}...")
        time.sleep(1)

        requests.post(f"{BASE}/workflow/update", json={
            "session_id": SESSION,
            "step_name": step_name,
            "status": "completed",
            "metadata": description
        })
        print(f"   ✅ {step_name} → completed")

    print("\n" + "="*50)
    print("💥 SIMULATING BACKEND CRASH / RESTART")
    print("="*50)
    print("\nIn your demo: kill the backend now (Ctrl+C)")
    print("Then restart it: uvicorn main:app --reload")
    print("Then run: python demo_test.py --resume")
    print("\nSynapse has saved the state. Nothing is lost.\n")

def resume_workflow():
    print("\n🔄 SYNAPSE AI — Backend restarted. Checking memory...\n")
    time.sleep(0.5)

    # This is the money call
    response = requests.get(f"{BASE}/workflow/resume/{SESSION}")
    data = response.json()

    print("="*50)
    print("🧠 SYNAPSE MEMORY RETRIEVED")
    print("="*50)
    print(f"\nStatus: {data['status']}")
    print(f"Message: {data['message']}")
    print(f"Completed before crash: {data['completed_steps']}")
    print(f"Resuming from: {data['resume_from']['step_name']}")
    print("\n" + "="*50)

    # Get context built for LLM
    ctx = requests.get(f"{BASE}/context/build/{SESSION}").json()
    print("\n🗜 COMPRESSED CONTEXT (injected into next LLM call):")
    print("-"*40)
    print(ctx["compressed_context"])
    print("-"*40)

    print("\n▶ Continuing workflow from where we left off...\n")

    # Get all steps and finish the pending ones
    workflow = requests.get(f"{BASE}/workflow/session/{SESSION}").json()
    pending = [s for s in workflow["steps"] if s["status"] == "pending"]

    for step in pending:
        print(f"   Running: {step['step_name']}...")
        time.sleep(0.8)
        requests.post(f"{BASE}/workflow/update", json={
            "session_id": SESSION,
            "step_name": step["step_name"],
            "status": "completed"
        })
        print(f"   ✅ {step['step_name']} → completed")

    print("\n🎉 WORKFLOW COMPLETE — Synapse AI remembered everything.\n")

if __name__ == "__main__":
    if "--resume" in sys.argv:
        resume_workflow()
    else:
        run_workflow()
