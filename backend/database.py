import sqlite3
from datetime import datetime
from typing import Optional

DB_PATH = "synapse.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            memory_type TEXT DEFAULT 'general',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS workflow_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            step_name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            metadata TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            agent_type TEXT DEFAULT 'general',
            task TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_key TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            usage_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_session ON workflow_steps(session_id);
        CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id);
    """)
    conn.commit()
    conn.close()
    print("✅ Synapse DB initialized (v2)")

# ─── Memory ────────────────────────────────────────────────────────────────────

def save_memory(session_id, key, value, memory_type="general"):
    conn = get_conn()
    existing = conn.execute(
        "SELECT id FROM memories WHERE session_id=? AND key=?", (session_id, key)
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE memories SET value=?, memory_type=?, updated_at=datetime('now') WHERE session_id=? AND key=?",
            (value, memory_type, session_id, key)
        )
    else:
        conn.execute(
            "INSERT INTO memories (session_id, key, value, memory_type) VALUES (?,?,?,?)",
            (session_id, key, value, memory_type)
        )
    conn.commit()
    conn.close()

def get_memories(session_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT key, value, memory_type, created_at, updated_at FROM memories WHERE session_id=? ORDER BY updated_at DESC",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_session(session_id):
    conn = get_conn()
    conn.execute("DELETE FROM memories WHERE session_id=?", (session_id,))
    conn.execute("DELETE FROM workflow_steps WHERE session_id=?", (session_id,))
    conn.execute("DELETE FROM agents WHERE session_id=?", (session_id,))
    conn.commit()
    conn.close()

def get_all_sessions():
    conn = get_conn()
    rows = conn.execute("""
        SELECT DISTINCT m.session_id,
            MAX(CASE WHEN m.key='goal' THEN m.value END) as goal,
            MAX(CASE WHEN m.key='agent_name' THEN m.value END) as agent_name,
            COUNT(m.id) as memory_count,
            MAX(m.updated_at) as last_active
        FROM memories m
        GROUP BY m.session_id
        ORDER BY last_active DESC
        LIMIT 20
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ─── Workflow ──────────────────────────────────────────────────────────────────

def update_workflow_step(session_id, step_name, status, metadata=None):
    conn = get_conn()
    existing = conn.execute(
        "SELECT id FROM workflow_steps WHERE session_id=? AND step_name=?",
        (session_id, step_name)
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE workflow_steps SET status=?, metadata=?, updated_at=datetime('now') WHERE session_id=? AND step_name=?",
            (status, metadata, session_id, step_name)
        )
    else:
        conn.execute(
            "INSERT INTO workflow_steps (session_id, step_name, status, metadata) VALUES (?,?,?,?)",
            (session_id, step_name, status, metadata)
        )
    conn.commit()
    conn.close()

def get_workflow_steps(session_id):
    conn = get_conn()
    rows = conn.execute(
        "SELECT step_name, status, metadata, created_at, updated_at FROM workflow_steps WHERE session_id=? ORDER BY id ASC",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_next_pending_step(session_id):
    conn = get_conn()
    row = conn.execute(
        "SELECT step_name, status, metadata FROM workflow_steps WHERE session_id=? AND status='pending' ORDER BY id ASC LIMIT 1",
        (session_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

# ─── Agents ────────────────────────────────────────────────────────────────────

def register_agent(session_id, name, agent_type, task):
    conn = get_conn()
    existing = conn.execute("SELECT id FROM agents WHERE session_id=?", (session_id,)).fetchone()
    if existing:
        conn.execute(
            "UPDATE agents SET name=?, agent_type=?, task=?, updated_at=datetime('now') WHERE session_id=?",
            (name, agent_type, task, session_id)
        )
    else:
        conn.execute(
            "INSERT INTO agents (session_id, name, agent_type, task) VALUES (?,?,?,?)",
            (session_id, name, agent_type, task)
        )
    conn.commit()
    conn.close()

def get_all_agents():
    conn = get_conn()
    rows = conn.execute(
        "SELECT session_id, name, agent_type, task, status, created_at, updated_at FROM agents ORDER BY updated_at DESC LIMIT 20"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        agent = dict(r)
        steps = get_workflow_steps(agent["session_id"])
        completed = [s for s in steps if s["status"] == "completed"]
        agent["total_steps"] = len(steps)
        agent["completed_steps"] = len(completed)
        agent["progress_pct"] = round(len(completed) / max(len(steps), 1) * 100)
        result.append(agent)
    return result

# ─── API Keys ──────────────────────────────────────────────────────────────────

def create_api_key(api_key, name):
    conn = get_conn()
    conn.execute(
        "INSERT INTO api_keys (api_key, name) VALUES (?,?)", (api_key, name)
    )
    conn.commit()
    conn.close()

def get_api_key(api_key):
    conn = get_conn()
    row = conn.execute(
        "SELECT api_key, name, usage_count, created_at FROM api_keys WHERE api_key=?", (api_key,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def increment_api_key_usage(api_key):
    conn = get_conn()
    conn.execute(
        "UPDATE api_keys SET usage_count = usage_count + 1 WHERE api_key=?", (api_key,)
    )
    conn.commit()
    conn.close()
