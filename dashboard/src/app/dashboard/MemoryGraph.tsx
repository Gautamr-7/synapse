"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const SYNAPSE_BASE = "https://synapse-backend-b5k1.onrender.com";

type GraphNode = {
  id: string;
  label: string;
  type: "goal" | "step" | "result" | "memory";
  status?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
};

type GraphData = { nodes: GraphNode[]; links: GraphLink[]; };

function buildGraph(workflow: any, memory: any): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const goal = memory?.memories?.find((m: any) => m.key === "goal");
  const goalLabel = goal ? goal.value.slice(0, 40) + (goal.value.length > 40 ? "…" : "") : "Goal";

  nodes.push({ id: "goal", label: goalLabel, type: "goal" });

  (workflow?.steps || []).forEach((step: any) => {
    nodes.push({ id: step.step_name, label: step.step_name.replace(/_/g, " "), type: "step", status: step.status });
    links.push({ source: "goal", target: step.step_name });

    if (step.metadata && step.status === "completed") {
      const resultId = `result_${step.step_name}`;
      const shortResult = step.metadata.length > 35 ? step.metadata.slice(0, 35) + "…" : step.metadata;
      nodes.push({ id: resultId, label: shortResult, type: "result" });
      links.push({ source: step.step_name, target: resultId });
    }
  });

  (memory?.memories || [])
    .filter((m: any) => !["goal", "agent_name", "agent_type", "created_at", "planned_steps", "status"].includes(m.key) && !m.key.startsWith("result_"))
    .slice(0, 5)
    .forEach((m: any) => {
      const memId = `mem_${m.key}`;
      const shortVal = m.value.length > 30 ? m.value.slice(0, 30) + "…" : m.value;
      nodes.push({ id: memId, label: `${m.key}: ${shortVal}`, type: "memory" });
      links.push({ source: "goal", target: memId });
    });

  return { nodes, links };
}

