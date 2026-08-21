import React, { useState, useRef, useEffect } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { callGemini, loadApiKey, saveApiKey, loadUseSearch, saveUseSearch, GEMINI_MODEL } from "./lib/gemini";

/* ============================================================
   SIDEQUEST — your career change, played like a campaign.
   Direction: retro RPG / arcade cartridge. Nothing editorial,
   nothing cartographic. The move is a game: you build a
   character (your current job + inventory of skills), pick the
   final boss (the target role), and get a quest log back.
   Palette is strictly white paper, black ink, one arcade blue.
   Pixel display type, chunky pressable buttons, a sprite that
   walks toward the exit door as you answer, an XP staircase
   chart, a skill-stats radar, and a checkable quest log.
   Powered by Gemini with live Google Search grounding.
   ============================================================ */

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

.qz {
  --ink:#0A0A0F;
  --blue:#1D2BFF;
  --blue-dk:#0A1290;
  --paper:#FFFFFF;
  --panel:#F2F4FF;
  --dim:#5A5F78;
  --px:'Press Start 2P',monospace;
  --crt:'VT323',monospace;
  --body:'IBM Plex Sans',system-ui,sans-serif;
  font-family:var(--body); color:var(--ink); background:var(--paper);
  -webkit-font-smoothing:antialiased;
}
.qz *,.qz *::before,.qz *::after{box-sizing:border-box}
.qz .px{font-family:var(--px);line-height:1.6;letter-spacing:0}
.qz .crt{font-family:var(--crt);font-size:20px;line-height:1;letter-spacing:.02em}
.qz .lbl{font-family:var(--px);font-size:9px;color:var(--blue-dk);text-transform:uppercase}
.qz .measure{max-width:62ch}
.qz button{cursor:pointer}

/* ---------- pixel-dot grid backdrop ---------- */
.qz-grid{position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(circle, rgba(29,43,255,.20) 1.5px, transparent 1.6px),
    linear-gradient(rgba(29,43,255,.10) 2px, transparent 2px),
    linear-gradient(90deg, rgba(29,43,255,.10) 2px, transparent 2px);
  background-size:18px 18px,126px 126px,126px 126px;
}
.qz-content{position:relative;z-index:1}

