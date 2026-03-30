# Synapse SDK

Persistent memory OS for AI agents.

## Install

```bash
pip install synapse-sdk
```

## Quickstart

```python
from synapse import Synapse

syn = Synapse(api_key="syn-your-key")

# Create a session for your agent
session = syn.create_session("Extract invoices from Gmail and upload to Sheets")

# Save memory after each step
syn.update_step(session, "fetch_emails", "completed", "Fetched 50 emails")
syn.save(session, "emails_fetched", "50")

# Get compressed context for your LLM
context = syn.context(session)
# → [SYNAPSE MEMORY CONTEXT]
#   Goal: Extract invoices...
#   Completed: fetch_emails
#   Next step: parse_invoices

# After any restart — resume exactly where you stopped
result = syn.resume(session)
print(result["resume_from"])  # → {"step_name": "parse_invoices", ...}
```

## Use with any agent framework

```python
# LangChain
from synapse import Synapse
syn = Synapse(api_key="syn-your-key")
session = syn.create_session(task)

# inject context into every LLM call
context = syn.context(session)
response = llm.invoke(context + your_prompt)

# CrewAI, AutoGen, custom — same pattern
```

## API Reference

| Method | Description |
|--------|-------------|
| `syn.create_session(task)` | Create new agent session |
| `syn.save(session, key, value)` | Save memory |
| `syn.update_step(session, step, status)` | Track workflow step |
| `syn.resume(session)` | Resume after restart |
| `syn.context(session)` | Get compressed LLM context |
| `syn.get_memory(session)` | Get all session memory |
| `syn.run_step(session, step, fn)` | Auto-tracked step execution |

## Links

- Dashboard: https://synapse-aii.netlify.app
- API Docs: https://synapse-backend-b5k1.onrender.com/docs
