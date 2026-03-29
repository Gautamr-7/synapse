"""
SYNAPSE AI — Database Layer
Supports both SQLite (local dev) and PostgreSQL/Supabase (production)
Automatically switches based on DATABASE_URL environment variable
"""

import os
import sqlite3
from datetime import datetime
from typing import Optional

DATABASE_URL = os.getenv("DATABASE_URL")
USE_POSTGRES = DATABASE_URL is not None

if USE_POSTGRES:
    from sqlalchemy import create_engine, text
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)

DB_PATH = "synapse.db"

# ─── Connection helpers ────────────────────────────────────────────────────────

def get_sqlite_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def pg_execute(query: str, params: dict = {}, fetch: str = None):
    """Execute a query on PostgreSQL and return results."""
    with engine.connect() as conn:
        result = conn.execute(text(query), params)
        conn.commit()
        if fetch == "all":
            rows = result.fetchall()
            return [dict(r._mapping) for r in rows]
        elif fetch == "one":
            row = result.fetchone()
            return dict(row._mapping) if row else None
        return None

# ─── Init ──────────────────────────────────────────────────────────────────────

def init_db():
    if USE_POSTGRES:
        _init_postgres()
    else:
        _init_sqlite()

def _init_postgres():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                api_key TEXT DEFAULT 'demo',
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                memory_type TEXT DEFAULT 'general',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(session_id, key)
            );
            CREATE TABLE IF NOT EXISTS workflow_steps (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                api_key TEXT DEFAULT 'demo',
                step_name TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                metadata TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(session_id, step_name)
            );
            CREATE TABLE IF NOT EXISTS agents (
                id SERIAL PRIMARY KEY,
                session_id TEXT UNIQUE NOT NULL,
                api_key TEXT DEFAULT 'demo',
                name TEXT NOT NULL,
                agent_type TEXT DEFAULT 'general',
                task TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS api_keys (
                id SERIAL PRIMARY KEY,
                api_key TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email TEXT DEFAULT '',
                usage_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
            CREATE INDEX IF NOT EXISTS idx_memories_apikey ON memories(api_key);
            CREATE INDEX IF NOT EXISTS idx_workflow_session ON workflow_steps(session_id);
            CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id);
        """))
        conn.commit()
    print("✅ Supabase PostgreSQL initialized")

def _init_sqlite():
    conn = get_sqlite_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            api_key TEXT DEFAULT 'demo',
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            memory_type TEXT DEFAULT 'general',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS workflow_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            api_key TEXT DEFAULT 'demo',
            step_name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            metadata TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            api_key TEXT DEFAULT 'demo',
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
            email TEXT DEFAULT '',
            usage_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_session ON workflow_steps(session_id);
    """)
    conn.commit()
    conn.close()
    print("✅ SQLite initialized (local dev)")

# ─── Memory ────────────────────────────────────────────────────────────────────

def save_memory(session_id, key, value, memory_type="general", api_key="demo"):
    if USE_POSTGRES:
        pg_execute("""
            INSERT INTO memories (session_id, api_key, key, value, memory_type, updated_at)
            VALUES (:sid, :ak, :key, :val, :mt, NOW())
            ON CONFLICT (session_id, key)
            DO UPDATE SET value=:val, memory_type=:mt, updated_at=NOW()
        """, {"sid": session_id, "ak": api_key, "key": key, "val": value, "mt": memory_type})
    else:
        conn = get_sqlite_conn()
        existing = conn.execute("SELECT id FROM memories WHERE session_id=? AND key=?", (session_id, key)).fetchone()
        if existing:
            conn.execute("UPDATE memories SET value=?, memory_type=?, updated_at=datetime('now') WHERE session_id=? AND key=?",
                        (value, memory_type, session_id, key))
        else:
            conn.execute("INSERT INTO memories (session_id, api_key, key, value, memory_type) VALUES (?,?,?,?,?)",
                        (session_id, api_key, key, value, memory_type))
        conn.commit(); conn.close()

def get_memories(session_id):
    if USE_POSTGRES:
        return pg_execute(
            "SELECT key, value, memory_type, created_at::text, updated_at::text FROM memories WHERE session_id=:sid ORDER BY updated_at DESC",
            {"sid": session_id}, fetch="all"
        ) or []
    else:
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT key, value, memory_type, created_at, updated_at FROM memories WHERE session_id=? ORDER BY updated_at DESC", (session_id,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]