/* ---------- pixel panels ---------- */
.qz .card{background:#fff;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--blue);position:relative}
.qz .card--ink{box-shadow:8px 8px 0 var(--ink)}
.qz .card-hover{transition:transform .14s steps(2),box-shadow .14s steps(2)}
.qz .card-hover:hover{transform:translate(-3px,-3px);box-shadow:11px 11px 0 var(--blue)}

/* ---------- chunky pressable buttons ---------- */
.qz .btn{font-family:var(--px);font-size:11px;background:var(--blue);color:#fff;
  border:3px solid var(--ink);padding:16px 26px 15px;box-shadow:0 6px 0 var(--ink);
  transition:transform .06s,box-shadow .06s;text-transform:uppercase}
.qz .btn:hover:not(:disabled){background:var(--blue-dk)}
.qz .btn:active:not(:disabled){transform:translateY(6px);box-shadow:0 0 0 var(--ink)}
.qz .btn:disabled{opacity:.25;cursor:not-allowed}
.qz .btn-b{font-family:var(--px);font-size:9px;background:#fff;color:var(--ink);
  border:3px solid var(--ink);padding:11px 16px 10px;box-shadow:0 4px 0 var(--ink);
  transition:transform .06s,box-shadow .06s,color .1s;text-transform:uppercase}
.qz .btn-b:hover:not(:disabled){color:var(--blue)}
.qz .btn-b:active:not(:disabled){transform:translateY(4px);box-shadow:0 0 0 var(--ink)}
.qz button:focus-visible,.qz input:focus-visible{outline:3px solid var(--blue);outline-offset:2px}

/* ---------- fields ---------- */
.qz .field{width:100%;padding:13px 14px;font-size:16px;border:3px solid var(--ink);
  background:#fff;color:var(--ink);font-family:var(--body);border-radius:0;transition:box-shadow .1s steps(2)}
.qz .field::placeholder{color:#9BA0BE}
.qz .field:focus{outline:none;box-shadow:inset 0 -5px 0 rgba(29,43,255,.25),5px 5px 0 var(--blue)}
.qz .slotbox{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:11px 12px;
  border:3px solid var(--ink);background:#fff;transition:box-shadow .1s steps(2)}
.qz .slotbox:focus-within{box-shadow:inset 0 -5px 0 rgba(29,43,255,.25),5px 5px 0 var(--blue)}
.qz .slotbox input{border:none;outline:none;flex:1;min-width:130px;font-size:15px;
  font-family:var(--body);padding:4px 2px;background:transparent;color:var(--ink)}
.qz .slotbox input::placeholder{color:#9BA0BE}

/* ---------- inventory items & option chips ---------- */
.qz .item{display:inline-flex;align-items:center;gap:9px;background:var(--blue);color:#fff;
  border:2px solid var(--ink);font-family:var(--crt);font-size:18px;line-height:1;
  padding:6px 9px 7px;box-shadow:3px 3px 0 var(--ink);animation:qzEquip .18s steps(3) both}
.qz .item:hover{animation:qzWobble .3s steps(4)}
.qz .item button{background:none;border:none;color:#fff;font-family:var(--px);font-size:8px;
  line-height:1;padding:2px;opacity:.75}
.qz .item button:hover{opacity:1;color:#0A0A0F}
@keyframes qzEquip{from{transform:scale(.4) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
@keyframes qzWobble{25%{transform:rotate(-2deg)}75%{transform:rotate(2deg)}}
.qz .drop{border:2px dashed var(--blue);color:var(--blue-dk);background:#fff;
  font-family:var(--crt);font-size:17px;line-height:1;padding:5px 10px 6px;transition:all .1s steps(2)}
.qz .drop:hover{background:var(--blue);color:#fff;border-style:solid;transform:translateY(-2px)}
.qz .opt{font-family:var(--px);font-size:9px;border:3px solid var(--ink);background:#fff;
  color:var(--ink);padding:13px 18px 12px;box-shadow:0 4px 0 var(--ink);
  transition:transform .06s,box-shadow .06s,background .1s;text-transform:uppercase}
.qz .opt:hover{color:var(--blue)}
.qz .opt:active{transform:translateY(4px);box-shadow:0 0 0 var(--ink)}
.qz .opt[data-on="true"]{background:var(--blue);color:#fff;transform:translateY(4px);box-shadow:0 0 0 var(--ink)}

/* ---------- game motion ---------- */
.qz .blink{animation:qzBlink 1s steps(2) infinite}
@keyframes qzBlink{50%{opacity:0}}
.qz .bob{animation:qzBob 1s steps(2) infinite}
@keyframes qzBob{50%{transform:translateY(-4px)}}
.qz .flash{animation:qzFlash .8s steps(2) infinite}
@keyframes qzFlash{50%{background:var(--blue);color:#fff}}
.qz .marquee-dot{animation:qzBlink .7s steps(2) infinite}
.qz .fill-anim{transition:width .9s steps(12)}
@media (prefers-reduced-motion:reduce){
  .qz .blink,.qz .bob,.qz .flash,.qz .marquee-dot{animation:none!important}
  .qz .item{animation:none!important}
  .qz .fill-anim{transition:none!important}
}

/* ---------- quest checkboxes ---------- */
.qz .qcheck{width:22px;height:22px;border:3px solid var(--ink);background:#fff;flex:none;
  display:inline-flex;align-items:center;justify-content:center;transition:background .08s steps(2);padding:0}
.qz .qcheck[data-done="true"]{background:var(--blue)}
.qz .qcheck svg{opacity:0;transition:opacity .08s}
.qz .qcheck[data-done="true"] svg{opacity:1}
.qz .qdone{text-decoration:line-through;color:var(--dim)}

/* ---------- HUD tooltip for charts ---------- */
.qz .hudtip{background:var(--ink);color:#fff;border:2px solid var(--blue);
  box-shadow:4px 4px 0 rgba(29,43,255,.5);padding:10px 12px;max-width:250px}
.qz .hudtip .ht{font-family:var(--px);font-size:8px;color:#8D97FF;margin-bottom:6px;text-transform:uppercase}
.qz .hudtip .hv{font-family:var(--crt);font-size:19px;line-height:1.05}

/* ---------- dialog box (NPC) ---------- */
.qz .dialog{background:#fff;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink);padding:26px 28px;position:relative}
.qz .dialog::before{content:"";position:absolute;inset:6px;border:2px solid var(--blue);pointer-events:none}

.qz .hpbar{display:flex;gap:4px}
.qz .hpbar span{width:16px;height:16px;border:2px solid var(--ink);background:#fff}
.qz .hpbar span[data-on="true"]{background:var(--blue)}

.qz .divider{border:none;border-top:3px solid var(--ink);margin:0}

/* ---------- source links (search grounding) ---------- */
.qz .srclink{color:var(--blue-dk);text-decoration:none;border-bottom:2px solid var(--blue);
  transition:color .1s,background .1s}
.qz .srclink:hover{background:var(--blue);color:#fff}

@media print{
  .qz .no-print,.qz-grid{display:none!important}
  .qz .card,.qz .dialog{box-shadow:none}
  .qz .page-break{break-inside:avoid}
}
`;

/* ---------------- course catalog ---------------- */
/* The model may only recommend ids from this list, which is what
   stops it inventing courses that don't exist. Edit freely. */

const COURSES = [
  { id: "dl-ai-python", title: "AI Python for Beginners", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/", hours: 12, priceINR: 0, tags: ["python", "automation", "ai"] },
  { id: "dl-llm-apps", title: "Building Systems with the ChatGPT API", provider: "DeepLearning.AI", url: "https://www.deeplearning.ai/short-courses/", hours: 8, priceINR: 0, tags: ["ai", "engineering", "product"] },
  { id: "bfa-genai", title: "GenAI Launchpad", provider: "Build Fast with AI", url: "https://www.buildfastwithai.com/", hours: 40, priceINR: 24999, tags: ["ai", "engineering", "product", "automation"] },
  { id: "fcc-sql", title: "Relational Database & SQL Certification", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/learn", hours: 30, priceINR: 0, tags: ["sql", "data", "analytics"] },
  { id: "gg-data", title: "Google Data Analytics Certificate", provider: "Coursera", url: "https://www.coursera.org/professional-certificates/google-data-analytics", hours: 120, priceINR: 3500, tags: ["data", "analytics", "sql", "visualisation"] },
  { id: "gg-ux", title: "Google UX Design Certificate", provider: "Coursera", url: "https://www.coursera.org/professional-certificates/google-ux-design", hours: 130, priceINR: 3500, tags: ["design", "research", "prototyping"] },
  { id: "gg-pm", title: "Google Project Management Certificate", provider: "Coursera", url: "https://www.coursera.org/professional-certificates/google-project-management", hours: 100, priceINR: 3500, tags: ["project management", "operations", "process"] },
  { id: "ida-ux", title: "UX Design Foundations", provider: "Interaction Design Foundation", url: "https://www.interaction-design.org/courses", hours: 40, priceINR: 12000, tags: ["design", "systems", "accessibility"] },
  { id: "hubspot-inbound", title: "Inbound Marketing Certification", provider: "HubSpot Academy", url: "https://academy.hubspot.com/courses", hours: 8, priceINR: 0, tags: ["marketing", "content", "lifecycle"] },
  { id: "ahrefs-seo", title: "SEO Course for Beginners", provider: "Ahrefs Academy", url: "https://ahrefs.com/academy", hours: 6, priceINR: 0, tags: ["marketing", "seo", "content"] },
  { id: "gg-skillshop", title: "Google Analytics Certification", provider: "Google Skillshop", url: "https://skillshop.withgoogle.com/", hours: 6, priceINR: 0, tags: ["analytics", "marketing", "metrics"] },
  { id: "reforge-pmm", title: "Product Marketing Deep Dive", provider: "Reforge", url: "https://www.reforge.com/programs", hours: 30, priceINR: 165000, tags: ["marketing", "product", "positioning"] },
  { id: "maven-pm", title: "Product Management Intensive", provider: "Maven", url: "https://maven.com/", hours: 24, priceINR: 45000, tags: ["product", "roadmap", "discovery"] },
  { id: "sysdesign", title: "System Design Primer", provider: "GitHub (open source)", url: "https://github.com/donnemartin/system-design-primer", hours: 25, priceINR: 0, tags: ["engineering", "architecture"] },
  { id: "aws-cp", title: "AWS Certified Cloud Practitioner", provider: "AWS Skill Builder", url: "https://skillbuilder.aws/", hours: 30, priceINR: 8500, tags: ["cloud", "engineering", "infrastructure"] },
  { id: "aws-saa", title: "AWS Solutions Architect Associate", provider: "AWS Skill Builder", url: "https://skillbuilder.aws/", hours: 60, priceINR: 14000, tags: ["cloud", "architecture", "engineering"] },
  { id: "owasp", title: "OWASP Top 10 Web Security", provider: "OWASP", url: "https://owasp.org/www-project-top-ten/", hours: 10, priceINR: 0, tags: ["security", "engineering"] },
  { id: "ml-spec", title: "Machine Learning Specialization", provider: "Coursera / DeepLearning.AI", url: "https://www.coursera.org/specializations/machine-learning-introduction", hours: 90, priceINR: 3500, tags: ["ml", "data", "python"] },
  { id: "dbt", title: "dbt Fundamentals", provider: "dbt Labs", url: "https://learn.getdbt.com/", hours: 12, priceINR: 0, tags: ["data", "pipelines", "sql"] },
  { id: "swd", title: "Storytelling with Data Workshop", provider: "storytellingwithdata.com", url: "https://www.storytellingwithdata.com/", hours: 10, priceINR: 18000, tags: ["communication", "data", "visualisation"] },
  { id: "negotiation", title: "Negotiation Fundamentals", provider: "Coursera (Michigan)", url: "https://www.coursera.org/learn/negotiation-skills", hours: 17, priceINR: 3500, tags: ["sales", "influence", "leadership"] },
  { id: "li-consultative", title: "Foundations of Consultative Selling", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/", hours: 8, priceINR: 1500, tags: ["sales", "discovery"] },
  { id: "li-exec", title: "Communicating with Executives", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/", hours: 4, priceINR: 1500, tags: ["communication", "leadership", "influence"] },
  { id: "coaching", title: "Coaching Skills for Managers", provider: "Coursera (UC Davis)", url: "https://www.coursera.org/specializations/coaching-skills-manager", hours: 30, priceINR: 3500, tags: ["leadership", "management", "coaching"] },
  { id: "finance-nonfin", title: "Finance for Non-Financial Professionals", provider: "Coursera (Rice)", url: "https://www.coursera.org/learn/finance-for-non-finance-managers", hours: 12, priceINR: 3500, tags: ["finance", "commercial", "leadership"] },
  { id: "a11y", title: "Web Accessibility by Google", provider: "Udacity", url: "https://www.udacity.com/course/web-accessibility--ud891", hours: 14, priceINR: 0, tags: ["accessibility", "design", "frontend"] },
  { id: "figma-ds", title: "Design Systems with Figma", provider: "Figma Learn", url: "https://help.figma.com/hc/en-us/categories/360002042553", hours: 10, priceINR: 0, tags: ["design", "systems", "prototyping"] },
  { id: "odin", title: "The Odin Project — Full Stack", provider: "The Odin Project", url: "https://www.theodinproject.com/", hours: 150, priceINR: 0, tags: ["engineering", "frontend", "fullstack"] },
  { id: "nng-research", title: "UX Research Methods", provider: "Nielsen Norman Group", url: "https://www.nngroup.com/training/", hours: 14, priceINR: 60000, tags: ["research", "design", "discovery"] },
  { id: "excel-adv", title: "Excel Skills for Business", provider: "Coursera (Macquarie)", url: "https://www.coursera.org/specializations/excel", hours: 60, priceINR: 3500, tags: ["analytics", "finance", "operations"] },
];

const HORIZONS = ["2 months", "3 months", "4 months", "6 months"];

const SKILL_SUGGESTIONS = [
  "Python", "SQL", "Data analysis", "Excel", "AI tools", "Stakeholder mgmt",
  "Project mgmt", "Communication", "Design", "Marketing", "Sales", "People mgmt",
];

const DIFFICULTY = { comfortable: "WITHIN REACH", stretch: "A STRETCH", hard: "A BIG LEAP" };
const DIFFICULTY_HEARTS = { comfortable: 1, stretch: 2, hard: 3 };

/* ================= pixel sprites ================= */
/* 0 empty · 1 ink · 2 blue · 3 white */

const HERO_MAP = [
  "00222200",
  "02222220",
  "02333320",
  "02313120",
  "02333320",
  "00333300",
  "02222220",
  "22222222",
  "20222202",
  "00111100",
  "00100100",
  "01100110",
];

const DOOR_MAP = [
  "1111111111",
  "1222222221",
  "1222222221",
  "1223333221",
  "1223113221",
  "1223333221",
  "1222222221",
  "1222222221",
  "1222211221",
  "1222211221",
  "1222222221",
  "1222222221",
  "1222222221",
  "1111111111",
];

const PALETTE = { 1: "#0A0A0F", 2: "#1D2BFF", 3: "#FFFFFF" };

function Sprite({ map, size = 6, className = "", label }) {
  const h = map.length, w = map[0].length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      className={className}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {map.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "0" ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE[c]} />
        )
      )}
    </svg>
  );
}

/* The hero walks toward the exit door as inputs get answered. */
function WalkToExit({ progress }) {
  const pct = (progress / 7) * 100;
  return (
    <div className="relative" style={{ height: 150, overflow: "hidden" }}>
      <div className="absolute left-4 right-4" style={{ bottom: 26, borderBottom: "3px solid var(--ink)" }} />
      {[...Array(7)].map((_, i) => (
        <div key={i} className="absolute" style={{
          bottom: 20, left: `calc(6% + ${(i / 6.8) * 76}%)`,
          width: 10, height: 10, background: i < progress ? "var(--blue)" : "#fff",
          border: "2px solid var(--ink)", transition: "background .2s steps(2)",
        }} />
      ))}
      <div className="absolute" style={{ right: "3%", bottom: 29 }}>
        <Sprite map={DOOR_MAP} size={5} label="The door to the target role" />
      </div>
      <div
        className="absolute"
        style={{ bottom: 29, left: `calc(4% + ${pct * 0.74}%)`, transition: REDUCED ? "none" : "left .5s steps(6)" }}
      >
        <Sprite map={HERO_MAP} size={5} className={progress < 7 ? "bob" : ""} label="Your character" />
      </div>
      <div className="lbl absolute" style={{ top: 10, left: 14 }}>
        {progress === 7 ? <span className="flash px-1">READY TO GO</span> : `${7 - progress} STEPS TO GO`}
      </div>
    </div>
  );
}

/* ================= motion primitives ================= */

function useTypewriter(text, speed = 34) {
  const [n, setN] = useState(REDUCED ? text.length : 0);
  useEffect(() => {
    if (REDUCED) { setN(text.length); return; }
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return text.slice(0, n);
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [on, setOn] = useState(REDUCED);
  useEffect(() => {
    if (REDUCED) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: on ? 1 : 0,
      transform: on ? "none" : "translateY(14px)",
      transition: `opacity .35s steps(4) ${delay}ms, transform .35s steps(4) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function CountUp({ to, suffix = "", duration = 1000 }) {
  const [v, setV] = useState(REDUCED ? to : 0);
  const ref = useRef(null);
  useEffect(() => {
    if (REDUCED) { setV(to); return; }
    let raf = 0, start = null;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const step = (t) => {
        if (start === null) start = t;
        const p = Math.min(1, (t - start) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{v}{suffix}</span>;
}

/* ================= HUD tooltips ================= */

function RadarTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="hudtip">
      <div className="ht">{d.fullName}</div>
      <div className="hv" style={{ color: "#8D97FF" }}>YOU {d.you}/10</div>
      <div className="hv">NEEDS {d.need}/10</div>
    </div>
  );
}

function XpTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="hudtip">
      <div className="ht">{d.m}</div>
      <div className="hv" style={{ color: "#8D97FF" }}>{d.r}/100</div>
      <div style={{ fontFamily: "var(--body)", fontSize: 12.5, lineHeight: 1.45, marginTop: 6 }}>{d.focus}</div>
    </div>
  );
}

const pxTick = { fill: "#5A5F78", fontSize: 16, fontFamily: "VT323, monospace" };
const sqDot = (props) => {
  const { cx, cy, index } = props;
  if (cx == null || cy == null) return null;
  return <rect key={`d${index}`} x={cx - 5} y={cy - 5} width={10} height={10} fill="#fff" stroke="#0A0A0F" strokeWidth={2.5} />;
};
const sqDotActive = (props) => {
  const { cx, cy, index } = props;
  if (cx == null || cy == null) return null;
  return <rect key={`a${index}`} x={cx - 6} y={cy - 6} width={12} height={12} fill="#1D2BFF" stroke="#0A0A0F" strokeWidth={2.5} />;
};

/* ================= interactive charts ================= */

function StatsRadar({ skills }) {
  const data = skills.map((s) => ({
    fullName: s.skill,
    subject: (s.skill || "").length > 14 ? s.skill.slice(0, 13) + "…" : s.skill,
    you: Math.max(0, Math.min(10, Number(s.you) || 0)),
    need: Math.max(0, Math.min(10, Number(s.need) || 0)),
  }));
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#C9CEF5" strokeWidth={2} />
          <PolarAngleAxis dataKey="subject" tick={{ ...pxTick, fontSize: 15 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar name="Role requires" dataKey="need" stroke="#0A0A0F" strokeWidth={2.5} strokeDasharray="6 5" fill="#0A0A0F" fillOpacity={0.05} isAnimationActive={!REDUCED} />
          <Radar name="Your level" dataKey="you" stroke="#1D2BFF" strokeWidth={3} fill="#1D2BFF" fillOpacity={0.3} isAnimationActive={!REDUCED} />
          <Tooltip content={<RadarTip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* XP as a staircase — each milestone is a level-up step. */
function XpChart({ baseline, phases }) {
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const data = [
    { m: "START", r: clamp(baseline), focus: "Where you start: your readiness before the plan begins." },
    ...(phases || []).map((p, i) => ({
      m: `MONTH ${i + 1}`,
      r: clamp(p.readiness),
      focus: p.focus || "",
    })),
  ];
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 14, right: 20, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D2BFF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1D2BFF" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#DDE1FA" strokeWidth={2} vertical={false} />
          <XAxis dataKey="m" tick={pxTick} tickLine={false} axisLine={{ stroke: "#0A0A0F", strokeWidth: 3 }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={pxTick} tickLine={false} axisLine={false} />
          <Tooltip content={<XpTip />} cursor={{ stroke: "#1D2BFF", strokeWidth: 2, strokeDasharray: "5 5" }} />
          <Area type="stepAfter" dataKey="r" stroke="#1D2BFF" strokeWidth={3.5} fill="url(#xpFill)"
            dot={sqDot} activeDot={sqDotActive}
            isAnimationActive={!REDUCED} animationDuration={1300} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================= inventory (skills) input ================= */

function Inventory({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const add = (raw) => {
    const s = raw.trim().replace(/,+$/, "");
    if (!s || value.length >= 10) return;
    if (value.some((v) => v.toLowerCase() === s.toLowerCase())) { setDraft(""); return; }
    onChange([...value, s]);
    setDraft("");
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
    else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  const suggestions = SKILL_SUGGESTIONS
    .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    .slice(0, 6);

  return (
    <div>
      <div className="slotbox" onClick={() => inputRef.current?.focus()}>
        {value.map((s) => (
          <span key={s} className="item">
            {s}
            <button type="button" aria-label={`Drop ${s}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== s)); }}>X</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? "Add another…" : "Type a skill, press Enter to add"}
          aria-label="Skills you use in your current job"
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="crt" style={{ fontSize: 17, color: "var(--dim)" }}>{value.length}/10 SKILLS ADDED</span>
      </div>
      {suggestions.length > 0 && value.length < 10 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions.map((s) => (
            <button key={s} type="button" className="drop" onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- strategist prompt ---------------- */

const STRATEGIST = `You are a career transition strategist who has placed people into senior roles and is honest to the point of being uncomfortable.

RULES
- You have Google Search available. Use it to ground your assessment in current reality: what the target company is doing right now, what the target role actually demands in today's market, current hiring trends.
- Diagnose before prescribing. Name the real distance between where this person is and where they want to be. If the target is a stretch, say so and why.
- Separate what they cannot do yet from what they cannot yet prove. The second is far more common and is solved by shipping visible work, not by more courses.
- Every action must be specific enough to start tomorrow. "Network more" is not an action.
- Respect the time horizon. Do not prescribe a year of work for a two-month plan; if the goal does not fit the window, say so plainly.
- Tone: direct, warm, concrete. Second person. No filler, no motivational padding, no congratulating the user.
- Return valid JSON only. No prose, no markdown fences.`;

/* ---------------- API key gate ---------------- */

function ApiKeyPanel({ apiKey, onSave, useSearch, onToggleSearch }) {
  const [draft, setDraft] = useState(apiKey);
  const [show, setShow] = useState(false);
  const saved = apiKey && draft === apiKey;
  return (
    <div className="card card--ink p-6 md:p-8 mb-12" style={{ background: "var(--panel)" }}>
      <div className="lbl mb-2">▸ CONNECT · GEMINI API KEY</div>
      <p className="crt mb-4" style={{ fontSize: 18, color: "var(--dim)" }}>
        RUNS ON {GEMINI_MODEL.toUpperCase()}. THE KEY STAYS IN YOUR BROWSER — CALLS GO STRAIGHT TO GOOGLE.
      </p>
      <div className="flex flex-wrap gap-3 items-stretch">
        <div className="flex-1 min-w-[240px]">
          <input
            className="field"
            type={show ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            spellCheck={false}
            aria-label="Gemini API key"
          />
        </div>
        <button type="button" className="btn-b" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
        <button type="button" className="btn-b" disabled={!draft.trim() || saved} onClick={() => onSave(draft.trim())}>
          {saved ? "Saved ✓" : "Save key"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          type="button"
          className="opt"
          data-on={useSearch}
          aria-pressed={useSearch}
          onClick={() => onToggleSearch(!useSearch)}
        >
          Live Google Search: {useSearch ? "ON" : "OFF"}
        </button>
        <span className="crt" style={{ fontSize: 17, color: "var(--dim)" }}>
          {useSearch
            ? "THE PLAN IS GROUNDED IN LIVE WEB RESEARCH."
            : "TURNED OFF — USEFUL IF YOUR KEY REJECTS SEARCH GROUNDING."}
        </span>
      </div>
      <p className="crt mt-3" style={{ fontSize: 17, color: "var(--dim)" }}>
        NO KEY YET? CREATE ONE FREE AT{" "}
        <a className="srclink" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
          AISTUDIO.GOOGLE.COM/APIKEY
        </a>
      </p>
    </div>
  );
}

/* ---------------- app ---------------- */

export default function SideQuest() {
  const [f, setF] = useState({ role: "", company: "", years: "", skills: [], targetCompany: "", targetRole: "", horizon: "" });
  const [stage, setStage] = useState("form"); // form | loading | plan
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState({});
  const [error, setError] = useState(null);
  const [done, setDone] = useState({}); // checkable quest milestones
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [useSearch, setUseSearch] = useState(loadUseSearch);

  const heading = useTypewriter("A REAL PLAN FOR THE JOB YOU ACTUALLY WANT.");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const answered = [
    !!f.role.trim(), !!f.company.trim(), f.years !== "",
    f.skills.length > 0, !!f.targetRole.trim(), !!f.targetCompany.trim(), !!f.horizon,
  ];
  const progress = answered.filter(Boolean).length;
  const ready = progress === 7 && !!apiKey;

  const months = parseInt(f.horizon) || 3;
  const phaseCount = Math.min(months, 4);

  function saveKey(k) {
    setApiKey(k);
    saveApiKey(k);
    setError(null);
  }

  function toggleSearch(on) {
    setUseSearch(on);
    saveUseSearch(on);
    setError(null);
  }

  async function generate() {
    setStage("loading"); setStep(0); setError(null); setDone({});
    const P = `Currently: ${f.role} at ${f.company}, ${f.years} years there.
Self-reported skills used in the current job: ${f.skills.join(", ")}.
Wants: ${f.targetRole} at ${f.targetCompany}.
Time available: ${f.horizon}.`;

    const allSources = [];
    const ask = async (prompt) => {
      const { data, sources } = await callGemini(apiKey, prompt, { useSearch });
      allSources.push(...sources);
      return data;
    };

    try {
      const a = await ask(`${STRATEGIST}

${P}

Search for what ${f.targetCompany} is doing right now and what ${f.targetRole} roles currently demand before you assess.
Return JSON with exactly these keys:
{"read":{"headline":"one sentence naming the real distance to this target","difficulty":"comfortable|stretch|hard","assessment":"3-4 sentences on what actually stands between them and this role, specific to moving from ${f.company} to ${f.targetCompany}, referencing their self-reported skills where relevant","advantage":"the asset from their current role they are most likely undervaluing","risk":"the thing most likely to stop this in ${f.horizon}","baseline":"integer 0-100, their honest readiness for the target role today"},
"skills":[{"skill":"","why":"one sentence","proveItBy":"the concrete artefact that proves it","you":"integer 0-10, their current level given their role, tenure and self-reported skills","need":"integer 0-10, the level the target role demands"}]}
Give exactly 4 skills, most important first. Where a self-reported skill maps to a gap, use it. Be concise.`);
      setPlan((p) => ({ ...p, ...a })); setStep(1);

      const b = await ask(`${STRATEGIST}

${P}
Assessment: ${JSON.stringify(a.read)}
Skills to build: ${JSON.stringify((a.skills || []).map((s) => s.skill))}

Build the action plan. Sequence it — applications should not start before the work that makes them credible exists, unless this person is already close.
Return JSON with exactly these keys:
{"phases":[{"label":"Month 1","focus":"one line","actions":["3 specific actions, each startable tomorrow"],"milestone":"the single checkable thing that means this month worked","readiness":"integer 0-100, cumulative readiness for the target role once this month's milestone is hit; must increase month over month starting above ${Number(a?.read?.baseline) || 20}"}]}
Produce exactly ${phaseCount} phases covering ${f.horizon}. Be concise.`);
      setPlan((p) => ({ ...p, ...b })); setStep(2);

      const catalog = COURSES.map(({ id, title, provider, hours, priceINR, tags }) => ({ id, title, provider, hours, priceINR, tags }));
      const c = await ask(`${STRATEGIST}

${P}
Skills to build: ${JSON.stringify((a.skills || []).map((s) => s.skill))}

COURSE CATALOG — you may ONLY use ids from this list. Never invent a course, provider or URL. If nothing fits a skill, omit it rather than forcing a match.
${JSON.stringify(catalog)}

For the outreach section, search for who currently works at ${f.targetCompany} in or around ${f.targetRole} — team leads, hiring managers, recent joiners — and how this person can find them.
Return JSON with exactly these keys:
{"courses":[{"catalogId":"","closesSkill":"","why":"one sentence","buildWhileDoingIt":"the artefact to produce alongside it","startInMonth":1}],
"outreach":{"whoToContact":"who at ${f.targetCompany} or in that role to approach, and how to find them","message":"a ready-to-send message under 90 words, written in their voice"}}
Recommend at most 3 courses that fit inside ${f.horizon}. Be concise.`);

      const seen = new Set();
      const sources = allSources.filter((s) => s.uri && !seen.has(s.uri) && seen.add(s.uri));
      setPlan((p) => ({ ...p, ...c, sources })); setStep(3);
      setStage("plan");
    } catch (e) {
      console.error("[SIDEQUEST] plan generation failed", e);
      setError(
        e?.badKey
          ? `Gemini rejected the API key: "${e.message}" — re-check it below and save it again.`
          : `The plan could not be generated. Gemini said: "${e?.message || "unknown error"}". ` +
            (useSearch
              ? "If that mentions search, grounding, or tools, switch Live Google Search off below and try again."
              : "Try again in a moment — if it persists, check your key's quota in AI Studio.")
      );
      setStage("form");
    }
  }

  function download() {
    const r = plan.read || {};
    const L = [`# ${f.role} → ${f.targetRole}`, ``, `${f.company} → ${f.targetCompany} · ${f.horizon}`, ``,
      `Current skills: ${f.skills.join(", ")}`, ``, `---`, ``,
      `## The read`, ``, `**${r.headline || ""}**`, ``, r.assessment || "", ``,
      `**Your advantage:** ${r.advantage || ""}`, ``, `**Biggest risk:** ${r.risk || ""}`, ``, `## Skills to build`, ``];
    (plan.skills || []).forEach((s) => L.push(`### ${s.skill} (you: ${s.you}/10 · role needs: ${s.need}/10)`, s.why, ``, `**Prove it by:** ${s.proveItBy}`, ``));
    L.push(`## The plan`, ``);
    (plan.phases || []).forEach((p) => {
      L.push(`### ${p.label} — ${p.focus}`, ``);
      (p.actions || []).forEach((a) => L.push(`- ${a}`));
      L.push(``, `**Milestone:** ${p.milestone}`, ``);
    });
    if (plan.courses?.length) {
      L.push(`## Courses`, ``);
      plan.courses.forEach((c) => {
        const cat = COURSES.find((x) => x.id === c.catalogId); if (!cat) return;
        L.push(`### ${cat.title} — ${cat.provider}`, `${cat.hours} hrs · ${cat.priceINR === 0 ? "Free" : "₹" + cat.priceINR.toLocaleString("en-IN")} · start month ${c.startInMonth}`, cat.url, ``, `${c.why}`, ``, `**Build while doing it:** ${c.buildWhileDoingIt}`, ``);
      });
    }
    if (plan.outreach) L.push(`## Outreach`, ``, plan.outreach.whoToContact || "", ``, `> ${(plan.outreach.message || "").replace(/\n/g, "\n> ")}`, ``);
    if (plan.sources?.length) {
      L.push(`## Sources (via Google Search grounding)`, ``);
      plan.sources.forEach((s) => L.push(`- [${s.title}](${s.uri})`));
      L.push(``);
    }
    const blob = new Blob([L.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "career-plan.md"; a.click(); URL.revokeObjectURL(a.href);
  }

  const Header = () => (
    <header className="flex items-center justify-between py-5" style={{ borderBottom: "3px solid var(--ink)" }}>
      <div className="flex items-center gap-3">
        <Sprite map={HERO_MAP} size={2.4} />
        <span className="px" style={{ fontSize: 14 }}>SIDEQUEST</span>
      </div>
      <span className="crt" style={{ fontSize: 18, color: "var(--dim)" }}>CAREER TRANSITION PLANNER v2.0</span>
    </header>
  );

  /* ---------- loading ---------- */
  if (stage === "loading") {
    const steps = ["REVIEWING YOUR PROFILE", "RESEARCHING THE MARKET (GOOGLE SEARCH)", "BUILDING YOUR ROADMAP"];
    return (
      <div className="qz min-h-screen">
        <style>{STYLES}</style>
        <div className="qz-grid" aria-hidden="true" />
        <div className="qz-content min-h-screen flex items-center justify-center px-6">
          <div className="card p-10 md:p-12 max-w-[500px] w-full">
            <div className="flex justify-center mb-6"><Sprite map={HERO_MAP} size={7} className="bob" /></div>
            <div className="px text-center" style={{ fontSize: 14, lineHeight: 1.9 }}>NOW LOADING<span className="blink">▮</span></div>
            <p className="crt text-center mt-2 mb-7" style={{ color: "var(--dim)" }}>ABOUT 30 SECONDS. LIVE RESEARCH TAKES A MOMENT.</p>
            <div className="space-y-3 mb-7">
              {steps.map((s, i) => (
                <div key={s} className="crt flex items-center gap-3" style={{ fontSize: 19, color: i < step ? "var(--ink)" : i === step ? "var(--blue-dk)" : "var(--dim)" }}>
                  <span>{i < step ? "[OK]" : i === step ? "[..]" : "[  ]"}</span>
                  <span>{s}{i === step && <span className="blink">_</span>}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-[5px]" aria-hidden="true">
              {[...Array(14)].map((_, i) => (
                <span key={i} className={i % 3 === step % 3 ? "marquee-dot" : ""} style={{
                  flex: 1, height: 18, border: "2px solid var(--ink)",
                  background: i <= step * 4 + 2 ? "var(--blue)" : "#fff",
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- plan (quest log) ---------- */
  if (stage === "plan") {
    const r = plan.read || {};
    const hearts = DIFFICULTY_HEARTS[r.difficulty] || 2;
    return (
      <div className="qz min-h-screen">
        <style>{STYLES}</style>
        <div className="qz-grid" aria-hidden="true" />
        <div className="qz-content max-w-[920px] mx-auto px-6 md:px-10 pb-6">
          <Header />

          {/* status screen */}
          <Reveal>
            <div className="card mt-10 p-7 md:p-10">
              <div className="lbl mb-4">▸ YOUR SNAPSHOT</div>
              <h1 className="px" style={{ fontSize: "clamp(15px,3.4vw,26px)", lineHeight: 1.75 }}>
                {f.role}<br />
                <span style={{ color: "var(--blue)" }}>▶ {f.targetRole}</span>
              </h1>
              <div className="crt mt-4 flex flex-wrap gap-x-6 gap-y-1" style={{ fontSize: 19, color: "var(--dim)" }}>
                <span>COMPANY: {f.company} → {f.targetCompany}</span>
                <span>TIMELINE: {f.horizon.toUpperCase()}</span>
                <span>TENURE: {f.years} YRS</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mt-7">
                <div className="p-4" style={{ border: "3px solid var(--ink)" }}>
                  <div className="lbl mb-2">READINESS TODAY</div>
                  <div className="crt" style={{ fontSize: 40, color: "var(--blue)" }}>
                    <CountUp to={Math.max(0, Math.min(100, Number(r.baseline) || 0))} />/100
                  </div>
                </div>
                <div className="p-4" style={{ border: "3px solid var(--ink)" }}>
                  <div className="lbl mb-2">{DIFFICULTY[r.difficulty] || "A STRETCH"}</div>
                  <div className="hpbar mt-2" aria-label={`Difficulty ${hearts} of 3`}>
                    {[0, 1, 2].map((i) => <span key={i} data-on={i < hearts} />)}
                  </div>
                  <div className="crt mt-2" style={{ fontSize: 17, color: "var(--dim)" }}>DIFFICULTY</div>
                </div>
                <div className="p-4" style={{ border: "3px solid var(--ink)" }}>
                  <div className="lbl mb-2">SKILLS</div>
                  <div className="crt" style={{ fontSize: 40 }}>{f.skills.length}<span style={{ fontSize: 20, color: "var(--dim)" }}> LISTED</span></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-7 no-print">
                <button className="btn-b" onClick={download}>Download plan ↓</button>
                <button className="btn-b" onClick={() => window.print()}>Print</button>
                <button className="btn-b" onClick={() => { setStage("form"); setPlan({}); }}>Start over</button>
              </div>
            </div>
          </Reveal>

          {/* stage 1 — the read */}
          <Reveal className="page-break">
            <section className="py-14">
              <div className="lbl mb-4">▸ STEP 1 · THE HONEST READ</div>
              <p className="px measure" style={{ fontSize: "clamp(13px,2.6vw,19px)", lineHeight: 2 }}>{r.headline}</p>
              <p className="text-[15.5px] leading-[1.8] measure mt-6 mb-8">{r.assessment}</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card card--ink card-hover p-6">
                  <div className="lbl mb-3">HIDDEN ASSET · WHAT YOU'RE UNDERVALUING</div>
                  <p className="text-[15px] leading-[1.65]">{r.advantage}</p>
                </div>
                <div className="card card--ink card-hover p-6" style={{ background: "var(--panel)" }}>
                  <div className="lbl mb-3">WATCH OUT · BIGGEST RISK</div>
                  <p className="text-[15px] leading-[1.65]">{r.risk}</p>
                </div>
              </div>
            </section>
          </Reveal>

          <hr className="divider" />

          {/* stage 2 — character stats */}
          <Reveal className="page-break">
            <section className="py-14">
              <div className="lbl mb-4">▸ STEP 2 · SKILLS ASSESSMENT</div>
              <h2 className="px mb-2" style={{ fontSize: "clamp(13px,2.4vw,18px)", lineHeight: 1.9 }}>YOUR SKILLS VS WHAT THE ROLE REQUIRES</h2>
              <p className="crt mb-8" style={{ fontSize: 19, color: "var(--dim)" }}>BLUE = YOUR LEVEL · DASHED = REQUIRED. HOVER ANY SKILL.</p>
              <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 items-start">
                <div className="card p-4">
                  <StatsRadar skills={plan.skills || []} />
                </div>
                <div className="space-y-5">
                  {(plan.skills || []).map((s, i) => {
                    const you = Math.max(0, Math.min(10, Number(s.you) || 0));
                    const need = Math.max(0, Math.min(10, Number(s.need) || 0));
                    return (
                      <div key={i} className="card card--ink p-5">
                        <div className="flex items-baseline justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-[16.5px]">{s.skill}</h3>
                          <span className="crt whitespace-nowrap" style={{ fontSize: 19, color: "var(--blue)" }}>{you} ▶ {need}</span>
                        </div>
                        <div className="flex gap-[4px] mb-3" aria-label={`${s.skill}: level ${you} of ${need} required`}>
                          {[...Array(10)].map((_, j) => (
                            <span key={j} style={{
                              flex: 1, height: 12,
                              border: j < need ? "2px solid var(--ink)" : "2px solid #D8DBEE",
                              background: j < you ? "var(--blue)" : "#fff",
                            }} />
                          ))}
                        </div>
                        <p className="text-[14px] leading-[1.6] mb-2">{s.why}</p>
                        <p className="crt" style={{ fontSize: 18, color: "var(--blue-dk)" }}>PROVE IT WITH: <span style={{ color: "var(--ink)" }}>{s.proveItBy}</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </Reveal>

          <hr className="divider" />

          {/* stage 3 — quest log */}
          <Reveal>
            <section className="py-14">
              <div className="lbl mb-4">▸ STEP 3 · MONTHLY ROADMAP</div>
              <h2 className="px mb-2" style={{ fontSize: "clamp(13px,2.4vw,18px)", lineHeight: 1.9 }}>READINESS CURVE — EACH MILESTONE MOVES YOU UP</h2>
              <p className="crt mb-7" style={{ fontSize: 19, color: "var(--dim)" }}>HOVER A STEP TO SEE WHAT THE MONTH IS FOR. TICK MILESTONES AS YOU COMPLETE THEM.</p>
              <div className="card p-4 md:p-6 mb-9">
                <XpChart baseline={r.baseline} phases={plan.phases} />
              </div>
              <div className="space-y-7">
                {(plan.phases || []).map((p, i) => (
                  <Reveal key={i} delay={i * 80} className="page-break">
                    <div className="card card-hover p-6 md:p-8">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="px" style={{ fontSize: 10, background: "var(--ink)", color: "#fff", padding: "8px 10px 7px" }}>
                          {(p.label || `MONTH ${i + 1}`).toUpperCase()}
                        </span>
                        <span className="crt" style={{ fontSize: 19 }}>{p.focus}</span>
                        <span className="crt ml-auto" style={{ fontSize: 19, color: "var(--blue)" }}>{Math.max(0, Math.min(100, Number(p.readiness) || 0))}/100</span>
                      </div>
                      <ul className="space-y-3">
                        {(p.actions || []).map((a, j) => (
                          <li key={j} className="flex gap-3 text-[15px] leading-[1.65]">
                            <span className="crt" style={{ fontSize: 19, color: "var(--blue)" }}>▸</span>
                            <span className="measure">{a}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 pt-5 flex items-start gap-3" style={{ borderTop: "2px dashed var(--ink)" }}>
                        <button
                          type="button"
                          className="qcheck"
                          data-done={!!done[i]}
                          aria-pressed={!!done[i]}
                          aria-label={`Mark milestone for ${p.label} as ${done[i] ? "not cleared" : "cleared"}`}
                          onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2.5" /></svg>
                        </button>
                        <span className={`text-[14.5px] leading-[1.6] ${done[i] ? "qdone" : ""}`}>
                          <span className="lbl">MILESTONE · </span>{p.milestone}
                        </span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>
          </Reveal>

          <hr className="divider" />

          {/* stage 4 — item shop */}
          <Reveal>
            <section className="py-14">
              <div className="lbl mb-4">▸ STEP 4 · RECOMMENDED COURSES</div>
              <h2 className="px mb-2" style={{ fontSize: "clamp(13px,2.4vw,18px)", lineHeight: 1.9 }}>COURSES THAT CLOSE A NAMED GAP</h2>
              <p className="crt mb-8" style={{ fontSize: 19, color: "var(--dim)" }}>NO DECORATIVE CERTIFICATES. EACH ONE MUST PRODUCE AN ARTEFACT.</p>
              <div className="grid md:grid-cols-2 gap-6">
                {(plan.courses || []).map((c, i) => {
                  const cat = COURSES.find((x) => x.id === c.catalogId);
                  if (!cat) return null;
                  return (
                    <Reveal key={i} delay={i * 80} className="page-break">
                      <div className="card card-hover p-6 flex flex-col h-full">
                        <div className="lbl mb-3">START IN MONTH {c.startInMonth} · BUILDS {String(c.closesSkill || "").toUpperCase()}</div>
                        <h3 className="font-semibold text-[17px] mb-1">{cat.title}</h3>
                        <div className="crt mb-4" style={{ fontSize: 18, color: "var(--dim)" }}>{cat.provider.toUpperCase()}</div>
                        <p className="text-[14.5px] leading-[1.6] mb-3 flex-1">{c.why}</p>
                        <p className="crt mb-5" style={{ fontSize: 18, color: "var(--blue-dk)" }}>YOU'LL BUILD: <span style={{ color: "var(--ink)" }}>{c.buildWhileDoingIt}</span></p>
                        <div className="crt flex items-center justify-between pt-4" style={{ fontSize: 19, borderTop: "2px dashed var(--ink)" }}>
                          <span>{cat.hours} HRS</span>
                          <span style={{ color: "var(--blue)" }}>{cat.priceINR === 0 ? "FREE" : `₹${cat.priceINR.toLocaleString("en-IN")}`}</span>
                        </div>
                        <a href={cat.url} target="_blank" rel="noopener noreferrer" className="btn-b mt-4 text-center no-print" style={{ textDecoration: "none", display: "block" }}>
                          View course →
                        </a>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          </Reveal>

          <hr className="divider" />

          {/* stage 5 — NPC encounter */}
          {plan.outreach && (
            <Reveal>
              <section className="py-14">
                <div className="lbl mb-4">▸ STEP 5 · OUTREACH</div>
                <h2 className="px mb-6" style={{ fontSize: "clamp(13px,2.4vw,18px)", lineHeight: 1.9 }}>WHO TO TALK TO AT {f.targetCompany.toUpperCase()}</h2>
                <p className="text-[15.5px] leading-[1.75] measure mb-8">{plan.outreach.whoToContact}</p>
                <div className="dialog">
                  <div className="lbl mb-4">YOUR MESSAGE · READY TO SEND</div>
                  <p className="text-[15px] leading-[1.8] whitespace-pre-wrap measure">{plan.outreach.message}</p>
                  <div className="crt mt-5 text-right blink" aria-hidden="true" style={{ fontSize: 22, color: "var(--blue)" }}>▼</div>
                </div>
              </section>
            </Reveal>
          )}

          {/* stage 6 — search intel (grounding sources) */}
          {plan.sources?.length > 0 && (
            <Reveal>
              <section className="py-14 pb-24">
                <div className="lbl mb-4">▸ STEP 6 · RESEARCH SOURCES</div>
                <h2 className="px mb-2" style={{ fontSize: "clamp(13px,2.4vw,18px)", lineHeight: 1.9 }}>LIVE RESEARCH FROM GOOGLE SEARCH</h2>
                <p className="crt mb-6" style={{ fontSize: 19, color: "var(--dim)" }}>THIS PLAN WAS GROUNDED IN THESE SOURCES, FETCHED MOMENTS AGO.</p>
                <ul className="space-y-2">
                  {plan.sources.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[14.5px] leading-[1.6]">
                      <span className="crt" style={{ fontSize: 19, color: "var(--blue)" }}>▸</span>
                      <a className="srclink" href={s.uri} target="_blank" rel="noopener noreferrer">{s.title}</a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </div>
      </div>
    );
  }

  /* ---------- form (character creation) ---------- */
  return (
    <div className="qz min-h-screen">
      <style>{STYLES}</style>
      <div className="qz-grid" aria-hidden="true" />
      <div className="qz-content max-w-[1080px] mx-auto px-6 md:px-10">
        <Header />

        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center py-12 md:py-16">
          <div>
            <div className="lbl mb-5">▸ NEW PLAN · 7 INPUTS · 1 ROADMAP</div>
            <h1 className="px" style={{ fontSize: "clamp(17px,3.6vw,30px)", lineHeight: 1.8, minHeight: "3.6em" }}>
              {heading}<span className="blink">▮</span>
            </h1>
            <p className="text-[16px] leading-[1.7] measure mt-5" style={{ color: "var(--dim)" }}>
              Tell it where you work today, the skills you already have, and the role
              you want next. You get an honest read on the gap, a month-by-month
              roadmap, and only the courses that close a real need — grounded in
              live Google Search research via Gemini.
            </p>
          </div>
          <div className="card p-3">
            <WalkToExit progress={progress} />
          </div>
        </div>

        {error && (
          <div className="card p-4 mb-8 crt" style={{ fontSize: 19 }}>
            ⚠ {error}
          </div>
        )}

        <ApiKeyPanel apiKey={apiKey} onSave={saveKey} useSearch={useSearch} onToggleSearch={toggleSearch} />

        <div className="card p-7 md:p-12 mb-12">
          <div className="lbl mb-8">▸ YOUR PROFILE</div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-8">
            <label className="block">
              <span className="lbl block mb-3">01 · CURRENT ROLE</span>
              <input className="field" value={f.role} onChange={(e) => set("role", e.target.value)} placeholder="Senior Data Analyst" />
            </label>
            <label className="block">
              <span className="lbl block mb-3">02 · CURRENT COMPANY</span>
              <input className="field" value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Freshworks" />
            </label>
            <label className="block">
              <span className="lbl block mb-3">03 · YEARS AT THE COMPANY</span>
              <input type="number" min="0" max="50" className="field" value={f.years} onChange={(e) => set("years", e.target.value)} placeholder="4" />
            </label>
            <div className="md:row-span-2">
              <span className="lbl block mb-1">04 · SKILL SET — SKILLS YOU USE IN THIS JOB</span>
              <span className="crt block mb-3" style={{ fontSize: 18, color: "var(--dim)" }}>THE PLAN BUILDS ON WHAT YOU ALREADY HAVE.</span>
              <Inventory value={f.skills} onChange={(v) => set("skills", v)} />
            </div>
            <label className="block">
              <span className="lbl block mb-3">05 · TARGET ROLE</span>
              <input className="field" value={f.targetRole} onChange={(e) => set("targetRole", e.target.value)} placeholder="Product Manager" />
            </label>
            <label className="block md:col-span-2">
              <span className="lbl block mb-3">06 · TARGET COMPANY</span>
              <input className="field" value={f.targetCompany} onChange={(e) => set("targetCompany", e.target.value)} placeholder="Razorpay" />
            </label>
            <div className="md:col-span-2">
              <span className="lbl block mb-1">07 · TIMELINE</span>
              <span className="crt block mb-3" style={{ fontSize: 18, color: "var(--dim)" }}>SETS THE CEILING ON WHAT THE PLAN CAN ASK OF YOU.</span>
              <div className="flex flex-wrap gap-3">
                {HORIZONS.map((h) => (
                  <button key={h} type="button" className="opt" data-on={f.horizon === h} onClick={() => set("horizon", h)}>{h}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 flex flex-wrap items-center gap-6" style={{ borderTop: "3px solid var(--ink)" }}>
            <button className="btn" disabled={!ready} onClick={generate}>▶ Build my plan</button>
            <div className="flex items-center gap-3">
              <span className="flex gap-[4px]" aria-hidden="true">
                {answered.map((a, i) => (
                  <span key={i} style={{
                    width: 14, height: 14, border: "2px solid var(--ink)",
                    background: a ? "var(--blue)" : "#fff", transition: "background .15s steps(2)",
                  }} />
                ))}
              </span>
              <span className="crt" style={{ fontSize: 19, color: "var(--dim)" }}>
                {progress === 7 && !apiKey
                  ? "ADD YOUR GEMINI API KEY TO START"
                  : ready
                    ? <span className="flash px-1">READY TO BUILD</span>
                    : `${progress}/7 ANSWERED`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_1.15fr] gap-10 items-center pb-24">
          <div className="card card--ink p-6" style={{ background: "var(--panel)" }}>
            <div className="lbl mb-4">TWO CAREER PATHS · SAME YEARS</div>
            <div className="crt space-y-2" style={{ fontSize: 20 }}>
              <div className="flex items-center gap-3">
                <span style={{ width: 90 }}>GROWTH</span>
                <span className="flex gap-[3px] flex-1">
                  {[2, 3, 5, 7, 9].map((v, i) => (
                    <span key={i} style={{ flex: 1, height: 8 + v * 2.4, alignSelf: "flex-end", background: "var(--blue)", border: "2px solid var(--ink)" }} />
                  ))}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ width: 90, color: "var(--dim)" }}>REPEATED</span>
                <span className="flex gap-[3px] flex-1">
                  {[3, 3, 3, 3, 3].map((v, i) => (
                    <span key={i} style={{ flex: 1, height: 8 + v * 2.4, alignSelf: "flex-end", background: "#fff", border: "2px solid var(--ink)" }} />
                  ))}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="lbl mb-4">WHY IT ASKS YOUR TENURE</div>
            <p className="px" style={{ fontSize: "clamp(12px,2.2vw,15px)", lineHeight: 2 }}>
              FOUR YEARS CAN MEAN FOUR YEARS OF GROWTH — OR ONE YEAR REPEATED FOUR TIMES.
            </p>
            <p className="text-[15px] leading-[1.7] mt-4" style={{ color: "var(--dim)" }}>
              It changes what the roadmap leads with. A long stint in a static role usually
              means the first step isn't learning anything new — it's making the experience
              you already earned visible to the next employer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
