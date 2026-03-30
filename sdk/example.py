"""
SYNAPSE SDK — Example Usage
Shows how any developer integrates Synapse into their own agent in 3 lines.
"""

from synapse import Synapse

# 1. Initialize
syn = Synapse(api_key="syn-eibha64tugYgUWmTJb0uUpgbdMY_VlQUDnjnoBVyR38")
# 2. Create a session
session = syn.create_session(
    task="Research top 5 competitors and write a report",
    agent_name="Research Agent"
)
print(f"Session: {session}")

# 3. Run your agent steps — Synapse tracks everything
steps = ["search_web", "collect_data", "analyze_results", "write_report", "save_output"]

# Register all steps as pending first
for step in steps:
    syn.update_step(session, step, "pending")

# Then run them
for step in steps:
    print(f"\nRunning: {step}")
    syn.update_step(session, step, "running")
    result = f"Completed {step} successfully"
    syn.update_step(session, step, "completed", result)
    syn.save(session, f"result_{step}", result)
    context = syn.context(session)
    print(f"Context: {context.strip()}")
    if step == "analyze_results":
        print("\n💥 Simulating crash...")
        break
print("\n--- RESTART ---\n")

# After restart — one call to resume
resume = syn.resume(session)
print(f"Status: {resume['status']}")
if resume['status'] == 'resuming':
    print(f"Resuming from: {resume['resume_from']['step_name']}")
    print(f"Already completed: {resume['completed_steps']}")
else:
    print("Workflow already complete")