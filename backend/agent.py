"""
SYNAPSE AI — Universal Agent with Visual Execution Memory
Every step is captured: what happened + screenshot of the screen.

Usage:
  python agent.py                              # default task
  python agent.py "your task here"            # any task
  python agent.py --resume                    # resume last session
  python agent.py --resume <session_id>       # resume specific session
"""
from dotenv import load_dotenv
import time
import sys
import json
import requests
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # paste your key
SYNAPSE_BASE  = "http://localhost:8000"
MODEL         = "llama-3.1-8b-instant"

client = Groq(api_key=GROQ_API_KEY)

AGENT_TYPES = {
    "research":   "Research Agent",
    "automation": "Automation Agent",
    "analysis":   "Analysis Agent",
    "planning":   "Planning Agent",
    "coding":     "Coding Agent",
    "marketing":  "Marketing Agent",
    "default":    "General Agent",
}

def detect_agent_type(task: str) -> str:
    t = task.lower()
    if any(w in t for w in ["research", "find", "search", "look up", "investigate"]): return "research"
    if any(w in t for w in ["automate", "extract", "parse", "upload", "fetch", "gmail", "sheets"]): return "automation"
    if any(w in t for w in ["analyze", "analyse", "compare", "evaluate", "review"]): return "analysis"
    if any(w in t for w in ["plan", "strategy", "roadmap", "outline", "design"]): return "planning"
    if any(w in t for w in ["code", "build", "develop", "debug", "fix", "implement"]): return "coding"
    if any(w in t for w in ["market", "launch", "campaign", "brand", "promote"]): return "marketing"
    return "default"

# ─── Synapse API calls ──────────────────────────────────────────────────────────

def synapse_create_session(task, agent_name, agent_type):
    r = requests.post(f"{SYNAPSE_BASE}/session/create", json={"task": task, "agent_name": agent_name, "agent_type": agent_type})
    return r.json()["session_id"]

def synapse_save(sid, key, value, memory_type="execution"):
    requests.post(f"{SYNAPSE_BASE}/memory/save", json={"session_id": sid, "key": key, "value": value, "memory_type": memory_type})

def synapse_update_step(sid, step, status, metadata=None):
    requests.post(f"{SYNAPSE_BASE}/workflow/update", json={"session_id": sid, "step_name": step, "status": status, "metadata": metadata})

def synapse_capture_visual(sid, step, action, outcome):
    """Tell Synapse backend to capture screenshot NOW and store it."""
    try:
        r = requests.post(f"{SYNAPSE_BASE}/visual/capture", json={
            "session_id": sid,
            "step_name": step,
            "action_taken": action,
            "outcome": outcome
        }, timeout=10)
        return r.json()
    except Exception as e:
        print(f"   ⚠ Visual capture failed: {e}")
        return None

def synapse_resume(sid):
    return requests.get(f"{SYNAPSE_BASE}/workflow/resume/{sid}").json()

def synapse_context(sid):
    return requests.get(f"{SYNAPSE_BASE}/context/build/{sid}").json()["compressed_context"]

def synapse_workflow(sid):
    return requests.get(f"{SYNAPSE_BASE}/workflow/session/{sid}").json()

def synapse_memory(sid):
    return requests.get(f"{SYNAPSE_BASE}/memory/session/{sid}").json()

def save_last_session(sid):
    with open(".last_session", "w") as f: f.write(sid)

def load_last_session():
    try:
        with open(".last_session") as f: return f.read().strip()
    except: return None

# ─── Groq AI ────────────────────────────────────────────────────────────────────

def plan_workflow(task, agent_name):
    print(f"\n🤖 Groq planning: '{task}'\n")
    r = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": f"You are {agent_name}. Return ONLY a JSON array of snake_case step names. Max 6 steps. No explanation."},
            {"role": "user", "content": f"Plan steps for: {task}"}
        ],
        temperature=0.3, max_tokens=200
    )
    raw = r.choices[0].message.content.strip()
    try:
        if "```" in raw: raw = raw.split("```")[1].replace("json","").strip()
        return json.loads(raw)
    except:
        return ["initialize","gather_data","process_data","validate_results","save_output","finalize"]

def execute_step(sid, step, task, agent_name, context):
    r = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": f"You are {agent_name}. Describe completing a step in ONE specific sentence (max 20 words)."},
            {"role": "user", "content": f"Task: {task}\nStep: {step}\nContext: {context}\nWhat did you do?"}
        ],
        temperature=0.5, max_tokens=80
    )
    return r.choices[0].message.content.strip()

# ─── Main Agent ─────────────────────────────────────────────────────────────────