def clear_session(session_id):
    if USE_POSTGRES:
        pg_execute("DELETE FROM memories WHERE session_id=:sid", {"sid": session_id})
        pg_execute("DELETE FROM workflow_steps WHERE session_id=:sid", {"sid": session_id})
        pg_execute("DELETE FROM agents WHERE session_id=:sid", {"sid": session_id})
    else:
        conn = get_sqlite_conn()
        conn.execute("DELETE FROM memories WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM workflow_steps WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM agents WHERE session_id=?", (session_id,))
        conn.commit(); conn.close()

def get_all_sessions():
    if USE_POSTGRES:
        return pg_execute("""
            SELECT DISTINCT ON (m.session_id) m.session_id,
                MAX(CASE WHEN m.key='goal' THEN m.value END) OVER (PARTITION BY m.session_id) as goal,
                MAX(CASE WHEN m.key='agent_name' THEN m.value END) OVER (PARTITION BY m.session_id) as agent_name,
                COUNT(m.id) OVER (PARTITION BY m.session_id) as memory_count,
                MAX(m.updated_at)::text OVER (PARTITION BY m.session_id) as last_active
            FROM memories m
            ORDER BY m.session_id, m.updated_at DESC
            LIMIT 20
        """, fetch="all") or []
    else:
        conn = get_sqlite_conn()
        rows = conn.execute("""
            SELECT DISTINCT m.session_id,
                MAX(CASE WHEN m.key='goal' THEN m.value END) as goal,
                MAX(CASE WHEN m.key='agent_name' THEN m.value END) as agent_name,
                COUNT(m.id) as memory_count,
                MAX(m.updated_at) as last_active
            FROM memories m GROUP BY m.session_id ORDER BY last_active DESC LIMIT 20
        """).fetchall()
        conn.close()
        return [dict(r) for r in rows]

# ─── Workflow ──────────────────────────────────────────────────────────────────

def update_workflow_step(session_id, step_name, status, metadata=None, api_key="demo"):
    if USE_POSTGRES:
        pg_execute("""
            INSERT INTO workflow_steps (session_id, api_key, step_name, status, metadata, updated_at)
            VALUES (:sid, :ak, :step, :status, :meta, NOW())
            ON CONFLICT (session_id, step_name)
            DO UPDATE SET status=:status, metadata=:meta, updated_at=NOW()
        """, {"sid": session_id, "ak": api_key, "step": step_name, "status": status, "meta": metadata})
    else:
        conn = get_sqlite_conn()
        existing = conn.execute("SELECT id FROM workflow_steps WHERE session_id=? AND step_name=?", (session_id, step_name)).fetchone()
        if existing:
            conn.execute("UPDATE workflow_steps SET status=?, metadata=?, updated_at=datetime('now') WHERE session_id=? AND step_name=?",
                        (status, metadata, session_id, step_name))
        else:
            conn.execute("INSERT INTO workflow_steps (session_id, api_key, step_name, status, metadata) VALUES (?,?,?,?,?)",
                        (session_id, api_key, step_name, status, metadata))
        conn.commit(); conn.close()

def get_workflow_steps(session_id):
    if USE_POSTGRES:
        return pg_execute(
            "SELECT step_name, status, metadata, created_at::text, updated_at::text FROM workflow_steps WHERE session_id=:sid ORDER BY id ASC",
            {"sid": session_id}, fetch="all"
        ) or []
    else:
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT step_name, status, metadata, created_at, updated_at FROM workflow_steps WHERE session_id=? ORDER BY id ASC", (session_id,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]

