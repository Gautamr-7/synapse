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

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>{children}</div>
  );
}

function WordReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const { ref, inView } = useInView(0.1);
  return (
    <span ref={ref} style={{ display: "inline" }}>
      {text.split(" ").map((word, i) => (
        <span key={i} style={{
          display: "inline-block",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay + i * 0.06}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay + i * 0.06}s`,
          marginRight: "0.28em",
        }}>{word}</span>
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
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }; };
    window.addEventListener("mousemove", onMove);

    const draw = () => {
      t += 0.002;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Base cyan-slate
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0,    "#3a5f72");
      base.addColorStop(0.45, "#4e7585");
      base.addColorStop(1,    "#2c4b5a");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // Main diagonal light bloom — upper right, mouse-responsive
      const bloomX = w * (0.70 + mx * 0.08);
      const bloomY = h * (-0.05 + my * 0.04);
      const bloomR  = Math.max(w, h) * 0.90;
      const bloom = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, bloomR);
      bloom.addColorStop(0,    "rgba(215,242,250,0.88)");
      bloom.addColorStop(0.06, "rgba(195,232,246,0.72)");
      bloom.addColorStop(0.16, "rgba(165,215,238,0.50)");
      bloom.addColorStop(0.32, "rgba(125,190,220,0.26)");
      bloom.addColorStop(0.55, "rgba(90,160,200,0.10)");
      bloom.addColorStop(1,    "rgba(55,120,165,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      // Secondary soft bloom — slow animated pulse
      const b2x = w * (0.82 + Math.sin(t * 0.4) * 0.03);
      const b2y = h * 0.0;
      const b2r  = Math.max(w, h) * 0.50;
      const bloom2 = ctx.createRadialGradient(b2x, b2y, 0, b2x, b2y, b2r);
      bloom2.addColorStop(0,    "rgba(235,250,255,0.52)");
      bloom2.addColorStop(0.12, "rgba(200,238,250,0.30)");
      bloom2.addColorStop(0.40, "rgba(150,210,235,0.10)");
      bloom2.addColorStop(1,    "rgba(100,175,210,0)");
      ctx.fillStyle = bloom2;
      ctx.fillRect(0, 0, w, h);

      // Lower-left shadow
      const shadow = ctx.createRadialGradient(0, h, 0, w * 0.15, h * 0.85, w * 0.85);
      shadow.addColorStop(0,    "rgba(15,32,44,0.60)");
      shadow.addColorStop(0.35, "rgba(15,32,44,0.28)");
      shadow.addColorStop(1,    "rgba(15,32,44,0)");
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, w, h);

      // Isometric tile grid
      const tileW = 72, tileH = 42;
      const slowDrift = (t * 3) % tileW;
      const tileAlpha = 0.032 + 0.008 * Math.sin(t * 0.8);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${tileAlpha})`;
      ctx.lineWidth = 0.45;
      const cols = Math.ceil(w / tileW) + 5;
      const rows = Math.ceil(h / (tileH / 2)) + 4;
      for (let row = -2; row < rows; row++) {
        for (let col = -2; col < cols; col++) {
          const cx = col * tileW + (row % 2 === 0 ? 0 : tileW / 2) - slowDrift;
          const cy = row * (tileH / 2);
          ctx.beginPath();
          ctx.moveTo(cx + tileW / 2, cy);
          ctx.lineTo(cx + tileW,     cy + tileH / 2);
          ctx.lineTo(cx + tileW / 2, cy + tileH);
          ctx.lineTo(cx,             cy + tileH / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();

      // Edge vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.28, w * 0.5, h * 0.5, h * 0.92);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(12,28,38,0.38)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, project })
      });
      const d = await r.json();
      setApiKey(d.api_key);
      setSubmitted(true);
    } catch {}
    setLoading(false);
  };

  // Text color — dark navy for readability on the light teal background
  const INK  = "rgba(6,18,28,0.92)";
  const INK2 = "rgba(6,18,28,0.54)";
  const INK3 = "rgba(6,18,28,0.32)";
  const FADE = "rgba(6,18,28,0.22)";

  // Glass surface for tiles
  const GLASS    = "rgba(255,255,255,0.28)";
  const GLASS_B  = "1px solid rgba(255,255,255,0.38)";

  return (
    <div style={{ background: "#456878", minHeight: "100vh", color: INK, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        .nav-a { color: rgba(6,18,28,0.58); text-decoration: none; font-family:'DM Sans',sans-serif; font-size:13px; letter-spacing:0.01em; transition:color 0.2s; }
        .nav-a:hover { color: rgba(6,18,28,0.92); }

        .btn-main { background:rgba(6,18,28,0.82); color:#d8eef6; border:none; padding:11px 22px; border-radius:100px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; cursor:pointer; letter-spacing:0.02em; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px; backdrop-filter:blur(8px); }
        .btn-main:hover { background:rgba(6,18,28,0.96); transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,0,0,0.22); }
        .btn-main:disabled { opacity:0.35; cursor:not-allowed; }

        .btn-outline { background:rgba(255,255,255,0.22); color:rgba(6,18,28,0.70); border:1px solid rgba(255,255,255,0.40); padding:11px 22px; border-radius:100px; font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer; transition:all 0.2s; letter-spacing:0.01em; backdrop-filter:blur(8px); }
        .btn-outline:hover { border-color:rgba(255,255,255,0.60); color:rgba(6,18,28,0.92); background:rgba(255,255,255,0.32); }

        .display { font-family:'Playfair Display',Georgia,serif; font-weight:400; line-height:0.95; letter-spacing:-0.02em; }
        .display-i { font-family:'Playfair Display',Georgia,serif; font-style:italic; font-weight:400; }
        .body-text { font-family:'DM Sans',sans-serif; font-weight:300; line-height:1.75; }
        .mono { font-family:'DM Mono',monospace; }
        .feature-num { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.06em; }

        .glass-tile { background:rgba(255,255,255,0.22); border:1px solid rgba(255,255,255,0.32); backdrop-filter:blur(18px); border-radius:14px; }
        .glass-tile-sm { background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.28); backdrop-filter:blur(14px); border-radius:10px; }

        .input-clean { background:transparent; border:none; border-bottom:1px solid rgba(6,18,28,0.22); color:rgba(6,18,28,0.90); padding:12px 0; font-family:'DM Sans',sans-serif; font-size:14px; outline:none; width:100%; transition:border-color 0.2s; }
        .input-clean:focus { border-bottom-color:rgba(6,18,28,0.55); }
        .input-clean::placeholder { color:rgba(6,18,28,0.32); }

        .pill { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.24); border:1px solid rgba(255,255,255,0.36); border-radius:100px; padding:5px 14px; font-family:'DM Mono',monospace; font-size:11px; color:rgba(6,18,28,0.62); letter-spacing:0.04em; backdrop-filter:blur(10px); }

        hr.light { border:none; border-top:1px solid rgba(255,255,255,0.15); }

        .step-num { width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.30); display:flex; align-items:center; justify-content:center; font-family:'DM Mono',monospace; font-size:11px; color:rgba(6,18,28,0.45); flex-shrink:0; }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor { animation:blink 1.1s ease-in-out infinite; }
      `}</style>

      <canvas ref={canvasRef} style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }} />

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, padding:"0 40px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", background: scrolled ? "rgba(52,90,108,0.75)" : "transparent", backdropFilter: scrolled ? "blur(24px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.12)" : "none", transition:"all 0.4s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3.5" fill={INK}/>
            <circle cx="9" cy="9" r="8" stroke={INK} strokeWidth="0.8" opacity="0.25"/>
          </svg>
          <span style={{ fontFamily:"'DM Sans'", fontSize:14, fontWeight:500, letterSpacing:"0.08em", color:INK }}>Synapse</span>
        </div>
        <div style={{ display:"flex", gap:28 }}>
          {["Features","Docs","Pricing"].map(l => <a key={l} href="#" className="nav-a">{l}</a>)}
          <a href="https://synapse-backend-b5k1.onrender.com/docs" target="_blank" className="nav-a">API</a>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <Link href="/dashboard" className="nav-a">Dashboard</Link>
          <a href="#signup"><button className="btn-main">Get started →</button></a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position:"relative", zIndex:10, minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", padding:"100px 40px 60px" }}>
        <div style={{ maxWidth:920, margin:"0 auto", width:"100%", textAlign:"center" }}>

          <div style={{ marginBottom:28, opacity:heroIn?1:0, transform:heroIn?"none":"translateY(16px)", transition:"all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
            <span className="pill">
              <span style={{ width:5, height:5, borderRadius:"50%", background:INK, opacity:0.5, display:"inline-block" }} />
              pip install synapseai-sdk
            </span>
          </div>

          <h1 style={{ opacity:heroIn?1:0, transform:heroIn?"none":"translateY(28px)", transition:"all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s" }}>
            <span className="display" style={{ fontSize:"clamp(58px,9.5vw,118px)", display:"block", color:INK }}>AI agents that</span>
            <span className="display-i" style={{ fontSize:"clamp(58px,9.5vw,118px)", display:"block", color:"rgba(6,18,28,0.28)" }}>never forget.</span>
          </h1>

          <p className="body-text" style={{ fontSize:17, color:INK2, maxWidth:460, margin:"28px auto 44px", opacity:heroIn?1:0, transform:heroIn?"none":"translateY(20px)", transition:"all 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s" }}>
            Persistent memory infrastructure for AI agents. One API call — your agent remembers everything, resumes after any crash, never repeats work.
          </p>

          <div style={{ display:"flex", gap:10, justifyContent:"center", alignItems:"center", flexWrap:"wrap", opacity:heroIn?1:0, transform:heroIn?"none":"translateY(16px)", transition:"all 0.9s cubic-bezier(0.16,1,0.3,1) 0.38s" }}>
            <a href="#signup"><button className="btn-main">Get free API key →</button></a>
            <Link href="/dashboard"><button className="btn-outline">Open dashboard</button></Link>
          </div>

          {/* Code tile */}
          <div style={{ marginTop:64, opacity:heroIn?1:0, transform:heroIn?"none":"translateY(20px)", transition:"all 1s cubic-bezier(0.16,1,0.3,1) 0.5s", maxWidth:560, margin:"64px auto 0" }}>
            <div className="glass-tile" style={{ padding:"24px 28px", textAlign:"left" }}>
              <div style={{ color:INK3, marginBottom:12, fontFamily:"'DM Mono'", fontSize:12.5 }}># After any crash or restart</div>
              <div style={{ fontFamily:"'DM Mono'", fontSize:12.5, lineHeight:1.9 }}>
                <span style={{ color:INK2 }}>from synapse import </span><span style={{ color:INK }}>Synapse</span>
              </div>
              <div style={{ fontFamily:"'DM Mono'", fontSize:12.5, lineHeight:1.9 }}>
                <span style={{ color:INK }}>syn</span><span style={{ color:INK2 }}> = </span><span style={{ color:INK }}>Synapse</span><span style={{ color:INK2 }}>(api_key=</span><span style={{ color:"rgba(6,18,28,0.65)" }}>"syn-xxx"</span><span style={{ color:INK2 }}>)</span>
              </div>
              <div style={{ fontFamily:"'DM Mono'", fontSize:12.5, lineHeight:1.9 }}>
                <span style={{ color:INK }}>next_step</span><span style={{ color:INK2 }}> = syn.</span><span style={{ color:INK }}>resume</span><span style={{ color:INK2 }}>(session)</span>
              </div>
              <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(6,18,28,0.10)", fontFamily:"'DM Mono'", fontSize:12.5, color:INK2 }}>
                → Synapse remembered. Resuming from: <span style={{ color:INK }}>upload_to_sheets</span><span className="cursor">|</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="light" style={{ margin:"0 40px" }} />

      {/* PROBLEM */}
      <section style={{ position:"relative", zIndex:10, padding:"120px 40px", maxWidth:1120, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:100, alignItems:"center" }}>
          <div>
            <Reveal><p className="feature-num" style={{ marginBottom:20, color:INK3 }}>The problem</p></Reveal>
            <div style={{ fontSize:"clamp(36px,4.5vw,54px)" }}>
              <div className="display" style={{ color:INK }}><WordReveal text="Every AI agent" /></div>
              <div className="display-i" style={{ color:"rgba(6,18,28,0.26)" }}><WordReveal text="has amnesia." delay={0.1} /></div>
            </div>
            <Reveal delay={0.2}>
              <p className="body-text" style={{ fontSize:15, color:INK2, marginTop:24 }}>
                Today's agents forget everything the moment they restart. Developers waste hours writing custom memory logic. Workflows break on crashes. Data gets re-processed. Tokens wasted.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="glass-tile" style={{ padding:"8px 0" }}>
              {[
                { label:"Stateless execution", desc:"Agents forget completed actions and repeat work on every restart." },
                { label:"Broken workflows",    desc:"Multi-step automations fail on any interruption with no recovery." },
                { label:"Duplicate work",      desc:"Re-processing the same data wastes API calls, tokens, and time." },
                { label:"Fragmented context",  desc:"Memory doesn't travel across model switches or agent handoffs." },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", gap:14, padding:"18px 24px", borderBottom: i<3 ? "1px solid rgba(255,255,255,0.14)" : "none" }}>
                  <span className="step-num">{String(i+1).padStart(2,"0")}</span>
                  <div>
                    <div style={{ fontFamily:"'DM Sans'", fontSize:14, fontWeight:500, color:INK, marginBottom:4 }}>{item.label}</div>
                    <div className="body-text" style={{ fontSize:13, color:INK2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <hr className="light" style={{ margin:"0 40px" }} />

      {/* FEATURES */}
      <section style={{ position:"relative", zIndex:10, padding:"120px 40px", maxWidth:1120, margin:"0 auto" }}>
        <Reveal><p className="feature-num" style={{ marginBottom:20, color:INK3 }}>What Synapse does</p></Reveal>
        <div style={{ marginBottom:64 }}>
          <div className="display" style={{ fontSize:"clamp(40px,5.5vw,68px)", color:INK }}><WordReveal text="Everything your agent" /></div>
          <div className="display-i" style={{ fontSize:"clamp(40px,5.5vw,68px)", color:"rgba(6,18,28,0.26)" }}><WordReveal text="needs to remember." delay={0.1} /></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
          {[
            { n:"01", t:"Execution Memory",   d:"Every action tracked — status, timestamp, result. No repeated work. No duplicate API calls." },
            { n:"02", t:"Restart & Resume",    d:"Kill the process. Restart. Your agent resumes from the exact step it stopped at." },
            { n:"03", t:"Context Compression", d:"Full history compressed into a structured prompt — goal, progress, next step. Automatic." },
            { n:"04", t:"Memory Graph",        d:"Live visualization of everything the agent knows. Goal → steps → results, all connected." },
            { n:"05", t:"Developer SDK",       d:"pip install synapseai-sdk. Works with LangChain, CrewAI, AutoGen, any custom agent." },
            { n:"06", t:"Cloud Storage",       d:"Supabase PostgreSQL. Every developer's memory is isolated by API key. Persists forever." },
          ].map((f, i) => (
            <Reveal key={f.n} delay={i * 0.07}>
              <div className="glass-tile-sm" style={{ margin:4, padding:"28px 24px" }}>
                <div className="feature-num" style={{ marginBottom:20, color:INK3 }}>{f.n}</div>
                <div style={{ fontFamily:"'DM Sans'", fontSize:15, fontWeight:500, color:INK, marginBottom:10 }}>{f.t}</div>
                <div className="body-text" style={{ fontSize:13, color:INK2 }}>{f.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <hr className="light" style={{ margin:"0 40px" }} />

      {/* HOW IT WORKS */}
      <section style={{ position:"relative", zIndex:10, padding:"120px 40px", maxWidth:1120, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"5fr 4fr", gap:80, alignItems:"start" }}>
          <div>
            <Reveal><p className="feature-num" style={{ marginBottom:20, color:INK3 }}>Integration</p></Reveal>
            <div style={{ marginBottom:32 }}>
              <span className="display" style={{ fontSize:"clamp(36px,4.5vw,54px)", color:INK }}><WordReveal text="Three lines." /></span><br />
              <span className="display-i" style={{ fontSize:"clamp(36px,4.5vw,54px)", color:"rgba(6,18,28,0.26)" }}><WordReveal text="Full memory." delay={0.1} /></span>
            </div>
            <Reveal delay={0.15}>
              <p className="body-text" style={{ fontSize:15, color:INK2, maxWidth:400, marginBottom:32 }}>
                Drop Synapse into any agent. No schema design. No rewrites. Works with your existing stack in minutes.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="glass-tile" style={{ padding:"24px 28px" }}>
                <div style={{ display:"flex", gap:6, marginBottom:16, opacity:0.5 }}>
                  {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width:8, height:8, borderRadius:"50%", background:c }} />)}
                </div>
                {[
                  { c:INK3,  t:"# Works with any agent framework" },
                  { c:INK2,  t:"from synapse import Synapse" },
                  { c:"",    t:"" },
                  { c:INK,   t:"syn = Synapse(" },
                  { c:"rgba(6,18,28,0.60)", t:'  api_key="syn-your-key"' },
                  { c:INK,   t:")" },
                  { c:"",    t:"" },
                  { c:INK3,  t:"# Resume after any restart" },
                  { c:INK,   t:"next = syn.resume(session_id)" },
                  { c:"",    t:"" },
                  { c:INK2,  t:'→ "Resuming from: step_4"' },
                ].map((line, i) => (
                  !line.t ? <div key={i} style={{ height:6 }} /> :
                  <div key={i} style={{ color:line.c, fontFamily:"DM Mono,monospace", fontSize:12.5, lineHeight:1.9 }}>{line.t}</div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div style={{ paddingTop:60 }}>
              <div style={{ display:"flex", flexDirection:"column" }}>
                {[
                  { step:"01", title:"Install the SDK",         body:"pip install synapseai-sdk and get your free API key from the dashboard." },
                  { step:"02", title:"Wrap your agent steps",   body:"Call syn.update_step() after each action. Synapse tracks everything automatically." },
                  { step:"03", title:"Resume after any restart", body:"Call syn.resume(session_id) — Synapse returns exactly where your agent stopped." },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", gap:18, padding:"24px 0", borderBottom: i<2 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                    <span className="step-num">{item.step}</span>
                    <div>
                      <div style={{ fontFamily:"'DM Sans'", fontSize:14, fontWeight:500, color:INK, marginBottom:6 }}>{item.title}</div>
                      <div className="body-text" style={{ fontSize:13, color:INK2 }}>{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="glass-tile-sm" style={{ marginTop:40, padding:20 }}>
                <div style={{ fontFamily:"'DM Mono'", fontSize:11, color:INK3, marginBottom:10, letterSpacing:"0.06em" }}>MARKET VALIDATION</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {["Mem0 raised $24M for agent memory","Supermemory backed by Jeff Dean","YC backing multiple memory startups"].map((t,i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ width:4, height:4, borderRadius:"50%", background:INK, opacity:0.3, flexShrink:0 }} />
                      <span className="body-text" style={{ fontSize:12, color:INK2 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <hr className="light" style={{ margin:"0 40px" }} />

      {/* SIGNUP */}
      <section id="signup" style={{ position:"relative", zIndex:10, padding:"120px 40px", maxWidth:680, margin:"0 auto" }}>
        <Reveal><p className="feature-num" style={{ marginBottom:20, textAlign:"center", color:INK3 }}>Get started</p></Reveal>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div className="display" style={{ fontSize:"clamp(40px,5.5vw,64px)", color:INK }}><WordReveal text="Start building." /></div>
          <div className="display-i" style={{ fontSize:"clamp(40px,5.5vw,64px)", color:"rgba(6,18,28,0.26)" }}><WordReveal text="Free forever." delay={0.1} /></div>
          <Reveal delay={0.2}><p className="body-text" style={{ fontSize:15, color:INK2, marginTop:20 }}>Your API key is generated instantly. No credit card. No waitlist.</p></Reveal>
        </div>

        {!submitted ? (
          <Reveal delay={0.1}>
            <div className="glass-tile" style={{ padding:32 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28 }}>
                <input className="input-clean" placeholder="Your name"    value={name}    onChange={e => setName(e.target.value)} />
                <input className="input-clean" placeholder="Work email"   type="email" value={email}   onChange={e => setEmail(e.target.value)} />
                <input className="input-clean" placeholder="Project name" value={project} onChange={e => setProject(e.target.value)} />
              </div>
              <button className="btn-main" onClick={handleSignup} disabled={loading||!name||!email||!project} style={{ width:"100%", justifyContent:"center", padding:"14px", fontSize:14 }}>
                {loading ? "Generating key..." : "Get free API key →"}
              </button>
              <p className="body-text" style={{ fontSize:12, color:INK3, textAlign:"center", marginTop:16 }}>Free tier: 10,000 memory ops/month. No credit card required.</p>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="glass-tile" style={{ padding:32, textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:16 }}>✓</div>
              <div className="display" style={{ fontSize:28, color:INK, marginBottom:8 }}>You're in.</div>
              <p className="body-text" style={{ fontSize:14, color:INK2, marginBottom:24 }}>Check your email. Your API key:</p>
              <div className="glass-tile-sm" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", marginBottom:14 }}>
                <code style={{ fontFamily:"'DM Mono'", fontSize:12, color:INK, flex:1, textAlign:"left", wordBreak:"break-all" }}>{apiKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                  style={{ background:"rgba(6,18,28,0.78)", color:"#cce6f0", border:"none", borderRadius:6, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono'", flexShrink:0 }}>
                  {copied?"✓":"copy"}
                </button>
              </div>
              <div className="glass-tile-sm" style={{ padding:"14px 16px", fontFamily:"'DM Mono'", fontSize:12.5, color:INK, textAlign:"left" }}>
                pip install synapseai-sdk
              </div>
            </div>
          </Reveal>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ position:"relative", zIndex:10, borderTop:"1px solid rgba(255,255,255,0.12)", padding:"28px 40px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" fill={INK} opacity="0.4"/></svg>
          <span style={{ fontFamily:"'DM Sans'", fontSize:12, fontWeight:500, letterSpacing:"0.08em", color:INK3 }}>SYNAPSE AI</span>
        </div>
        <p style={{ fontFamily:"'DM Sans'", fontSize:12, color:FADE }}>Memory OS for AI Agents · 2026</p>
        <div style={{ display:"flex", gap:20 }}>
          {[["Dashboard","/dashboard"],["API Docs","https://synapse-backend-b5k1.onrender.com/docs"],["PyPI","https://pypi.org/project/synapseai-sdk"]].map(([label,href]) => (
            href.startsWith("/") ?
              <Link key={label} href={href} style={{ fontFamily:"'DM Sans'", fontSize:12, color:INK3, textDecoration:"none" }}>{label}</Link> :
              <a key={label} href={href} target="_blank" style={{ fontFamily:"'DM Sans'", fontSize:12, color:INK3, textDecoration:"none" }}>{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