def run_agent(task: str):
    agent_type_key = detect_agent_type(task)
    agent_name = AGENT_TYPES[agent_type_key]

    print("\n" + "="*58)
    print(f"  🧠 SYNAPSE AI — Visual Execution Memory")
    print(f"  Agent  : {agent_name}")
    print(f"  Task   : {task}")
    print("="*58 + "\n")

    sid = synapse_create_session(task, agent_name, agent_type_key)
    save_last_session(sid)
    print(f"✅ Session: {sid}")
    print(f"   Dashboard  : http://localhost:3000")
    print(f"   Action Replay: http://localhost:3000 → Replay tab\n")

    steps = plan_workflow(task, agent_name)
    print(f"📋 {len(steps)} steps planned:")
    for i, s in enumerate(steps, 1):
        print(f"   {i}. {s}")
        synapse_update_step(sid, s, "pending")

    synapse_save(sid, "planned_steps", json.dumps(steps))
    print(f"\n✅ Registered in Synapse memory\n")
    print("▶  Executing with visual capture...\n")

    crash_at = len(steps) - 2

    for i, step in enumerate(steps):
        if i >= crash_at:
            print("="*58)
            print("  💥 AGENT INTERRUPTED")
            print("="*58)
            print(f"\n  Session  : {sid}")
            print(f"  Restart backend → run: python agent.py --resume\n")
            return

        print(f"   ⚡ {step}")
        synapse_update_step(sid, step, "running")
        time.sleep(1.0)

        context = synapse_context(sid)
        result = execute_step(sid, step, task, agent_name, context)

        synapse_update_step(sid, step, "completed", result)
        synapse_save(sid, f"result_{step}", result)

        # 📸 VISUAL MEMORY — capture screen right now
        print(f"   📸 Capturing screen state...")
        capture = synapse_capture_visual(sid, step, step.replace("_", " "), result)
        if capture and capture.get("status") == "captured":
            print(f"   ✅ {result}")
            print(f"   🖼  Screenshot stored in Synapse visual memory\n")
        else:
            print(f"   ✅ {result}\n")

def resume_agent(sid: str):
    print("\n" + "="*58)
    print(f"  🔄 SYNAPSE AI — Resuming with visual memory")
    print(f"  Session: {sid}")
    print("="*58 + "\n")

    time.sleep(0.5)
    resume_data = synapse_resume(sid)

    if resume_data["status"] == "workflow_complete":
        print("✅ Already complete.")
        return

    print("🧠 SYNAPSE MEMORY RETRIEVED:")
    print(f"   Completed : {resume_data['completed_steps']}")
    print(f"   Resuming  : {resume_data['resume_from']['step_name']}")

    context = synapse_context(sid)
    print(f"\n🗜  Context:\n{context}")

    memories = synapse_memory(sid)["memories"]
    task = next((m["value"] for m in memories if m["key"] == "goal"), "unknown task")
    agent_name = next((m["value"] for m in memories if m["key"] == "agent_name"), "Agent")

    workflow = synapse_workflow(sid)
    pending = [s["step_name"] for s in workflow["steps"] if s["status"] == "pending"]

    print(f"▶  Continuing {len(pending)} steps...\n")

    for step in pending:
        print(f"   ⚡ {step}")
        synapse_update_step(sid, step, "running")
        time.sleep(0.8)
        context = synapse_context(sid)
        result = execute_step(sid, step, task, agent_name, context)
        synapse_update_step(sid, step, "completed", result)
        synapse_save(sid, f"result_{step}", result)

        print(f"   📸 Capturing screen state...")
        capture = synapse_capture_visual(sid, step, step.replace("_", " "), result)
        if capture and capture.get("status") == "captured":
            print(f"   ✅ {result}")
            print(f"   🖼  Screenshot stored\n")
        else:
            print(f"   ✅ {result}\n")

    final = synapse_workflow(sid)
    print("="*58)
    print("  🎉 WORKFLOW COMPLETE — Visual memory captured")
    print("="*58)
    print(f"\n  Steps    : {final['completed']}/{final['total_steps']}")
    print(f"  Session  : {sid}")
    print(f"  View replay: http://localhost:3000 → Replay tab\n")

# ─── Entry ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]
    if "--resume" in args:
        idx = args.index("--resume")
        sid = args[idx + 1] if idx + 1 < len(args) else load_last_session()
        if not sid:
            print("❌ No session found. Run python agent.py first.")
            sys.exit(1)
        resume_agent(sid)
    else:
        task = " ".join(a for a in args if not a.startswith("--"))
        if not task:
            task = "Extract invoices from Gmail, validate the data, and upload to Google Sheets"
        run_agent(task)
