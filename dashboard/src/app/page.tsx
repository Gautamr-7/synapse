"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 50, ${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div style={{ background: "#050508", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.04); }
        }
        @keyframes beam-rise {
          from { height: 0; opacity: 0; }
          to { height: 220px; opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes counter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up-1 { animation: fadeUp 0.8s ease forwards; opacity: 0; animation-delay: 0.1s; }
        .fade-up-2 { animation: fadeUp 0.8s ease forwards; opacity: 0; animation-delay: 0.3s; }
        .fade-up-3 { animation: fadeUp 0.8s ease forwards; opacity: 0; animation-delay: 0.5s; }
        .fade-up-4 { animation: fadeUp 0.8s ease forwards; opacity: 0; animation-delay: 0.7s; }
        .fade-up-5 { animation: fadeUp 0.8s ease forwards; opacity: 0; animation-delay: 0.9s; }

        .nav-link {
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.03em;
          transition: color 0.2s;
        }
        .nav-link:hover { color: rgba(255,255,255,0.9); }

        .cta-btn {
          background: linear-gradient(135deg, #e85d04, #dc2f02);
          color: #fff;
          border: none;
          padding: 14px 36px;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.04em;
          transition: all 0.25s;
          box-shadow: 0 0 40px rgba(232, 93, 4, 0.35);
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(232, 93, 4, 0.55);
        }

        .feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,93,4,0.4), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover { border-color: rgba(232,93,4,0.2); transform: translateY(-4px); background: rgba(255,255,255,0.05); }
        .feature-card:hover::before { opacity: 1; }

        .code-block {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 28px 32px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          line-height: 1.8;
          position: relative;
          overflow: hidden;
        }
        .code-block::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(232,93,4,0.04) 0%, transparent 60%);
          pointer-events: none;
        }

        .stat-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 56px;
          line-height: 1;
          background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .email-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          padding: 14px 20px;
          border-radius: 40px;
          font-size: 14px;
          outline: none;
          width: 280px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.25); }
        .email-input:focus { border-color: rgba(232,93,4,0.5); }

        .glow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #e85d04;
          box-shadow: 0 0 12px #e85d04;
          animation: pulse-ring 2s ease-in-out infinite;
        }

        .section-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #e85d04;
        }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "20px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(5,5,8,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #e85d04, #dc2f02)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" fill="white" opacity="0.9"/>
              <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.08em" }}>SYNAPSE AI</span>
        </div>
        <div style={{ display: "flex", gap: 36 }}>
          {["Features", "How it works", "Pricing", "Docs"].map(l => (
            <a key={l} href="#" className="nav-link">{l}</a>
          ))}
        </div>
        <Link href="/dashboard">
          <button className="cta-btn" style={{ padding: "10px 24px", fontSize: 13 }}>Open Dashboard →</button>
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", zIndex: 1 }}>

        {/* Glow orb */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, pointerEvents: "none" }}>
          {/* Outer ring */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "1px solid rgba(232,93,4,0.12)",
            animation: "spin-slow 20s linear infinite",
          }}>
            <div style={{ position: "absolute", top: -3, left: "50%", width: 6, height: 6, borderRadius: "50%", background: "#e85d04", transform: "translateX(-50%)", boxShadow: "0 0 20px #e85d04" }} />
          </div>
          {/* Middle ring */}
          <div style={{
            position: "absolute", inset: 80, borderRadius: "50%",
            border: "1px solid rgba(232,93,4,0.18)",
            animation: "spin-slow 14s linear infinite reverse",
          }}>
            <div style={{ position: "absolute", bottom: -3, left: "50%", width: 5, height: 5, borderRadius: "50%", background: "#ff8c42", transform: "translateX(-50%)", boxShadow: "0 0 14px #ff8c42" }} />
          </div>
          {/* Core glow */}
          <div style={{
            position: "absolute", inset: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,93,4,0.25) 0%, rgba(220,47,2,0.08) 50%, transparent 70%)",
            animation: "glow-breathe 4s ease-in-out infinite",
          }} />
          {/* Inner bright core */}
          <div style={{
            position: "absolute", inset: 240,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,140,66,0.5) 0%, rgba(232,93,4,0.2) 50%, transparent 70%)",
          }} />
          {/* Vertical beam */}
          <div style={{
            position: "absolute", left: "50%", bottom: "50%",
            transform: "translateX(-50%)",
            width: 2,
            background: "linear-gradient(to top, rgba(232,93,4,0.8), transparent)",
            animation: "beam-rise 1.5s ease forwards",
            animationDelay: "0.5s",
            opacity: 0,
            height: 200,
          }} />
        </div>

        {/* Badge */}
        <div className="fade-up-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(232,93,4,0.1)", border: "1px solid rgba(232,93,4,0.25)", borderRadius: 40, padding: "6px 16px", marginBottom: 32 }}>
          <div className="glow-dot" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>Now in early access</span>
        </div>

        {/* Headline */}
        <h1 className="fade-up-2" style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(64px, 10vw, 120px)",
          lineHeight: 0.95,
          letterSpacing: "0.02em",
          marginBottom: 24,
          maxWidth: 900,
          background: "linear-gradient(180deg, #ffffff 30%, rgba(255,255,255,0.55) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          AI AGENTS<br />
          <span style={{ background: "linear-gradient(135deg, #e85d04, #ff8c42)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NEVER FORGET</span><br />
          AGAIN
        </h1>

        <p className="fade-up-3" style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", maxWidth: 520, lineHeight: 1.7, marginBottom: 40, fontWeight: 300 }}>
          Synapse is the persistent memory OS for AI agents. One API call — your agent remembers everything, picks up where it left off, never repeats work.
        </p>

        {/* CTA */}
        <div className="fade-up-4" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <input
            className="email-input"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button className="cta-btn" onClick={() => setSubmitted(true)}>
            {submitted ? "✓ You're on the list" : "Get Early Access →"}
          </button>
        </div>

        <p className="fade-up-5" style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          No credit card · Free tier forever · Deploy in 5 minutes
        </p>

        {/* Stats */}
        <div className="fade-up-5" style={{ display: "flex", gap: 64, marginTop: 80, position: "relative", zIndex: 2 }}>
          {[
            { num: "3", suffix: " lines", label: "to integrate" },
            { num: "100", suffix: "%", label: "stateless agents solved" },
            { num: "0", suffix: "ms", label: "memory overhead" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "center" }}>
                <span className="stat-num">{s.num}</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e85d04" }}>{s.suffix}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p className="section-label" style={{ marginBottom: 16 }}>Why Synapse</p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 6vw, 72px)", letterSpacing: "0.03em", lineHeight: 1, background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            WHAT EVERY AGENT<br />ACTUALLY NEEDS
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { icon: "⚡", title: "Execution Memory", desc: "Every action your agent takes is tracked with status, timestamp, and outcome. No more repeated work. No more starting over." },
            { icon: "🔄", title: "Restart & Resume", desc: "Kill the backend. Restart it. Your agent picks up from the exact step it stopped at. Persistent state that survives anything." },
            { icon: "🧠", title: "Context Compression", desc: "Long histories compressed into structured prompts. Goal + progress + next step — injected into every LLM call automatically." },
            { icon: "🕸", title: "Memory Graph", desc: "Visual node graph of everything your agent knows and did. Goal → steps → results → knowledge, all connected in real time." },
            { icon: "📸", title: "Visual Memory", desc: "Screenshots captured at every step. Your agent can literally see what the screen looked like last time it ran this action." },
            { icon: "🔑", title: "Developer API", desc: "Three lines to integrate. Works with LangChain, CrewAI, AutoGen, or any custom agent. API keys, sessions, full dashboard." },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 10, letterSpacing: "0.02em" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code section */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 48px 120px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <p className="section-label" style={{ marginBottom: 16 }}>Integration</p>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(36px, 5vw, 60px)", letterSpacing: "0.03em", lineHeight: 1.05, marginBottom: 20, background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              THREE LINES.<br />FULL MEMORY.
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, fontWeight: 300, marginBottom: 32 }}>
              Drop Synapse into any agent. No rewrites. No schema design. No custom memory logic. Just plug in and your agent remembers everything.
            </p>
            <Link href="/dashboard">
              <button className="cta-btn">Open Dashboard →</button>
            </Link>
          </div>
          <div className="code-block">
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
            </div>
            <div>
              <span style={{ color: "rgba(255,255,255,0.25)" }}># Install</span><br />
              <span style={{ color: "#ff8c42" }}>pip install</span> <span style={{ color: "rgba(255,255,255,0.7)" }}>synapse-sdk</span>
            </div>
            <br />
            <div>
              <span style={{ color: "rgba(255,255,255,0.25)" }}># Save memory after each step</span><br />
              <span style={{ color: "#60a5fa" }}>synapse</span><span style={{ color: "rgba(255,255,255,0.5)" }}>.</span><span style={{ color: "#ff8c42" }}>save</span><span style={{ color: "rgba(255,255,255,0.7)" }}>(session_id, </span><span style={{ color: "#86efac" }}>"step"</span><span style={{ color: "rgba(255,255,255,0.7)" }}>, result)</span>
            </div>
            <br />
            <div>
              <span style={{ color: "rgba(255,255,255,0.25)" }}># Resume after any restart</span><br />
              <span style={{ color: "#c4b5fd" }}>next_step</span> <span style={{ color: "rgba(255,255,255,0.5)" }}>=</span> <span style={{ color: "#60a5fa" }}>synapse</span><span style={{ color: "rgba(255,255,255,0.5)" }}>.</span><span style={{ color: "#ff8c42" }}>resume</span><span style={{ color: "rgba(255,255,255,0.7)" }}>(session_id)</span>
            </div>
            <br />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, color: "#86efac", fontSize: 12 }}>
              ✓ Synapse remembered. Resuming from: upload_to_sheets
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 48px 120px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,93,4,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <p className="section-label" style={{ marginBottom: 16 }}>Get started</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 6vw, 72px)", letterSpacing: "0.03em", lineHeight: 1, marginBottom: 20, background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          BUILD AGENTS THAT<br />ACTUALLY REMEMBER
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", marginBottom: 40, fontWeight: 300 }}>
          Join developers building the next generation of AI agents with Synapse.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <input className="email-input" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="cta-btn" onClick={() => setSubmitted(true)}>
            {submitted ? "✓ You're on the list" : "Get Early Access →"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, padding: "32px 48px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg, #e85d04, #dc2f02)" }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}>SYNAPSE AI</span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Memory OS for AI Agents · 2026</p>
        <Link href="/dashboard" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Dashboard →</Link>
      </footer>
    </div>
  );
}
