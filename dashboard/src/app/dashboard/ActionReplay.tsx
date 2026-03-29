"use client";

import { useEffect, useState } from "react";

const SYNAPSE_BASE = "https://synapse-backend-b5k1.onrender.com";

type VisualEntry = {
  id: number;
  step_name: string;
  action_taken: string;
  outcome: string;
  captured_at: string;
};

type VisualDetail = VisualEntry & {
  screenshot_b64: string;
};

export default function ActionReplay({ sessionId }: { sessionId: string }) {
  const [history, setHistory] = useState<VisualEntry[]>([]);
  const [selected, setSelected] = useState<VisualDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchHistory();
    const i = setInterval(fetchHistory, 3000);
    return () => clearInterval(i);
  }, [sessionId]);

  async function fetchHistory() {
    try {
      const r = await fetch(`${SYNAPSE_BASE}/visual/history/${sessionId}`);
      const d = await r.json();
      setHistory(d.history || []);
      setTotal(d.total_captures || 0);
    } catch { }
  }

  async function loadReplay(entry: VisualEntry) {
    setLoading(true);
    try {
      const r = await fetch(`${SYNAPSE_BASE}/visual/replay/${entry.id}`);
      const d = await r.json();
      setSelected(d);
    } catch { }
    setLoading(false);
  }

  return (
    <div className="flex h-full" style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* Left — step timeline */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-xs font-bold text-white/60 uppercase tracking-wider">Action Timeline</div>
          <div className="text-xs text-white/25 mt-1">{total} captures · session: {sessionId.slice(0, 16)}...</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20 p-8 text-center">
              <div className="text-3xl mb-3">📸</div>
              <div className="text-sm">No captures yet</div>
              <div className="text-xs mt-2">Run the agent — Synapse captures a screenshot at every step</div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {history.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => loadReplay(entry)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected?.id === entry.id
                      ? "bg-violet-600/20 border-violet-500/40"
                      : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs text-green-400 font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xs text-white/70 font-medium truncate">
                      {entry.step_name.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-white/35 truncate pl-7">{entry.outcome}</div>
                  <div className="text-xs text-white/20 pl-7 mt-1">
                    {new Date(entry.captured_at).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — screenshot viewer */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{selected.step_name.replace(/_/g, " ")}</div>
                <div className="text-xs text-white/35 mt-0.5">{selected.action_taken}</div>
              </div>
              <div className="text-xs text-white/25">{new Date(selected.captured_at).toLocaleString()}</div>
            </div>

            {/* Screenshot */}
            <div className="flex-1 p-6 flex flex-col gap-4">
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40">
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-xs text-white/60 px-2.5 py-1 rounded-lg border border-white/10 z-10">
                  📸 Screen state at execution time
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${selected.screenshot_b64}`}
                  alt={`Screenshot: ${selected.step_name}`}
                  className="w-full object-contain"
                  style={{ maxHeight: "420px" }}
                />
              </div>

              {/* Metadata cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/30 mb-1.5 uppercase tracking-wider">Action taken</div>
                  <div className="text-sm text-white/80">{selected.action_taken.replace(/_/g, " ")}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/30 mb-1.5 uppercase tracking-wider">Outcome</div>
                  <div className="text-sm text-white/80">{selected.outcome}</div>
                </div>
              </div>

              {/* Synapse insight */}
              <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-4">
                <div className="text-xs text-violet-400 font-bold mb-1.5">🧠 Synapse Visual Memory</div>
                <div className="text-xs text-violet-300/80 leading-relaxed">
                  This screenshot was captured the moment <strong>{selected.step_name.replace(/_/g, " ")}</strong> completed.
                  When this agent restarts, Synapse shows it exactly what the screen looked like —
                  preventing duplicate actions and UI confusion.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20 p-8">
            {loading ? (
              <div className="text-sm">Loading replay...</div>
            ) : history.length > 0 ? (
              <>
                <div className="text-4xl mb-3">▶</div>
                <div className="text-sm">Select a step to replay</div>
                <div className="text-xs mt-1">Click any step in the timeline to see what the screen looked like</div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">🎬</div>
                <div className="text-sm font-medium">Action Replay</div>
                <div className="text-xs mt-2 text-center max-w-xs leading-relaxed">
                  Every agent step gets a screenshot. After running the agent, come here to see exactly what the screen looked like at each moment.
                </div>
                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white/40 font-mono">
                  python agent.py "your task here"
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
