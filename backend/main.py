from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import database
import secrets
import hashlib

app = FastAPI(title="Synapse AI Memory API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

database.init_db()

class MemorySaveRequest(BaseModel):
    session_id: str
    key: str
    value: str
    memory_type: Optional[str] = "general"

class WorkflowUpdateRequest(BaseModel):
    session_id: str
    step_name: str
    status: str
    metadata: Optional[str] = None

class CreateSessionRequest(BaseModel):
    task: str
    agent_name: Optional[str] = "default"
    agent_type: Optional[str] = "general"

class ApiKeyCreateRequest(BaseModel):
    name: str

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key is None:
        return "demo"
    key_data = database.get_api_key(x_api_key)
    if not key_data:
        raise HTTPException(status_code=401, detail="Invalid API key")
    database.increment_api_key_usage(x_api_key)
    return key_data["name"]

@app.get("/")
def root():
    return {
        "product": "Synapse AI",
        "tagline": "Persistent memory OS for AI agents",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "sessions":  ["POST /session/create", "GET /session/{id}"],
            "memory":    ["POST /memory/save", "GET /memory/session/{id}", "DELETE /memory/session/{id}"],
            "workflow":  ["POST /workflow/update", "GET /workflow/session/{id}", "GET /workflow/resume/{id}"],
            "context":   ["GET /context/build/{id}"],
            "agents":    ["GET /agents/active"],
            "developer": ["POST /developer/keys", "GET /developer/playground/sessions"],
        }
    }

@app.get("/health")
def health():
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@app.post("/session/create")
def create_session(req: CreateSessionRequest, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    session_id = f"syn-{secrets.token_hex(6)}"
    database.save_memory(session_id, "goal", req.task, "execution")
    database.save_memory(session_id, "agent_name", req.agent_name, "execution")
    database.save_memory(session_id, "agent_type", req.agent_type, "execution")
    database.save_memory(session_id, "created_at", datetime.utcnow().isoformat(), "execution")
    database.register_agent(session_id, req.agent_name, req.agent_type, req.task)
    return {
        "session_id": session_id,
        "task": req.task,
        "agent_name": req.agent_name,
        "status": "created",
        "message": "Session created. Use session_id for all memory operations.",
    }

@app.get("/session/{session_id}")
def get_session(session_id: str, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    memories = database.get_memories(session_id)
    steps = database.get_workflow_steps(session_id)
    if not memories:
        raise HTTPException(status_code=404, detail="Session not found")
    goal = next((m["value"] for m in memories if m["key"] == "goal"), "Unknown")
    agent = next((m["value"] for m in memories if m["key"] == "agent_name"), "unknown")
    completed = [s for s in steps if s["status"] == "completed"]
    return {
        "session_id": session_id,
        "goal": goal,
        "agent": agent,
        "memory_entries": len(memories),
        "workflow_steps": len(steps),
        "completed_steps": len(completed),
        "progress_pct": round(len(completed) / max(len(steps), 1) * 100),
    }

@app.post("/memory/save")
def save_memory(req: MemorySaveRequest, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    database.save_memory(req.session_id, req.key, req.value, req.memory_type)
    return {"status": "saved", "session_id": req.session_id, "key": req.key}

@app.get("/memory/session/{session_id}")
def get_session_memory(session_id: str, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    memories = database.get_memories(session_id)
    return {"session_id": session_id, "memory_count": len(memories), "memories": memories}

@app.delete("/memory/session/{session_id}")
def clear_session(session_id: str):
    database.clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}

@app.post("/workflow/update")
def update_workflow(req: WorkflowUpdateRequest, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    database.update_workflow_step(req.session_id, req.step_name, req.status, req.metadata)
    return {"status": "updated", "step": req.step_name, "step_status": req.status}

@app.get("/workflow/session/{session_id}")
def get_workflow(session_id: str, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    steps = database.get_workflow_steps(session_id)
    completed = [s for s in steps if s["status"] == "completed"]
    pending = [s for s in steps if s["status"] == "pending"]
    return {
        "session_id": session_id,
        "total_steps": len(steps),
        "completed": len(completed),
        "pending": len(pending),
        "steps": steps
    }

@app.get("/workflow/resume/{session_id}")
def resume_workflow(session_id: str, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    next_step = database.get_next_pending_step(session_id)
    all_steps = database.get_workflow_steps(session_id)
    completed = [s for s in all_steps if s["status"] == "completed"]
    if not next_step:
        return {"status": "workflow_complete", "completed_steps": len(completed)}
    return {
        "status": "resuming",
        "message": f"Synapse remembered. Resuming from: {next_step['step_name']}",
        "resume_from": next_step,
        "completed_so_far": len(completed),
        "completed_steps": [s["step_name"] for s in completed]
    }

@app.get("/context/build/{session_id}")
def build_context(session_id: str, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    memories = database.get_memories(session_id)
    steps = database.get_workflow_steps(session_id)
    goal = next((m["value"] for m in memories if m["key"] == "goal"), "Unknown")
    agent = next((m["value"] for m in memories if m["key"] == "agent_name"), "agent")
    completed_steps = [s["step_name"] for s in steps if s["status"] == "completed"]
    pending_steps = [s["step_name"] for s in steps if s["status"] == "pending"]
    failed_steps = [s["step_name"] for s in steps if s["status"] == "failed"]
    compressed = f"""[SYNAPSE MEMORY CONTEXT]
Agent: {agent}
Goal: {goal}
Completed: {', '.join(completed_steps) if completed_steps else 'None'}
Next step: {pending_steps[0] if pending_steps else 'All done'}
Failed: {', '.join(failed_steps) if failed_steps else 'None'}
Memory entries: {len(memories)}
"""
    return {
        "session_id": session_id,
        "compressed_context": compressed,
        "raw_memory_count": len(memories),
        "workflow_steps": len(steps)
    }

@app.get("/agents/active")
def get_active_agents():
    agents = database.get_all_agents()
    return {"agents": agents, "total": len(agents)}

@app.get("/developer/playground/sessions")
def get_all_sessions():
    sessions = database.get_all_sessions()
    return {"sessions": sessions, "total": len(sessions)}

@app.post("/developer/keys")
def create_api_key(req: ApiKeyCreateRequest):
    raw_key = f"syn-{secrets.token_urlsafe(32)}"
    database.create_api_key(raw_key, req.name)
    return {
        "api_key": raw_key,
        "name": req.name,
        "created_at": datetime.utcnow().isoformat(),
        "warning": "Save this key — it won't be shown again.",
        "usage": "Add header: X-API-Key: <your-key> to all requests",
    }

@app.get("/developer/keys/{api_key}/stats")
def get_key_stats(api_key: str):
    key_data = database.get_api_key(api_key)
    if not key_data:
        raise HTTPException(status_code=404, detail="API key not found")
    return {
        "name": key_data["name"],
        "total_calls": key_data["usage_count"],
        "created_at": key_data["created_at"],
        "status": "active"
    }