export default function MemoryGraph({ sessionId }: { sessionId: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAndRender() {
      try {
        const [wRes, mRes] = await Promise.all([
          fetch(`${SYNAPSE_BASE}/workflow/session/${sessionId}`),
          fetch(`${SYNAPSE_BASE}/memory/session/${sessionId}`),
        ]);
        const [w, m] = await Promise.all([wRes.json(), mRes.json()]);
        if (cancelled) return;

        const { nodes, links } = buildGraph(w, m);
        setNodeCount(nodes.length);
        setLinkCount(links.length);
        render(nodes, links);
      } catch { }
    }

    fetchAndRender();
    const interval = setInterval(fetchAndRender, 2500);
    return () => { cancelled = true; clearInterval(interval); simRef.current?.stop(); };
  }, [sessionId]);

  function render(nodes: GraphNode[], links: GraphLink[]) {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || 700;
    const height = svgRef.current?.clientHeight || 480;

    svg.selectAll("*").remove();

    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 22).attr("refY", 5)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M2 1L8 5L2 9")
      .attr("fill", "none")
      .attr("stroke", "#ffffff30")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round");

    const g = svg.append("g");

    (svg as any).call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 2.5])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const color = (n: GraphNode) => {
      if (n.type === "goal") return "#7c3aed";
      if (n.type === "memory") return "#1e40af";
      if (n.type === "result") return "#065f46";
      if (n.status === "completed") return "#166534";
      if (n.status === "running") return "#92400e";
      if (n.status === "failed") return "#7f1d1d";
      return "#1e1e2e";
    };

    const borderColor = (n: GraphNode) => {
      if (n.type === "goal") return "#a78bfa";
      if (n.type === "memory") return "#60a5fa";
      if (n.type === "result") return "#34d399";
      if (n.status === "completed") return "#4ade80";
      if (n.status === "running") return "#fbbf24";
      if (n.status === "failed") return "#f87171";
      return "#ffffff20";
    };

    const radius = (n: GraphNode) => {
      if (n.type === "goal") return 38;
      if (n.type === "step") return 28;
      return 22;
    };

    simRef.current?.stop();
    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(d => {
        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        if (t.type === "result") return 90;
        if (t.type === "memory") return 110;
        return 130;
      }).strength(0.8))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius(n => radius(n) + 14));

    simRef.current = sim;

    const link = g.append("g").selectAll("line")
      .data(links).join("line")
      .attr("stroke", "#ffffff15")
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#arrow)");

    const node = g.append("g").selectAll<SVGGElement, GraphNode>("g")
      .data(nodes).join("g")
      .attr("cursor", "pointer")
      .on("click", (_, d) => setSelected(d));

    (node as any).call(
      d3.drag<SVGGElement, GraphNode>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

    node.append("circle")
      .attr("r", d => radius(d))
      .attr("fill", d => color(d))
      .attr("stroke", d => borderColor(d))
      .attr("stroke-width", d => d.type === "goal" ? 2 : 1);

    // Pulse ring for running steps
    node.filter(d => d.status === "running")
      .append("circle")
      .attr("r", d => radius(d) + 6)
      .attr("fill", "none")
      .attr("stroke", "#fbbf24")
      .attr("stroke-width", 1)
      .attr("opacity", 0.4)
      .append("animate")
      .attr("attributeName", "r")
      .attr("from", d => radius(d) + 4)
      .attr("to", d => radius(d) + 12)
      .attr("dur", "1.2s")
      .attr("repeatCount", "indefinite");

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => d.type === "goal" ? 11 : 9)
      .attr("font-weight", d => d.type === "goal" ? "600" : "400")
      .attr("fill", "#ffffff")
      .attr("pointer-events", "none")
      .each(function (d) {
        const el = d3.select(this);
        const words = d.label.split(" ");
        const maxWidth = radius(d) * 1.6;
        let line = "";
        let lineNumber = 0;
        const lineHeight = 11;
        const lines: string[] = [];

        words.forEach(word => {
          const test = line ? `${line} ${word}` : word;
          if (test.length * 5.5 > maxWidth && line) {
            lines.push(line);
            line = word;
            lineNumber++;
          } else {
            line = test;
          }
        });
        lines.push(line);

        const totalH = (lines.length - 1) * lineHeight;
        lines.forEach((l, i) => {
          el.append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? -totalH / 2 : lineHeight)
            .text(l);
        });
      });

    node.append("title").text(d => d.label);

    sim.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-4 text-xs text-white/30">
          <span>{nodeCount} nodes</span>
          <span>{linkCount} connections</span>
          <span>session: {sessionId}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-white/25">
          <span>scroll to zoom · drag nodes · click to inspect</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-6 py-2 border-b border-white/5">
        {[
          { color: "#7c3aed", border: "#a78bfa", label: "Goal" },
          { color: "#166534", border: "#4ade80", label: "Completed step" },
          { color: "#92400e", border: "#fbbf24", label: "Running step" },
          { color: "#1e1e2e", border: "#ffffff20", label: "Pending step" },
          { color: "#065f46", border: "#34d399", label: "Result" },
          { color: "#1e40af", border: "#60a5fa", label: "Memory" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: item.color, border: `1.5px solid ${item.border}` }} />
            <span className="text-xs text-white/30">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        <svg ref={svgRef} width="100%" height="100%" style={{ minHeight: 480 }} />

        {nodeCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
            <div className="text-4xl mb-3">◎</div>
            <div className="text-sm">No memory graph yet</div>
            <div className="text-xs mt-1">Run the agent to see nodes appear</div>
          </div>
        )}
      </div>

      {/* Selected node inspector */}
      {selected && (
        <div className="border-t border-white/10 px-6 py-3 flex items-start gap-4">
          <div className="flex-1">
            <div className="text-xs text-white/30 mb-1">Selected node</div>
            <div className="text-sm text-white font-medium">{selected.id}</div>
            <div className="text-xs text-white/50 mt-1">{selected.label}</div>
          </div>
          <div className="text-xs text-right">
            <div className={`px-2 py-1 rounded-full border text-xs ${
              selected.type === "goal" ? "bg-violet-900/40 text-violet-400 border-violet-700/40" :
              selected.status === "completed" ? "bg-green-900/40 text-green-400 border-green-700/40" :
              selected.status === "running" ? "bg-amber-900/40 text-amber-400 border-amber-700/40" :
              selected.type === "result" ? "bg-teal-900/40 text-teal-400 border-teal-700/40" :
              selected.type === "memory" ? "bg-blue-900/40 text-blue-400 border-blue-700/40" :
              "bg-white/5 text-white/30 border-white/10"
            }`}>
              {selected.status || selected.type}
            </div>
          </div>
          <button onClick={() => setSelected(null)} className="text-white/20 hover:text-white/50 text-xs">✕</button>
        </div>
      )}
    </div>
  );
}
