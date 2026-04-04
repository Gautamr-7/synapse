"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MemoryGraph = dynamic(() => import("./MemoryGraph"), { ssr: false });
const ActionReplay = dynamic(() => import("./ActionReplay"), { ssr: false });

const SYNAPSE_BASE = "https://synapse-backend-b5k1.onrender.com";

type Step = { step_name: string; status: string; metadata: string | null; };
type Memory = { key: string; value: string; memory_type: string; };
type Session = { session_id: string; goal: string; agent_name: string; memory_count: number; last_active: string; };
type Agent = { session_id: string; name: string; agent_type: string; task: string; total_steps: number; completed_steps: number; progress_pct: number; };
type Tab = "playground" | "sessions" | "graph" | "replay" | "api" | "compare";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("playground");
  const [sessionId, setSessionId] = useState("agent-session-001");
  const [inputSession, setInputSession] = useState("agent-session-001");
  const [workflow, setWorkflow] = useState<any>(null);
  const [memory, setMemory] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [pulse, setPulse] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [compareData, setCompareData] = useState<any>(null);
  const [predictions, setPredictions] = useState<string[]>([]);

  const fetchSession = async (sid: string) => {
    try {
      const [wRes, mRes, cRes] = await Promise.all([
        fetch(`${SYNAPSE_BASE}/workflow/session/${sid}`),
        fetch(`${SYNAPSE_BASE}/memory/session/${sid}`),
        fetch(`${SYNAPSE_BASE}/context/build/${sid}`),
      ]);
      const [w, m, c] = await Promise.all([wRes.json(), mRes.json(), cRes.json()]);
      setWorkflow(w); setMemory(m); setContext(c);

      // --- STEP 3: TOKEN COMPARISON FETCH ---
      try {
        const compRes = await fetch(`${SYNAPSE_BASE}/compare/${sid}`);
        if (compRes.ok) setCompareData(await compRes.json());
      } catch (e) { 
        console.error("Compare fetch error", e); 
      }
      // --------------------------------------

      setConnected(true);
      setLastUpdated(new Date().toLocaleTimeString());
      setPulse(true); setTimeout(() => setPulse(false), 400);
      
      const pRes = await fetch(`${SYNAPSE_BASE}/memory/predict/${sid}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPredictions(pData.predicted_keys || []);
      }

    } catch { 
      setConnected(false); 
    }
  };

  const fetchAll = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`${SYNAPSE_BASE}/developer/playground/sessions`),
        fetch(`${SYNAPSE_BASE}/agents/active`),
      ]);
      const [s, a] = await Promise.all([sRes.json(), aRes.json()]);
      setSessions(s.sessions || []);
      setAgents(a.agents || []);
      setConnected(true);
    } catch { setConnected(false); }
  };

  useEffect(() => {
    fetchSession(sessionId);
    fetchAll();
    const i = setInterval(() => { fetchSession(sessionId); fetchAll(); }, 2000);
    return () => clearInterval(i);
  }, [sessionId]);

  const completionPct = workflow ? Math.round((workflow.completed / Math.max(workflow.total_steps, 1)) * 100) : 0;

  const statusColor = (s: string) => {
    if (s === "completed") return { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", text: "#4ade80" };
    if (s === "running") return { bg: "rgba(232,93,4,0.15)", border: "rgba(232,93,4,0.4)", text: "#fb923c" };
    if (s === "failed") return { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", text: "#f87171" };
    return { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.25)" };
  };

  const statusIcon = (s: string) => {
    if (s === "completed") return "✓";
    if (s === "running") return "◌";
    if (s === "failed") return "✕";
    return "·";
  };

  const generateApiKey = async () => {
    if (!apiKeyName.trim()) return;
    try {
      const r = await fetch(`${SYNAPSE_BASE}/developer/keys`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: apiKeyName })
      });
      const d = await r.json();
      setGeneratedKey(d.api_key);
    } catch { }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "playground", label: "Playground" },
    { id: "sessions", label: "Sessions" },
    { id: "graph", label: "Memory Graph" },
    { id: "replay", label: "Action Replay" },
    { id: "api", label: "API Keys" },
    { id: "compare", label: "Token Metrics" },
  ];

  return (
    <div style={{ background: "#050508", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 8px rgba(232,93,4,0.6)} 50%{box-shadow:0 0 20px rgba(232,93,4,0.9)} }
        .step-row { transition: all 0.2s; }
        .step-row:hover { background: rgba(255,255,255,0.02) !important; }
        .session-row:hover { border-color: rgba(232,93,4,0.25) !important; background: rgba(232,93,4,0.04) !important; }
        .tab-btn { background: none; border: none; cursor: pointer; padding: 8px 16px; font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 400; letter-spacing: 0.02em; transition: all 0.2s; position: relative; }
        .agent-card:hover { border-color: rgba(232,93,4,0.3) !important; transform: translateY(-2px); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(232,93,4,0.3); border-radius: 2px; }
      `}</style>

      {/* Top nav */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 50, background: "rgba(5,5,8,0.95)", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #e85d04, #dc2f02)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2" fill="white" opacity="0.9"/><circle cx="5" cy="5" r="4.5" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4"/></svg>
            </div>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)" }}>SYNAPSE</span>
          </a>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
                style={{ color: tab === t.id ? "#fff" : "rgba(255,255,255,0.35)" }}>
                {t.label}
                {tab === t.id && <div style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg, transparent, #e85d04, transparent)" }} />}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: connected ? "#4ade80" : "#f87171" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#4ade80" : "#f87171", animation: connected && pulse ? "pulseGlow 0.4s ease" : "none" }} />
            {connected ? `live · ${lastUpdated}` : "offline"}
          </div>
        </div>
      </div>

      {/* ── PLAYGROUND ── */}
      {tab === "playground" && (
        <div style={{ padding: "24px 32px" }}>

          {/* Session loader */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "DM Mono" }}>SESSION</span>
              <input style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 13, fontFamily: "DM Mono" }}
                value={inputSession} onChange={e => setInputSession(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setSessionId(inputSession)}
                placeholder="session ID" />
            </div>
            <button onClick={() => setSessionId(inputSession)}
              style={{ background: "linear-gradient(135deg, #e85d04, #dc2f02)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans" }}>
              Load →
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Steps", value: workflow?.total_steps ?? 0, accent: "#a78bfa" },
              { label: "Completed", value: workflow?.completed ?? 0, accent: "#4ade80" },
              { label: "Pending", value: workflow?.pending ?? 0, accent: "#fb923c" },
              { label: "Memory Entries", value: memory?.memory_count ?? 0, accent: "#60a5fa" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, color: s.accent, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontFamily: "'Bebas Neue'", letterSpacing: "0.04em", color: "#fff" }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>

            {/* Workflow */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>Workflow Execution</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "DM Mono" }}>{completionPct}%</div>
              </div>
              {/* Progress */}
              <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${completionPct}%`, background: "linear-gradient(90deg, #e85d04, #fb923c)", borderRadius: 2, transition: "width 0.6s ease", boxShadow: "0 0 12px rgba(232,93,4,0.5)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {workflow?.steps?.length ? workflow.steps.map((step: Step, i: number) => {
                  const sc = statusColor(step.status);
                  return (
                    <div key={step.step_name} className="step-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: sc.bg, border: `1px solid ${sc.border}`, transition: "all 0.25s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${sc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: sc.text, flexShrink: 0 }}>
                        {step.status === "running" ? <div style={{ width: 10, height: 10, border: `1.5px solid ${sc.text}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : statusIcon(step.status)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "DM Mono" }}>{step.step_name}</div>
                        {step.metadata && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.metadata}</div>}
                      </div>
                      <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, flexShrink: 0 }}>{step.status}</div>
                    </div>
                  );
                }) : (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.15)", fontSize: 13 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>▷</div>
                    python agent.py "your task here"
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Context */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Compressed Context</div>
                  <div style={{ fontSize: 11, color: "rgba(232,93,4,0.6)" }}>→ injected into AI</div>
                </div>
                {context?.compressed_context ? (
                  <pre style={{ fontSize: 11, color: "#4ade80", background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "14px 16px", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7, border: "1px solid rgba(74,222,128,0.08)", fontFamily: "DM Mono" }}>
                    {context.compressed_context}
                  </pre>
                ) : <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "16px 0" }}>No context yet</div>}
              </div>

              {/* Memory */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Session Memory</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{memory?.memory_count ?? 0} entries</div>
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
  {memory?.memories?.length ? memory.memories.map((m: Memory) => (
    <div key={m.key} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#fb923c", fontFamily: "DM Mono" }}>{m.key}</span>
          
          {/* THE PREDICTION BADGE */}
          {predictions.includes(m.key) && (
            <span style={{ 
              fontSize: 8, 
              padding: "1px 5px", 
              background: "rgba(74,222,128,0.1)", 
              color: "#4ade80", 
              border: "1px solid rgba(74,222,128,0.2)", 
              borderRadius: 4,
              fontWeight: "bold" 
            }}>
              PREDICTED
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>{m.memory_type}</span>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.value}</div>
    </div>
  )) : <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "16px 0" }}>No memory yet</div>}
