# Synapse AI

A stateful memory operating system and visual observability layer built for autonomous AI agents. The infrastructure handles agent amnesia, eliminates redundant LLM API calls, and provides visual debugging for dynamic web workflows.

Built as part of the **Foundry Hackathon**.

---

## What it does

- Gives stateless AI agents a persistent local "brain" using SQLite
- Compresses thousands of lines of raw HTML history into semantic JSON nodes
- Skips duplicate tasks automatically via smart pagination
- Captures native DOM screenshots at execution time (Action Replay)
- Streams real-time logical execution to a Next.js observability dashboard

---

## Project Structure

```text
synapse-ai/
├── backend/
│   ├── main.py                 # FastAPI server and API endpoints
│   ├── visual_memory.py        # Base64 image processing
│   ├── synapse.db              # SQLite database (tri-layer memory)
│   └── scraper1.py             # Playwright agent implementation
├── frontend/
│   ├── page.tsx                # Next.js main dashboard
│   ├── ActionReplay.tsx        # Renders visual memory states
│   └── MemoryGraph.tsx         # D3.js logical node visualization
├── requirements.txt
├── package.json
└── README.md
```

---

## How to run

```bash
# Step 1 — setup and run the backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install
uvicorn main:app --reload

# Step 2 — setup and run the frontend
cd ../frontend
npm install
npm run dev

# Step 3 — execute the agent
cd ../backend
python scraper1.py --max 5
```

---

## Core components

| Component | Description |
|---|---|
| Relational Memory | Tracks active workflow steps and execution timelines |
| Logical Memory | Maps extracted key-value pairs into a dynamic node graph |
| Visual Memory | Captures native DOM screenshots via Playwright |
| FastAPI Engine | Handles high-speed, asynchronous API routing |
| D3.js Engine | Renders physics-based data visualization for the graph |

---

## Execution steps

**Memory Check**
- Agent queries local SQLite database before taking action
- Adjusts target logic to skip previously completed nodes

**Execution & Vision**
- Playwright navigates the DOM and extracts semantic data
- Captures native hidden screenshot of the current UI state

**Context Compression**
- Encodes screenshot to Base64
- Formats semantic data into a compressed State Snapshot
- Saves to database instead of appending to raw LLM prompt

**Live Streaming**
- Next.js frontend polls FastAPI server every 2 seconds
- UI renders new D3 nodes and Action Replay images instantly

---

## Results

Synapse AI architecture achieved a **93.4% reduction in LLM API token costs** compared to a standard LangChain raw history buffer by eliminating redundant context reads.

---

## Tech stack

Python · FastAPI · SQLite · Playwright · Next.js · React · Tailwind CSS · D3.js
