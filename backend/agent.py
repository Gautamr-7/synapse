"""
SYNAPSE AI — Universal Agent
Accepts ANY task. Groq plans it. Synapse remembers it.

Usage:
  python agent.py                                    # default task
  python agent.py "research top 5 AI startups"      # any custom task
  python agent.py "plan a product launch"
  python agent.py "analyze competitor pricing"
  python agent.py --resume <session_id>              # resume specific session
  python agent.py --resume                           # resume last session
"""
from dotenv import load_dotenv
load_dotenv()
import os
import time
import sys
import json
import requests
import base64
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SYNAPSE_BASE = "https://synapse-backend-b5k1.onrender.com"
MODEL         = "llama-3.1-8b-instant"

client = Groq(api_key=GROQ_API_KEY)

AGENT_TYPES = {
    "research":    "Research Agent",
    "automation":  "Automation Agent",
    "analysis":    "Analysis Agent",
    "planning":    "Planning Agent",
    "coding":      "Coding Agent",
    "marketing":   "Marketing Agent",
    "default":     "General Agent",
}

def detect_agent_type(task: str) -> str:
    task_lower = task.lower()
    if any(w in task_lower for w in ["research", "find", "search", "look up", "investigate"]):
        return "research"
    if any(w in task_lower for w in ["automate", "extract", "parse", "upload", "fetch", "gmail", "sheets"]):
        return "automation"
    if any(w in task_lower for w in ["analyze", "analyse", "compare", "evaluate", "review"]):
        return "analysis"
    if any(w in task_lower for w in ["plan", "strategy", "roadmap", "outline", "design"]):
        return "planning"
    if any(w in task_lower for w in ["code", "build", "develop", "debug", "fix", "implement"]):
        return "coding"
    if any(w in task_lower for w in ["market", "launch", "campaign", "brand", "promote"]):
        return "marketing"
    return "default"

# ─── Synapse Helpers ───────────────────────────────────────────────────────────

def synapse_create_session(task: str, agent_name: str, agent_type: str) -> str:
    r = requests.post(f"{SYNAPSE_BASE}/session/create", json={
        "task": task,
        "agent_name": agent_name,
        "agent_type": agent_type
    })
    return r.json()["session_id"]

def synapse_save(session_id, key, value, memory_type="execution"):
    requests.post(f"{SYNAPSE_BASE}/memory/save", json={
        "session_id": session_id, "key": key, "value": value, "memory_type": memory_type
    })

def synapse_update_step(session_id, step_name, status, metadata=None):
    requests.post(f"{SYNAPSE_BASE}/workflow/update", json={
        "session_id": session_id, "step_name": step_name, "status": status, "metadata": metadata
    })

def synapse_resume(session_id):
    return requests.get(f"{SYNAPSE_BASE}/workflow/resume/{session_id}").json()

def synapse_context(session_id):
    return requests.get(f"{SYNAPSE_BASE}/context/build/{session_id}").json()["compressed_context"]

def synapse_workflow(session_id):
    return requests.get(f"{SYNAPSE_BASE}/workflow/session/{session_id}").json()

def synapse_memory(session_id):
    return requests.get(f"{SYNAPSE_BASE}/memory/session/{session_id}").json()

def save_last_session(session_id):
    with open(".last_session", "w") as f:
        f.write(session_id)

def load_last_session():
    try:
        with open(".last_session") as f:
            return f.read().strip()
    except:
        return None

# ─── Groq AI ───────────────────────────────────────────────────────────────────

