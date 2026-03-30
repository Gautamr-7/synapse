"""
Synapse AI — Python SDK
pip install synapse-sdk

Usage:
    from synapse import Synapse

    syn = Synapse(api_key="syn-your-key")
    session = syn.create_session("automate invoice extraction")

    syn.save(session, "step_1", "fetched 50 emails")
    syn.update_step(session, "fetch_emails", "completed")

    # After restart:
    next_step = syn.resume(session)
    context = syn.context(session)
"""

import requests
from typing import Optional

class SynapseError(Exception):
    pass

class Synapse:
    def __init__(self, api_key: str = "demo", base_url: str = "https://synapse-backend-b5k1.onrender.com"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }
        self._last_session = None

    def _post(self, path: str, data: dict) -> dict:
        try:
            r = requests.post(f"{self.base_url}{path}", json=data, headers=self.headers, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.exceptions.ConnectionError:
            raise SynapseError("Cannot connect to Synapse API. Check your base_url.")
        except requests.exceptions.HTTPError as e:
            raise SynapseError(f"API error: {e.response.text}")

    def _get(self, path: str) -> dict:
        try:
            r = requests.get(f"{self.base_url}{path}", headers=self.headers, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.exceptions.ConnectionError:
            raise SynapseError("Cannot connect to Synapse API. Check your base_url.")
        except requests.exceptions.HTTPError as e:
            raise SynapseError(f"API error: {e.response.text}")

    # ─── Sessions ──────────────────────────────────────────────────────────────

    def create_session(self, task: str, agent_name: str = "agent", agent_type: str = "general") -> str:
        """Create a new agent session. Returns session_id."""
        result = self._post("/session/create", {
            "task": task,
            "agent_name": agent_name,
            "agent_type": agent_type
        })
        session_id = result["session_id"]
        self._last_session = session_id
        return session_id

    def get_session(self, session_id: str) -> dict:
        """Get session details and progress."""
        return self._get(f"/session/{session_id}")

    # ─── Memory ────────────────────────────────────────────────────────────────

    def save(self, session_id: str, key: str, value: str, memory_type: str = "execution") -> dict:
        """Save any key-value pair to session memory."""
        return self._post("/memory/save", {
            "session_id": session_id,
            "key": key,
            "value": str(value),
            "memory_type": memory_type
        })

    def get_memory(self, session_id: str) -> list:
        """Get all memory entries for a session."""
        result = self._get(f"/memory/session/{session_id}")
        return result.get("memories", [])

    def clear(self, session_id: str) -> dict:
        """Clear all memory for a session."""
        r = requests.delete(f"{self.base_url}/memory/session/{session_id}", headers=self.headers, timeout=30)
        return r.json()

    # ─── Workflow ──────────────────────────────────────────────────────────────

    def update_step(self, session_id: str, step_name: str, status: str, metadata: Optional[str] = None) -> dict:
        """Track a workflow step. Status: pending | running | completed | failed"""
        return self._post("/workflow/update", {
            "session_id": session_id,
            "step_name": step_name,
            "status": status,
            "metadata": metadata
        })

    def get_workflow(self, session_id: str) -> dict:
        """Get full workflow state."""
        return self._get(f"/workflow/session/{session_id}")

    def resume(self, session_id: str) -> dict:
        """
        THE CORE FEATURE.
        After any restart, call this to get exactly where the agent left off.
        Returns: { status, resume_from, completed_steps }
        """
        return self._get(f"/workflow/resume/{session_id}")

    # ─── Context ───────────────────────────────────────────────────────────────

    def context(self, session_id: str) -> str:
        """
        Get compressed context string — inject this into your LLM call.
        Returns a structured summary of goal, progress, and next step.
        """
        result = self._get(f"/context/build/{session_id}")
        return result.get("compressed_context", "")

    # ─── Developer ─────────────────────────────────────────────────────────────

    def health(self) -> dict:
        """Check if Synapse API is reachable."""
        return self._get("/health")

    # ─── Convenience helpers ────────────────────────────────────────────────────

    def run_step(self, session_id: str, step_name: str, fn, *args, **kwargs):
        """
        Convenience wrapper — runs a function as a tracked workflow step.
        Automatically marks step as running → completed (or failed).

        Usage:
            result = syn.run_step(session, "fetch_emails", my_fetch_function, inbox="primary")
        """
        self.update_step(session_id, step_name, "running")
        try:
            result = fn(*args, **kwargs)
            self.update_step(session_id, step_name, "completed", str(result))
            self.save(session_id, f"result_{step_name}", str(result))
            return result
        except Exception as e:
            self.update_step(session_id, step_name, "failed", str(e))
            raise

    def __repr__(self):
        return f"Synapse(api_key={self.api_key[:8]}..., base_url={self.base_url})"
