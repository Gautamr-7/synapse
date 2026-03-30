"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

function WordReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const { ref, inView } = useInView(0.1);
  const words = text.split(" ");
  return (
    <span ref={ref} style={{ display: "inline" }}>
      {words.map((word, i) => (
        <span key={i} style={{
          display: "inline-block",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay + i * 0.06}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay + i * 0.06}s`,
          marginRight: "0.28em",
        }}>
          {word}
        </span>
      ))}
    </span>
  );
}

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.3 });
  const [scrolled, setScrolled] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [project, setProject] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setHeroIn(true), 80);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let t = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMove);

    const draw = () => {
      t += 0.003;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── 1. LIGHT RAY FROM TOP ──────────────────────────────────────────────
      // Subtle cone of light from upper-center, slightly influenced by mouse
      const rayX = w * (0.38 + mx * 0.24);
      const coneSpread = w * 0.55;

      // Outer soft glow
      const beamGradOuter = ctx.createRadialGradient(rayX, -h * 0.05, 0, rayX, h * 0.2, h * 0.9);
      beamGradOuter.addColorStop(0, "rgba(160,210,255,0.22)");
      beamGradOuter.addColorStop(0.25, "rgba(120,180,240,0.10)");
      beamGradOuter.addColorStop(0.6, "rgba(90,150,220,0.04)");
      beamGradOuter.addColorStop(1, "rgba(60,120,200,0)");
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rayX, 0);
      ctx.lineTo(rayX - coneSpread, h);
      ctx.lineTo(rayX + coneSpread, h);
      ctx.closePath();
      ctx.fillStyle = beamGradOuter;
      ctx.fill();
      ctx.restore();

      // Inner bright core of beam
      const beamGradInner = ctx.createRadialGradient(rayX, 0, 0, rayX, h * 0.1, h * 0.55);
      beamGradInner.addColorStop(0, "rgba(200,230,255,0.28)");
      beamGradInner.addColorStop(0.18, "rgba(160,210,255,0.12)");
      beamGradInner.addColorStop(0.5, "rgba(120,185,245,0.04)");
      beamGradInner.addColorStop(1, "rgba(100,165,235,0)");
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rayX, 0);
      ctx.lineTo(rayX - coneSpread * 0.42, h);
      ctx.lineTo(rayX + coneSpread * 0.42, h);
      ctx.closePath();
      ctx.fillStyle = beamGradInner;
      ctx.fill();
      ctx.restore();

      // ── 2. ISOMETRIC CUBE TILE GRID ────────────────────────────────────────
      // Subtle diamond / isometric floor tiles drifting very slowly
      const tileW = 72;
      const tileH = 42;
      const slowDrift = (t * 4) % tileW;
      const tileOpacity = 0.045 + 0.015 * Math.sin(t * 0.6);

      ctx.save();
      ctx.strokeStyle = `rgba(140,200,255,${tileOpacity})`;
      ctx.lineWidth = 0.55;

      const cols = Math.ceil(w / tileW) + 5;
      const rows = Math.ceil(h / (tileH / 2)) + 4;

      for (let row = -2; row < rows; row++) {
        for (let col = -2; col < cols; col++) {
          const cx = col * tileW + (row % 2 === 0 ? 0 : tileW / 2) - slowDrift;
          const cy = row * (tileH / 2);

          // Diamond shape (top face of isometric cube)
          ctx.beginPath();
          ctx.moveTo(cx + tileW / 2, cy);           // top
          ctx.lineTo(cx + tileW, cy + tileH / 2);   // right
          ctx.lineTo(cx + tileW / 2, cy + tileH);   // bottom
          ctx.lineTo(cx, cy + tileH / 2);            // left
          ctx.closePath();
          ctx.stroke();

          // Optional: faint left face accent to give 3D cube feel
          const faceOpacity = tileOpacity * 0.6;
          ctx.strokeStyle = `rgba(100,170,240,${faceOpacity})`;
          ctx.beginPath();
          ctx.moveTo(cx + tileW / 2, cy + tileH);
          ctx.lineTo(cx, cy + tileH / 2);
          ctx.lineTo(cx, cy + tileH / 2 + tileH * 0.45);
          ctx.lineTo(cx + tileW / 2, cy + tileH + tileH * 0.45);
          ctx.closePath();
          ctx.stroke();
          ctx.strokeStyle = `rgba(140,200,255,${tileOpacity})`;
        }
      }
      ctx.restore();

      // ── 3. BLUE AMBIENT ORBS (mouse-following) ─────────────────────────────
      const orbs = [
        { x: 0.15 + mx * 0.18, y: 0.10 + my * 0.10, r: 0.48, c1: "rgba(80,160,255,0.14)", c2: "rgba(80,160,255,0)" },
        { x: 0.78 + mx * 0.07, y: 0.28 + my * 0.12, r: 0.36, c1: "rgba(60,140,230,0.10)", c2: "rgba(60,140,230,0)" },
        { x: 0.48 + Math.sin(t) * 0.11, y: 0.55 + Math.cos(t * 0.7) * 0.08, r: 0.52, c1: "rgba(90,170,245,0.07)", c2: "rgba(90,170,245,0)" },
        { x: 0.08 + my * 0.08, y: 0.72, r: 0.30, c1: "rgba(110,180,255,0.08)", c2: "rgba(110,180,255,0)" },
      ];

      orbs.forEach(o => {
        const gx = o.x * w, gy = o.y * h, gr = o.r * Math.max(w, h);
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grad.addColorStop(0, o.c1);
        grad.addColorStop(1, o.c2);
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const handleSignup = async () => {
    if (!name || !email || !project) return;
    setLoading(true);
    try {
      const r = await fetch("https://synapse-backend-b5k1.onrender.com/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, project })
      });
      const d = await r.json();
      setApiKey(d.api_key);
      setSubmitted(true);
    } catch {}
    setLoading(false);
  };

  // ── COLOR TOKENS (dark blue theme) ──────────────────────────────────────────
  const C = {
    bg: "#0e1520",
    text: "#d8e8f5",
    textMid: "rgba(200,225,248,0.55)",
    textDim: "rgba(180,210,240,0.35)",
    border: "rgba(160,210,255,0.10)",
    borderMid: "rgba(160,210,255,0.18)",
    surface: "rgba(160,210,255,0.05)",
    surfaceMid: "rgba(160,210,255,0.08)",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        .nav-a {
          color: rgba(200,225,248,0.45);
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }
        .nav-a:hover { color: rgba(200,225,248,0.9); }

        .btn-main {
          background: rgba(200,228,255,0.92);
          color: #0e1520;
          border: none;
          padding: 11px 22px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-main:hover { background: #ffffff; transform: translateY(-1px); box-shadow: 0 6px 28px rgba(140,200,255,0.22); }
        .btn-main:disabled { opacity: 0.35; cursor: not-allowed; }

        .btn-outline {
          background: transparent;
          color: rgba(200,225,248,0.5);
          border: 1px solid rgba(160,210,255,0.18);
          padding: 11px 22px;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .btn-outline:hover { border-color: rgba(160,210,255,0.42); color: rgba(200,225,248,0.85); background: rgba(160,210,255,0.06); }

        .display {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: -0.02em;
        }
        .display-i {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          font-weight: 400;
        }
        .body-text {
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          color: rgba(190,218,245,0.48);
          line-height: 1.75;
        }
        .mono { font-family: 'DM Mono', monospace; }

        .feature-num {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(140,200,255,0.35);
          letter-spacing: 0.06em;
        }

        .input-clean {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(160,210,255,0.16);
          color: rgba(210,232,250,0.9);
          padding: 12px 0;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          width: 100%;
          transition: border-color 0.2s;
        }
        .input-clean:focus { border-bottom-color: rgba(160,210,255,0.5); }
        .input-clean::placeholder { color: rgba(160,200,240,0.28); }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(140,200,255,0.08);
          border: 1px solid rgba(140,200,255,0.14);
          border-radius: 100px;
          padding: 5px 12px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(160,210,255,0.6);
          letter-spacing: 0.04em;
        }

        .code-block {
          background: rgba(140,200,255,0.05);
          border: 1px solid rgba(140,200,255,0.10);
          border-radius: 12px;
          padding: 22px 24px;
          font-family: 'DM Mono', monospace;
          font-size: 12.5px;
          line-height: 1.9;
          color: rgba(190,225,255,0.7);
        }

        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(140,200,255,0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(160,210,255,0.35);
          flex-shrink: 0;
        }

        hr.light { border: none; border-top: 1px solid rgba(140,200,255,0.08); }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor { animation: blink 1.1s ease-in-out infinite; }
      `}</style>

      {/* Mesh canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 40px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(14,21,32,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        transition: "all 0.4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3.5" fill="rgba(160,210,255,0.9)"/>
            <circle cx="9" cy="9" r="8" stroke="rgba(160,210,255,0.9)" strokeWidth="0.8" opacity="0.25"/>
          </svg>
          <span style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 500, letterSpacing: "0.08em", color: C.text }}>Synapse</span>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          {["Features", "Docs", "Pricing"].map(l => <a key={l} href="#" className="nav-a">{l}</a>)}
          <a href="https://synapse-backend-b5k1.onrender.com/docs" target="_blank" className="nav-a">API</a>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/dashboard" className="nav-a">Dashboard</Link>
          <a href="#signup"><button className="btn-main">Get started →</button></a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 40px 60px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", width: "100%", textAlign: "center" }}>

          <div style={{ marginBottom: 28, opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(16px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
            <span className="pill">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(140,210,255,0.7)", display: "inline-block" }} />
              pip install synapseai-sdk
            </span>
          </div>

          <h1 style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(28px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s" }}>
            <span className="display" style={{ fontSize: "clamp(58px, 9.5vw, 118px)", display: "block", color: C.text }}>
              AI agents that
            </span>
            <span className="display-i" style={{ fontSize: "clamp(58px, 9.5vw, 118px)", display: "block", color: "rgba(180,215,255,0.22)" }}>
              never forget.
            </span>
          </h1>

          <p className="body-text" style={{ fontSize: 17, maxWidth: 460, margin: "28px auto 44px", opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(20px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s" }}>
            Persistent memory infrastructure for AI agents. One API call — your agent remembers everything, resumes after any crash, never repeats work.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap", opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(16px)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.38s" }}>
            <a href="#signup"><button className="btn-main">Get free API key →</button></a>
            <Link href="/dashboard"><button className="btn-outline">Open dashboard</button></Link>
          </div>

          {/* Code preview */}
          <div style={{ marginTop: 64, opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(20px)", transition: "all 1s cubic-bezier(0.16,1,0.3,1) 0.5s", maxWidth: 560, margin: "64px auto 0" }}>
            <div className="code-block" style={{ textAlign: "left" }}>
              <div style={{ color: "rgba(140,200,255,0.35)", marginBottom: 12 }}># After any crash or restart</div>
              <div><span style={{ color: "rgba(180,215,255,0.4)" }}>from synapse import </span><span style={{ color: C.text }}>Synapse</span></div>
              <div style={{ marginTop: 8 }}><span style={{ color: C.text }}>syn</span><span style={{ color: "rgba(180,215,255,0.4)" }}> = </span><span style={{ color: C.text }}>Synapse</span><span style={{ color: "rgba(180,215,255,0.5)" }}>(api_key=</span><span style={{ color: "rgba(140,200,255,0.65)" }}>"syn-xxx"</span><span style={{ color: "rgba(180,215,255,0.5)" }}>)</span></div>
              <div><span style={{ color: C.text }}>next_step</span><span style={{ color: "rgba(180,215,255,0.4)" }}> = </span><span style={{ color: C.text }}>syn</span><span style={{ color: "rgba(180,215,255,0.4)" }}>.</span><span style={{ color: C.text }}>resume</span><span style={{ color: "rgba(180,215,255,0.5)" }}>(session)</span></div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, color: "rgba(160,210,255,0.4)" }}>
                → Synapse remembered. Resuming from: <span style={{ color: C.text }}>upload_to_sheets</span><span className="cursor">|</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="light" style={{ margin: "0 40px" }} />

      {/* PROBLEM */}
      <section style={{ position: "relative", zIndex: 10, padding: "120px 40px", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 100, alignItems: "center" }}>
          <div>
            <Reveal>
              <p className="feature-num" style={{ marginBottom: 20 }}>The problem</p>
            </Reveal>
            <div style={{ fontSize: "clamp(36px, 4.5vw, 54px)" }}>
              <div className="display" style={{ color: C.text }}>
                <WordReveal text="Every AI agent" delay={0} />
              </div>
              <div className="display-i" style={{ color: "rgba(180,215,255,0.22)" }}>
                <WordReveal text="has amnesia." delay={0.1} />
              </div>
            </div>
            <Reveal delay={0.2}>
              <p className="body-text" style={{ fontSize: 15, marginTop: 24 }}>
                Today's agents forget everything the moment they restart. Developers waste hours writing custom memory logic for every project. Workflows break on crashes. Data gets re-processed. Tokens get wasted.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Stateless execution", desc: "Agents forget completed actions and repeat work on every restart." },
                { label: "Broken workflows", desc: "Multi-step automations fail on any interruption with no recovery." },
                { label: "Duplicate work", desc: "Re-processing the same data wastes API calls, tokens, and time." },
                { label: "Fragmented context", desc: "Memory doesn't travel across model switches or agent handoffs." },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "18px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 4 }}>{item.label}</div>
                    <div className="body-text" style={{ fontSize: 13 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <hr className="light" style={{ margin: "0 40px" }} />

      {/* FEATURES */}
      <section style={{ position: "relative", zIndex: 10, padding: "120px 40px", maxWidth: 1120, margin: "0 auto" }}>
        <Reveal>
          <p className="feature-num" style={{ marginBottom: 20 }}>What Synapse does</p>
        </Reveal>
        <div style={{ marginBottom: 64 }}>
          <div className="display" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", color: C.text }}>
            <WordReveal text="Everything your agent" />
          </div>
          <div className="display-i" style={{ fontSize: "clamp(40px, 5.5vw, 68px)", color: "rgba(180,215,255,0.22)" }}>
            <WordReveal text="needs to remember." delay={0.1} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0" }}>
          {[
            { n: "01", t: "Execution Memory", d: "Every action tracked — status, timestamp, result. No repeated work. No duplicate API calls." },
            { n: "02", t: "Restart & Resume", d: "Kill the process. Restart. Your agent resumes from the exact step it stopped at." },
            { n: "03", t: "Context Compression", d: "Full history compressed into a structured prompt — goal, progress, next step. Automatic." },
            { n: "04", t: "Memory Graph", d: "Live visualization of everything the agent knows. Goal → steps → results, all connected." },
            { n: "05", t: "Developer SDK", d: "pip install synapseai-sdk. Works with LangChain, CrewAI, AutoGen, any custom agent." },
            { n: "06", t: "Cloud Storage", d: "Supabase PostgreSQL. Every developer's memory is isolated by API key. Persists forever." },
          ].map((f, i) => (
            <Reveal key={f.n} delay={i * 0.07}>
              <div style={{ padding: "32px 28px", borderRight: i % 3 !== 2 ? `1px solid ${C.border}` : "none", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div className="feature-num" style={{ marginBottom: 24 }}>{f.n}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 10 }}>{f.t}</div>
                <div className="body-text" style={{ fontSize: 13 }}>{f.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <hr className="light" style={{ margin: "0 40px" }} />

      {/* HOW IT WORKS */}
      <section style={{ position: "relative", zIndex: 10, padding: "120px 40px", maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: 80, alignItems: "start" }}>
          <div>
            <Reveal>
              <p className="feature-num" style={{ marginBottom: 20 }}>Integration</p>
            </Reveal>
            <div style={{ marginBottom: 32 }}>
              <span className="display" style={{ fontSize: "clamp(36px,4.5vw,54px)", color: C.text }}>
                <WordReveal text="Three lines." />
              </span>
              <br />
              <span className="display-i" style={{ fontSize: "clamp(36px,4.5vw,54px)", color: "rgba(180,215,255,0.22)" }}>
                <WordReveal text="Full memory." delay={0.1} />
              </span>
            </div>
            <Reveal delay={0.15}>
              <p className="body-text" style={{ fontSize: 15, maxWidth: 400, marginBottom: 32 }}>
                Drop Synapse into any agent. No schema design. No custom memory logic. No rewrites. Works with your existing stack in minutes.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="code-block">
                <div style={{ display: "flex", gap: 6, marginBottom: 16, opacity: 0.4 }}>
                  {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
                </div>
                {[
                  ["comment", "# Works with any agent framework"],
                  ["keyword", "from synapse import "],
                  ["normal", "Synapse"],
                  ["", ""],
                  ["normal", "syn = Synapse("],
                  ["string", '  api_key="syn-your-key"'],
                  ["normal", ")"],
                  ["", ""],
                  ["comment", "# Resume after any restart"],
                  ["normal", "next = syn.resume(session_id)"],
                  ["", ""],
                  ["success", '→ "Resuming from: step_4"'],
                ].map((line, i) => {
                  if (!line[1]) return <div key={i} style={{ height: 8 }} />;
                  const colors: Record<string, string> = {
                    comment: "rgba(140,200,255,0.35)",
                    keyword: "rgba(180,215,255,0.50)",
                    normal: C.text,
                    string: "rgba(140,200,255,0.65)",
                    success: "rgba(160,210,255,0.40)",
                  };
                  return <div key={i} style={{ color: colors[line[0]] || C.text, fontFamily: "DM Mono, monospace", fontSize: 12.5, lineHeight: 1.9 }}>{line[1]}</div>;
                })}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div style={{ paddingTop: 60 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { step: "01", title: "Install the SDK", body: "pip install synapseai-sdk and get your free API key from the dashboard." },
                  { step: "02", title: "Wrap your agent steps", body: "Call syn.update_step() after each action. Synapse tracks everything automatically." },
                  { step: "03", title: "Resume after any restart", body: "Call syn.resume(session_id) — Synapse returns exactly where your agent stopped." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 18, padding: "24px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                    <span className="step-num">{item.step}</span>
                    <div>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6 }}>{item.title}</div>
                      <div className="body-text" style={{ fontSize: 13 }}>{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 40, padding: 20, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "rgba(140,200,255,0.35)", marginBottom: 10, letterSpacing: "0.06em" }}>MARKET VALIDATION</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Mem0 raised $24M for agent memory", "Supermemory backed by Jeff Dean", "YC backing multiple memory startups"].map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(140,200,255,0.4)", flexShrink: 0 }} />
                      <span className="body-text" style={{ fontSize: 12 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <hr className="light" style={{ margin: "0 40px" }} />

      {/* SIGNUP */}
      <section id="signup" style={{ position: "relative", zIndex: 10, padding: "120px 40px", maxWidth: 680, margin: "0 auto" }}>
        <Reveal>
          <p className="feature-num" style={{ marginBottom: 20, textAlign: "center" }}>Get started</p>
        </Reveal>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="display" style={{ fontSize: "clamp(40px, 5.5vw, 64px)", color: C.text }}>
            <WordReveal text="Start building." />
          </div>
          <div className="display-i" style={{ fontSize: "clamp(40px, 5.5vw, 64px)", color: "rgba(180,215,255,0.22)" }}>
            <WordReveal text="Free forever." delay={0.1} />
          </div>
          <Reveal delay={0.2}>
            <p className="body-text" style={{ fontSize: 15, marginTop: 20 }}>
              Your API key is generated instantly. No credit card. No waitlist.
            </p>
          </Reveal>
        </div>

        {!submitted ? (
          <Reveal delay={0.1}>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                <input className="input-clean" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                <input className="input-clean" placeholder="Work email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <input className="input-clean" placeholder="Project name" value={project} onChange={e => setProject(e.target.value)} />
              </div>
              <button className="btn-main" onClick={handleSignup} disabled={loading || !name || !email || !project}
                style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 14 }}>
                {loading ? "Generating key..." : "Get free API key →"}
              </button>
              <p className="body-text" style={{ fontSize: 12, textAlign: "center", marginTop: 16 }}>
                Free tier: 10,000 memory ops/month. No credit card required.
              </p>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <div className="display" style={{ fontSize: 28, color: C.text, marginBottom: 8 }}>You're in.</div>
              <p className="body-text" style={{ fontSize: 14, marginBottom: 28 }}>Check your email. Your API key:</p>
              <div className="code-block" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <code style={{ fontSize: 12, color: C.text, flex: 1, textAlign: "left", wordBreak: "break-all" }}>{apiKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ background: "rgba(200,228,255,0.9)", color: "#0e1520", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono'", flexShrink: 0 }}>
                  {copied ? "✓" : "copy"}
                </button>
              </div>
              <div className="code-block" style={{ textAlign: "left" }}>
                pip install synapseai-sdk
              </div>
            </div>
          </Reveal>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${C.border}`, padding: "28px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" fill="rgba(140,200,255,0.4)"/>
          </svg>
          <span style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: "rgba(180,215,255,0.35)" }}>SYNAPSE AI</span>
        </div>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "rgba(160,210,255,0.22)" }}>Memory OS for AI Agents · 2026</p>
        <div style={{ display: "flex", gap: 20 }}>
          {[["Dashboard", "/dashboard"], ["API Docs", "https://synapse-backend-b5k1.onrender.com/docs"], ["PyPI", "https://pypi.org/project/synapseai-sdk"]].map(([label, href]) => (
            href.startsWith("/") ?
              <Link key={label} href={href} style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "rgba(160,210,255,0.3)", textDecoration: "none" }}>{label}</Link> :
              <a key={label} href={href} target="_blank" style={{ fontFamily: "'DM Sans'", fontSize: 12, color: "rgba(160,210,255,0.3)", textDecoration: "none" }}>{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}