def get_next_pending_step(session_id):
    if USE_POSTGRES:
        return pg_execute(
            "SELECT step_name, status, metadata FROM workflow_steps WHERE session_id=:sid AND status='pending' ORDER BY id ASC LIMIT 1",
            {"sid": session_id}, fetch="one"
        )
    else:
        conn = get_sqlite_conn()
        row = conn.execute("SELECT step_name, status, metadata FROM workflow_steps WHERE session_id=? AND status='pending' ORDER BY id ASC LIMIT 1", (session_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

# ─── Agents ────────────────────────────────────────────────────────────────────

def register_agent(session_id, name, agent_type, task, api_key="demo"):
    if USE_POSTGRES:
        pg_execute("""
            INSERT INTO agents (session_id, api_key, name, agent_type, task, updated_at)
            VALUES (:sid, :ak, :name, :type, :task, NOW())
            ON CONFLICT (session_id) DO UPDATE SET name=:name, agent_type=:type, task=:task, updated_at=NOW()
        """, {"sid": session_id, "ak": api_key, "name": name, "type": agent_type, "task": task})
    else:
        conn = get_sqlite_conn()
        existing = conn.execute("SELECT id FROM agents WHERE session_id=?", (session_id,)).fetchone()
        if existing:
            conn.execute("UPDATE agents SET name=?, agent_type=?, task=?, updated_at=datetime('now') WHERE session_id=?",
                        (name, agent_type, task, session_id))
        else:
            conn.execute("INSERT INTO agents (session_id, api_key, name, agent_type, task) VALUES (?,?,?,?,?)",
                        (session_id, api_key, name, agent_type, task))
        conn.commit(); conn.close()

def get_all_agents():
    if USE_POSTGRES:
        rows = pg_execute(
            "SELECT session_id, name, agent_type, task, status, created_at::text, updated_at::text FROM agents ORDER BY updated_at DESC LIMIT 20",
            fetch="all"
        ) or []
    else:
        conn = get_sqlite_conn()
        rows = [dict(r) for r in conn.execute("SELECT session_id, name, agent_type, task, status, created_at, updated_at FROM agents ORDER BY updated_at DESC LIMIT 20").fetchall()]
        conn.close()

    result = []
    for r in rows:
        steps = get_workflow_steps(r["session_id"])
        completed = [s for s in steps if s["status"] == "completed"]
        r["total_steps"] = len(steps)
        r["completed_steps"] = len(completed)
        r["progress_pct"] = round(len(completed) / max(len(steps), 1) * 100)
        result.append(r)
    return result

# ─── API Keys ──────────────────────────────────────────────────────────────────

def create_api_key(api_key, name, email=""):
    if USE_POSTGRES:
        pg_execute(
            "INSERT INTO api_keys (api_key, name, email) VALUES (:key, :name, :email) ON CONFLICT DO NOTHING",
            {"key": api_key, "name": name, "email": email}
        )
    else:
        conn = get_sqlite_conn()
        conn.execute("INSERT OR IGNORE INTO api_keys (api_key, name, email) VALUES (?,?,?)", (api_key, name, email))
        conn.commit(); conn.close()

def get_api_key(api_key):
    if USE_POSTGRES:
        return pg_execute(
            "SELECT api_key, name, email, usage_count, created_at::text FROM api_keys WHERE api_key=:key",
            {"key": api_key}, fetch="one"
        )
    else:
        conn = get_sqlite_conn()
        row = conn.execute("SELECT api_key, name, email, usage_count, created_at FROM api_keys WHERE api_key=?", (api_key,)).fetchone()
        conn.close()
        return dict(row) if row else None

def increment_api_key_usage(api_key):
    if USE_POSTGRES:
        pg_execute("UPDATE api_keys SET usage_count = usage_count + 1 WHERE api_key=:key", {"key": api_key})
    else:
        conn = get_sqlite_conn()
        conn.execute("UPDATE api_keys SET usage_count = usage_count + 1 WHERE api_key=?", (api_key,))
        conn.commit(); conn.close()

def get_api_key_stats(api_key):
    key_data = get_api_key(api_key)
    if not key_data:
        return None
    if USE_POSTGRES:
        session_count = pg_execute(
            "SELECT COUNT(DISTINCT session_id) as count FROM memories WHERE api_key=:key",
            {"key": api_key}, fetch="one"
        )
        memory_count = pg_execute(
            "SELECT COUNT(*) as count FROM memories WHERE api_key=:key",
            {"key": api_key}, fetch="one"
        )
    else:
        conn = get_sqlite_conn()
        session_count = dict(conn.execute("SELECT COUNT(DISTINCT session_id) as count FROM memories WHERE api_key=?", (api_key,)).fetchone())
        memory_count = dict(conn.execute("SELECT COUNT(*) as count FROM memories WHERE api_key=?", (api_key,)).fetchone())
        conn.close()
    return {
        **key_data,
        "sessions": session_count["count"] if session_count else 0,
        "total_memories": memory_count["count"] if memory_count else 0,
    }