</div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ marginTop: 16, background: "rgba(232,93,4,0.06)", border: "1px solid rgba(232,93,4,0.15)", borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "rgba(232,93,4,0.7)" }}>
              {!connected ? "⚠ Backend offline — run: python -m uvicorn main:app --reload"
                : workflow?.total_steps === 0 ? 'Waiting — run: python agent.py "your task here"'
                : workflow?.pending === 0 ? "✓ Workflow complete — all steps stored in Synapse memory"
                : `Agent active — ${workflow?.completed}/${workflow?.total_steps} steps complete`}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>auto-refresh 2s</div>
          </div>
        </div>
      )}

      {/* ── SESSIONS ── */}
      {tab === "sessions" && (
        <div style={{ padding: "24px 32px" }}>
          <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>All agent sessions</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{sessions.length} sessions · {agents.length} agents</div>
          </div>

          {agents.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>Active Agents</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {agents.map(a => (
                  <div key={a.session_id} className="agent-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", transition: "all 0.25s", cursor: "pointer" }}
                    onClick={() => { setSessionId(a.session_id); setInputSession(a.session_id); setTab("playground"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{a.agent_type}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.task}</div>
                    <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", width: `${a.progress_pct}%`, background: "linear-gradient(90deg, #e85d04, #fb923c)", transition: "width 0.5s", boxShadow: "0 0 8px rgba(232,93,4,0.4)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{a.completed_steps}/{a.total_steps} steps</span>
                      <span style={{ fontSize: 11, color: "#e85d04" }}>view →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>Session History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions.length ? sessions.map(s => (
              <div key={s.session_id} className="session-row" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => { setSessionId(s.session_id); setInputSession(s.session_id); setTab("playground"); }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#fb923c", fontFamily: "DM Mono" }}>{s.session_id}</span>
                    {s.agent_name && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{s.agent_name}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.goal || "No goal"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{s.memory_count} entries</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 2 }}>{s.last_active?.slice(0, 16)}</div>
                </div>
                <div style={{ fontSize: 12, color: "#e85d04", border: "1px solid rgba(232,93,4,0.25)", borderRadius: 8, padding: "4px 12px", flexShrink: 0 }}>inspect →</div>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,255,255,0.15)", fontSize: 13 }}>
                No sessions yet — run the agent
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GRAPH ── */}
      {tab === "graph" && (
        <div style={{ height: "calc(100vh - 56px)" }}>
          <MemoryGraph sessionId={sessionId} />
        </div>
      )}

      {/* ── REPLAY ── */}
      {/* ── REPLAY ── */}
      {tab === "replay" && (
        <div style={{ 
          height: "calc(100vh - 56px)", 
          padding: "24px 32px", 
          overflowY: "auto",
          background: "#050508" 
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontFamily: "'Bebas Neue'", letterSpacing: "0.05em", color: "#fff" }}>
              Visual Action Replay
            </h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Step-by-step browser interactions captured and optimized by Synapse.
            </p>
          </div>
          
          {/* This is your dynamic component */}
          <ActionReplay sessionId={sessionId} />
        </div>
      )}

      {/* ── API KEYS ── */}
      {tab === "api" && (
        <div style={{ padding: "24px 32px", maxWidth: 680 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Developer API</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 24 }}>Generate API keys to integrate Synapse into your own agents</div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>Generate API Key</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input
                style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "DM Sans" }}
                placeholder="Project name (e.g. my-agent)"
                value={apiKeyName} onChange={e => setApiKeyName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateApiKey()}
              />
              <button onClick={generateApiKey}
                style={{ background: "linear-gradient(135deg, #e85d04, #dc2f02)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans", fontWeight: 500 }}>
                Generate
              </button>
            </div>
            {generatedKey && (
              <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 8 }}>✓ Save this key — won't be shown again</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <code style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "DM Mono", overflow: "hidden", textOverflow: "ellipsis" }}>{generatedKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ background: "none", border: "1px solid rgba(232,93,4,0.3)", color: "#e85d04", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                    {copied ? "✓" : "copy"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>Endpoints</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["POST", "/session/create", "Create a new agent session"],
                ["POST", "/memory/save", "Save any key-value to memory"],
                ["GET",  "/memory/session/{id}", "Retrieve all session memory"],
                ["POST", "/workflow/update", "Track a workflow step"],
                ["GET",  "/workflow/resume/{id}", "Resume after restart"],
                ["GET",  "/context/build/{id}", "Compressed context for LLM"],
                ["POST", "/visual/capture", "Capture screenshot at step"],
              ].map(([method, path, desc]) => (
                <div key={path} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, width: 36, color: method === "GET" ? "#4ade80" : "#fb923c", fontFamily: "DM Mono" }}>{method}</span>
                  <code style={{ fontSize: 12, color: "#fb923c", width: 220, fontFamily: "DM Mono" }}>{path}</code>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    

      {/* ── TOKEN METRICS (COMPARE) ── */}
      {tab === "compare" && (
        <div style={{ padding: "24px 32px", maxWidth: 800 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Efficiency & Cost Savings</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 24 }}>See how much API cost Synapse saves by compressing context instead of sending raw history.</div>

          {!compareData ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading token metrics... (Make sure a session is loaded in the Playground)</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* BIG NUMBERS GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 16, padding: "20px" }}>
                  <div style={{ fontSize: 11, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Without Synapse</div>
                  <div style={{ fontSize: 36, color: "#fff", fontFamily: "'Bebas Neue'" }}>{compareData.buffer_tokens.toLocaleString()} <span style={{fontSize: 14, color:"rgba(255,255,255,0.3)", fontFamily: "'DM Sans'"}}>tokens</span></div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Standard raw history buffer</div>
                </div>
                
                <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16, padding: "20px" }}>
                  <div style={{ fontSize: 11, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>With Synapse</div>
                  <div style={{ fontSize: 36, color: "#fff", fontFamily: "'Bebas Neue'" }}>{compareData.synapse_tokens.toLocaleString()} <span style={{fontSize: 14, color:"rgba(255,255,255,0.3)", fontFamily: "'DM Sans'"}}>tokens</span></div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Compressed logical context</div>
                </div>

                <div style={{ background: "rgba(232,93,4,0.05)", border: "1px solid rgba(232,93,4,0.2)", borderRadius: 16, padding: "20px" }}>
                  <div style={{ fontSize: 11, color: "#e85d04", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Total Savings</div>
                  <div style={{ fontSize: 36, color: "#e85d04", fontFamily: "'Bebas Neue'" }}>{compareData.savings_pct}%</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{compareData.tokens_saved.toLocaleString()} tokens prevented</div>
                </div>
              </div>

              {/* VISUAL BAR GRAPH */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>Memory Footprint Comparison</div>
                
                {/* Buffer Bar */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Standard Agent (100% Volume)</span>
                    <span style={{ color: "#ef4444", fontFamily: "DM Mono" }}>{compareData.buffer_tokens.toLocaleString()}</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "rgba(239,68,68,0.15)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", background: "#ef4444" }}></div>
                  </div>
                </div>

                {/* Synapse Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: "#4ade80" }}>Synapse (Only {100 - compareData.savings_pct}% Volume)</span>
                    <span style={{ color: "#4ade80", fontFamily: "DM Mono" }}>{compareData.synapse_tokens.toLocaleString()}</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${100 - compareData.savings_pct}%`, height: "100%", background: "#4ade80", transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: "0 0 10px rgba(74,222,128,0.4)" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}