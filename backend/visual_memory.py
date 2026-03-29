"""
SYNAPSE AI — Visual Execution Memory
Captures real screenshots at each agent step.
Stores them in SQLite as base64. Retrieves them for replay.
"""

import sqlite3
import base64
import io
from datetime import datetime
from typing import Optional
import pyautogui
from PIL import Image

DB_PATH = "synapse.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_visual_table():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS visual_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            step_name TEXT NOT NULL,
            screenshot_b64 TEXT NOT NULL,
            action_taken TEXT,
            outcome TEXT,
            captured_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_visual_session ON visual_memory(session_id)")
    conn.commit()
    conn.close()

def capture_screenshot(quality: int = 60) -> str:
    """Capture current screen and return as base64 JPEG string."""
    screenshot = pyautogui.screenshot()
    img = screenshot.convert("RGB")
    # Resize to 1280x720 max for storage efficiency
    img.thumbnail((1280, 720), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality, optimize=True)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def save_visual_step(
    session_id: str,
    step_name: str,
    action_taken: str,
    outcome: str,
    screenshot_b64: Optional[str] = None
):
    """Save a visual memory entry — captures screenshot automatically if not provided."""
    if screenshot_b64 is None:
        screenshot_b64 = capture_screenshot()

    conn = get_conn()
    # Keep only last 3 screenshots per step to save space
    existing = conn.execute(
        "SELECT id FROM visual_memory WHERE session_id=? AND step_name=? ORDER BY id DESC",
        (session_id, step_name)
    ).fetchall()
    if len(existing) >= 3:
        ids_to_delete = [r["id"] for r in existing[2:]]
        for old_id in ids_to_delete:
            conn.execute("DELETE FROM visual_memory WHERE id=?", (old_id,))

    conn.execute("""
        INSERT INTO visual_memory (session_id, step_name, screenshot_b64, action_taken, outcome)
        VALUES (?, ?, ?, ?, ?)
    """, (session_id, step_name, screenshot_b64, action_taken, outcome))
    conn.commit()
    conn.close()

def get_visual_history(session_id: str) -> list:
    """Get all visual memory entries for a session."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT id, step_name, action_taken, outcome, captured_at,
               substr(screenshot_b64, 1, 50) as preview
        FROM visual_memory
        WHERE session_id=?
        ORDER BY id ASC
    """, (session_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_visual_step(session_id: str, step_name: str) -> Optional[dict]:
    """Get the latest visual memory for a specific step — includes full screenshot."""
    conn = get_conn()
    row = conn.execute("""
        SELECT id, step_name, screenshot_b64, action_taken, outcome, captured_at
        FROM visual_memory
        WHERE session_id=? AND step_name=?
        ORDER BY id DESC LIMIT 1
    """, (session_id, step_name)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_visual_step_by_id(entry_id: int) -> Optional[dict]:
    """Get a specific visual memory entry by ID."""
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM visual_memory WHERE id=?", (entry_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None