def plan_workflow(task: str, agent_type: str) -> list:
    print(f"\n🤖 Groq planning workflow for: '{task}'\n")
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are a {agent_type} AI. Break the given task into concrete execution steps.
Return ONLY a JSON array of step names in snake_case. Max 6 steps. No explanation, just JSON.
Example: ["step_one", "step_two", "step_three"]
Make steps specific and relevant to the actual task."""
            },
            {"role": "user", "content": f"Plan steps for: {task}"}
        ],
        temperature=0.3, max_tokens=200
    )
    raw = response.choices[0].message.content.strip()
    try:
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        return json.loads(raw)
    except:
        print("⚠ Using fallback steps")
        return ["initialize", "gather_data", "process_data", "validate_results", "save_output", "finalize"]

def execute_step(session_id, step_name, task, agent_name, context) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": f"You are {agent_name}. Describe completing a workflow step in ONE specific sentence (max 20 words). Be concrete."
            },
            {
                "role": "user",
                "content": f"Task: {task}\nStep: {step_name}\nContext: {context}\nWhat did you do?"
            }
        ],
        temperature=0.5, max_tokens=80
    )
    return response.choices[0].message.content.strip()

# ─── Main Agent ────────────────────────────────────────────────────────────────

def run_agent(task: str):
    agent_type_key = detect_agent_type(task)
    agent_name = AGENT_TYPES[agent_type_key]

    print("\n" + "="*58)
    print(f"  🧠 SYNAPSE AI")
    print(f"  Agent : {agent_name}")
    print(f"  Task  : {task}")
    print("="*58 + "\n")

    session_id = synapse_create_session(task, agent_name, agent_type_key)
    save_last_session(session_id)
    print(f"✅ Session created: {session_id}")
    print(f"   Dashboard: http://localhost:3000\n")

    steps = plan_workflow(task, agent_name)
    print(f"📋 {agent_name} planned {len(steps)} steps:")
    for i, s in enumerate(steps, 1):
        print(f"   {i}. {s}")
        synapse_update_step(session_id, s, "pending")

    synapse_save(session_id, "planned_steps", json.dumps(steps))
    print(f"\n✅ All steps registered in Synapse memory\n")
    print("▶  Executing...\n")

    crash_at = len(steps) - 2

    for i, step in enumerate(steps):
        if i >= crash_at:
            print("="*58)
            print("  💥 AGENT INTERRUPTED — simulating crash")
            print("="*58)
            print(f"\n  Session ID : {session_id}")
            print(f"  Kill backend → restart → then run:")
            print(f"  python agent.py --resume {session_id}\n")
            return

        print(f"   ⚡ {step}")
        synapse_update_step(session_id, step, "running")
        time.sleep(1.0)
        context = synapse_context(session_id)
        result = execute_step(session_id, step, task, agent_name, context)
        synapse_update_step(session_id, step, "completed", result)
        synapse_save(session_id, f"result_{step}", result)
        print(f"   ✅ {result}\n")

def resume_agent(session_id: str):
    print("\n" + "="*58)
    print(f"  🔄 SYNAPSE AI — Resuming session")
    print(f"  Session: {session_id}")
    print("="*58 + "\n")

    time.sleep(0.5)
    resume_data = synapse_resume(session_id)

    if resume_data["status"] == "workflow_complete":
        print("✅ Workflow was already complete.")
        return

    print("🧠 SYNAPSE MEMORY RETRIEVED:")
    print(f"   Completed : {resume_data['completed_steps']}")
    print(f"   Resuming  : {resume_data['resume_from']['step_name']}")

    context = synapse_context(session_id)
    print(f"\n🗜  Compressed context:\n{context}")

    memories = synapse_memory(session_id)["memories"]
    task = next((m["value"] for m in memories if m["key"] == "goal"), "unknown task")
    agent_name = next((m["value"] for m in memories if m["key"] == "agent_name"), "Agent")

    workflow = synapse_workflow(session_id)
    pending = [s["step_name"] for s in workflow["steps"] if s["status"] == "pending"]

    print(f"▶  Continuing {len(pending)} remaining steps...\n")

    for step in pending:
        print(f"   ⚡ {step}")
        synapse_update_step(session_id, step, "running")
        time.sleep(0.8)
        context = synapse_context(session_id)
        result = execute_step(session_id, step, task, agent_name, context)
        synapse_update_step(session_id, step, "completed", result)
        synapse_save(session_id, f"result_{step}", result)
        print(f"   ✅ {result}\n")

    final = synapse_workflow(session_id)
    print("="*58)
    print("  🎉 WORKFLOW COMPLETE")
    print("="*58)
    print(f"\n  Steps completed : {final['completed']}/{final['total_steps']}")
    print(f"  Session         : {session_id}")
    print(f"  Synapse remembered everything across the restart.\n")

# ─── Entry ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if "--resume" in args:
        idx = args.index("--resume")
        if idx + 1 < len(args):
            sid = args[idx + 1]
        else:
            sid = load_last_session()
        if not sid:
            print("❌ No session ID found. Run python agent.py first.")
            sys.exit(1)
        resume_agent(sid)
    else:
        task = " ".join(a for a in args if not a.startswith("--"))
        if not task:
            task = "Extract invoices from Gmail, validate the data, and upload to Google Sheets"
        run_agent(task)



def capture_ui_step(page, session_id, step_description):
    # 1. Take the screenshot (JPEG is smaller than PNG)
    screenshot_bytes = page.screenshot(type='jpeg', quality=40)
    
    # 2. Convert to Base64 string
    b64_string = base64.b64encode(screenshot_bytes).decode('utf-8')
    
    # 3. Send to Synapse Backend
    requests.post(f"{SYNAPSE_BASE}/visual/capture/{session_id}", json={
        "step": step_description,
        "image": b64_string
    })

# Usage example:
# page.goto("https://google.com")
# capture_ui_step(page, "agent-001", "Navigated to Google Search")