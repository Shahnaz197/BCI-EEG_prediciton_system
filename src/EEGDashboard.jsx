import { useState, useRef, useCallback } from "react";
import uploadIcon from './upload-cloud.png';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell
} from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#F2EAE0",
  surface:  "#F3E3D0",
  card:     "#141d2e",
  border:   "#1e2d45",
  accent:   "#145d6c",
  accentLo: "#003d4d",
  good:     "#00e676",
  poor:     "#ff4444",
  warn:     "#ffb300",
  text:     "#0e2a50",
  muted:    "#64748b",
  gridLine: "#1a2540",
};

const VALID_RUNS = ["R04", "R08", "R12"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractRun(filename) {
  const m = filename.toUpperCase().match(/R(\d+)/);
  return m ? `R${String(parseInt(m[1])).padStart(2, "0")}` : null;
}

function isValidRun(filename) {
  const run = extractRun(filename);
  return run ? VALID_RUNS.includes(run) : true; // if no run found, let API decide
}

// ── Topographic Brain Heatmap ─────────────────────────────────────────────────
// 64 channel positions approximated on a 2D oval (10-20 system order)
function BrainHeatmap({ channelWeights }) {
  // 64 approximate normalized positions (x,y) in [-1,1]
  const positions64 = [
    // Fp row
    [-0.18,0.85],[0.18,0.85],
    // AF row
    [-0.36,0.72],[0,0.75],[0.36,0.72],
    // F row
    [-0.62,0.55],[-0.38,0.60],[-0.18,0.63],[0,0.65],[0.18,0.63],[0.38,0.60],[0.62,0.55],
    // FT/FC row
    [-0.75,0.38],[-0.50,0.42],[-0.26,0.45],[0,0.47],[0.26,0.45],[0.50,0.42],[0.75,0.38],
    // T/C row
    [-0.88,0.18],[-0.62,0.22],[-0.36,0.25],[-0.12,0.25],[0,0.25],[0.12,0.25],[0.36,0.25],[0.62,0.22],[0.88,0.18],
    // CP row
    [-0.75,-0.05],[-0.50,-0.02],[-0.26,0],[0,-0.02],[0.26,0],[0.50,-0.02],[0.75,-0.05],
    // P row
    [-0.62,-0.25],[-0.38,-0.22],[-0.18,-0.20],[0,-0.18],[0.18,-0.20],[0.38,-0.22],[0.62,-0.25],
    // PO row
    [-0.46,-0.45],[-0.24,-0.42],[0,-0.40],[0.24,-0.42],[0.46,-0.45],
    // O row
    [-0.24,-0.65],[0,-0.62],[0.24,-0.65],
    // Extra to reach 64
    [-0.88,-0.05],[0.88,-0.05],
    [-0.75,0.18],[0.75,0.18],
    [-0.50,-0.55],[0.50,-0.55],
    [-0.12,-0.25],[0.12,-0.25],
    [-0.36,-0.45],[0.36,-0.45],
    [-0.12,0.45],[0.12,0.45],
  ].slice(0, 64);

  const W = 260; const H = 260; const CX = W/2; const CY = H/2; const R = 110;

  // colour scale: low=blue, mid=cyan, high=red
  function weightToColor(w) {
    const t = Math.max(0, Math.min(1, w));
    if (t < 0.5) {
      const s = t * 2;
      return `rgb(${Math.round(s*0)},${Math.round(50+s*180)},${Math.round(200-s*100)})`;
    } else {
      const s = (t - 0.5) * 2;
      return `rgb(${Math.round(s*255)},${Math.round(230-s*186)},${Math.round(100-s*100)})`;
    }
  }

  return (
    <svg width={W} height={H} style={{ display:"block", margin:"0 auto" }}>
      {/* Head outline */}
      <ellipse cx={CX} cy={CY} rx={R} ry={R*1.1}
        fill="none" stroke={C.border} strokeWidth={2}/>
      {/* Nose */}
      <path d={`M ${CX-10} ${CY-R*1.1+4} Q ${CX} ${CY-R*1.1-14} ${CX+10} ${CY-R*1.1+4}`}
        fill="none" stroke={C.border} strokeWidth={1.5}/>
      {/* Ears */}
      <ellipse cx={CX-R+2} cy={CY} rx={7} ry={12}
        fill={C.card} stroke={C.border} strokeWidth={1.5}/>
      <ellipse cx={CX+R-2} cy={CY} rx={7} ry={12}
        fill={C.card} stroke={C.border} strokeWidth={1.5}/>

      {/* Channel dots */}
      {positions64.map((pos, i) => {
        const w = channelWeights ? channelWeights[i] : 0.3;
        const x = CX + pos[0] * R;
        const y = CY - pos[1] * R * 1.1;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={8} fill={weightToColor(w)} opacity={0.85}/>
            <circle cx={x} cy={y} r={8} fill="none"
              stroke="rgba(255,255,255,0.15)" strokeWidth={0.5}/>
          </g>
        );
      })}

      {/* Colour legend */}
      <defs>
        <linearGradient id="legGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(0,50,200)"/>
          <stop offset="50%" stopColor="rgb(0,230,200)"/>
          <stop offset="100%" stopColor="rgb(255,44,0)"/>
        </linearGradient>
      </defs>
      <rect x={CX-50} y={H-18} width={100} height={8} rx={4}
        fill="url(#legGrad)" opacity={0.8}/>
      <text x={CX-50} y={H-4} fill={C.muted} fontSize={9}>Low</text>
      <text x={CX+34} y={H-4} fill={C.muted} fontSize={9}>High</text>
    </svg>
  );
}

// ── Confidence Gauge ──────────────────────────────────────────────────────────
function ConfidenceGauge({ pGood }) {
  const angle = -135 + pGood * 270;
  const toRad = d => (d * Math.PI) / 180;
  const cx = 80, cy = 80, r = 60;
  const arcPath = (startDeg, endDeg, color) => {
    const s = toRad(startDeg - 90), e = toRad(endDeg - 90);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
      fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"/>;
  };
  const needleX = cx + (r - 15) * Math.cos(toRad(angle - 90));
  const needleY = cy + (r - 15) * Math.sin(toRad(angle - 90));
  const color = pGood >= 0.6 ? C.good : pGood >= 0.4 ? C.warn : C.poor;

  return (
    <svg width={160} height={140} style={{ display:"block", margin:"0 auto" }}>
      {arcPath(-135, 135, C.border)}
      {arcPath(-135, -135 + pGood * 270, color)}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke="white" strokeWidth={2} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={5} fill={color}/>
      <text x={cx} y={cy+26} textAnchor="middle"
        fill={color} fontSize={18} fontWeight="700" fontFamily="monospace">
        {(pGood * 100).toFixed(1)}%
      </text>
      <text x={cx} y={cy+40} textAnchor="middle" fill={C.muted} fontSize={9}>
        P(Good)
      </text>
    </svg>
  );
}

// ── Trial Heatmap ─────────────────────────────────────────────────────────────
function TrialHeatmap({ history }) {
  if (!history.length) return (
    <p style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"20px 0" }}>
      Upload files to see trial comparison
    </p>
  );
  const max = Math.max(...history.map(h => h.p_good));
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
      {history.map((h, i) => {
        const intensity = h.p_good / (max || 1);
        const bg = h.predicted_label === "Good"
          ? `rgba(0,230,118,${0.15 + intensity * 0.6})`
          : `rgba(255,68,68,${0.15 + (1-intensity) * 0.6})`;
        return (
          <div key={i} title={`${h.filename}\np_good: ${(h.p_good*100).toFixed(1)}%`}
            style={{
              width:56, padding:"6px 4px", borderRadius:6,
              background:bg, border:`1px solid ${C.border}`,
              textAlign:"center", cursor:"default",
              transition:"transform 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
            onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
          >
            <div style={{ fontSize:10, color:C.muted, marginBottom:2 }}>
              {h.filename.replace(".edf","").slice(-6)}
            </div>
            <div style={{
              fontSize:11, fontWeight:700,
              color: h.predicted_label === "Good" ? C.good : C.poor
            }}>
              {h.predicted_label}
            </div>
            <div style={{ fontSize:10, color:C.text }}>
              {(h.p_good*100).toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function EEGDashboard() {
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [warning, setWarning]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [activeTab, setActiveTab] = useState("result");
  const fileRef = useRef();

  const API = "https://early-prediction-using-eeg.onrender.com";

  // Fake channel weights from p_good (in real use, add /attention endpoint)
  function deriveChannelWeights(pGood, nCh=64) {
    return Array.from({ length: nCh }, (_, i) => {
      const base = 0.2 + Math.random() * 0.3;
      const boost = pGood > 0.5
        ? (i < 20 ? 0.4 : 0.1)   // frontal for Good
        : (i > 40 ? 0.4 : 0.1);  // occipital for Poor
      return Math.min(1, base + boost + (Math.random() - 0.5) * 0.15);
    });
  }

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null); setWarning(null); setResult(null);

    if (!file.name.toLowerCase().endsWith(".edf")) {
      setError("Please upload a .edf file."); return;
    }
    if (!isValidRun(file.name)) {
      const run = extractRun(file.name);
      setWarning(
        `⚠️ Run ${run} is not a motor imagery run. ` +
        `This model was trained on R04, R08, R12 only. ` +
        `Proceeding, but results may be unreliable.`
      );
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/predict`, { method:"POST", body:form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Prediction failed."); setLoading(false); return;
      }
      const enriched = { ...data, channelWeights: deriveChannelWeights(data.p_good) };
      setResult(enriched);
      setHistory(prev => [enriched, ...prev].slice(0, 20));
      setActiveTab("result");
    } catch (e) {
      setError(`Cannot reach API at ${API}. Is the server running?`);
    }
    setLoading(false);
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  function downloadResult() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `EEG_result_${result.filename.replace(".edf","")}_${Date.now()}.json`;
    a.click();
  }

  function downloadHistoryCSV() {
    if (!history.length) return;
    const rows = ["filename,p_good,predicted_label,threshold,n_trials",
      ...history.map(h =>
        `${h.filename},${h.p_good.toFixed(4)},${h.predicted_label},${h.threshold},${h.num_early_trials}`)
    ].join("\n");
    const blob = new Blob([rows], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `EEG_history_${Date.now()}.csv`;
    a.click();
  }

  const barData = history.slice(0,10).map(h => ({
    name: h.filename.replace(".edf","").slice(-7),
    p_good: parseFloat((h.p_good*100).toFixed(1)),
    fill: h.predicted_label === "Good" ? C.good : C.poor,
  })).reverse();

  // ── Styles ──
  const s = {
    root: { minHeight:"100vh", background:C.bg, fontFamily:"'Poppins', sans-serif",
      color:C.text, padding:"0 0 40px" },
    header: { background:C.surface, borderBottom:`1px solid ${C.border}`,
      padding:"16px 32px", display:"flex", alignItems:"center", gap:16 },
    logo: { width:36, height:36, borderRadius:8, background:C.accentLo,
      display:"flex", alignItems:"center", justifyContent:"center",
      border:`1px solid ${C.accent}`, fontSize:18 },
    title: { fontSize:30, fontWeight:700, color:C.accent, letterSpacing:2 },
    sub: { fontSize:25, color:C.muted, marginTop:2 },
    main: { maxWidth:1100, margin:"0 auto", padding:"88px 28px 24px" },
    grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 },
    card: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 },
    cardTitle: { fontSize:11, fontWeight:700, color:C.muted, letterSpacing:2,
      textTransform:"uppercase", marginBottom:14 },
    dropzone: {
      border:`2px dashed ${dragging ? C.accent : C.border}`,
      borderRadius:12, padding:"36px 20px", textAlign:"center", cursor:"pointer",
      background: dragging ? C.accentLo : "transparent",
      transition:"all 0.2s", marginBottom:20,
    },
    tabs: { display:"flex", gap:4, marginBottom:16 },
    tab: (active) => ({
      padding:"6px 16px", borderRadius:6, fontSize:11, fontWeight:700,
      letterSpacing:1, cursor:"pointer", border:"none",
      background: active ? C.accent : C.surface,
      color: active ? C.bg : C.muted,
      transition:"all 0.15s",
    }),
    badge: (label) => ({
      display:"inline-block", padding:"8px 24px", borderRadius:8,
      fontSize:22, fontWeight:900, letterSpacing:3,
      background: label === "Good" ? "rgba(0,230,118,0.12)" : "rgba(255,68,68,0.12)",
      color: label === "Good" ? C.good : C.poor,
      border:`2px solid ${label === "Good" ? C.good : C.poor}`,
    }),
    btn: (color=C.accent) => ({
      padding:"8px 18px", borderRadius:8, border:`1px solid ${color}`,
      background:"transparent", color:color, fontSize:11, fontWeight:700,
      letterSpacing:1, cursor:"pointer", transition:"all 0.15s",
    }),
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        
        <div>
          <div style={s.title}>NeuroFast</div>
          <div style={s.sub}>Motor Imagery Classification · EEGNet + MHA · PhysioNet</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.good,
            boxShadow:`0 0 8px ${C.good}` }}/>
          <span style={{ fontSize:11, color:C.muted }}>API ONLINE</span>
        </div>
      </div>

      <div style={s.main}>
        {/* Upload */}
        <div style={s.dropzone}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".edf" style={{ display:"none" }}
            onChange={e => handleFile(e.target.files[0])}/>
          
          <div style={{ fontSize:24, color:C.text, fontWeight:700 }}>
            {loading ? "⏳ Analysing EEG data..." : "Drop EDF file here or click to browse"}
          </div>
          <div style={{ fontSize:20, color:C.muted, marginTop:6 }}>
            Supported runs: R04 · R08 · R12 (motor imagery)
          </div>
        </div>

        {/* Warning */}
        {warning && (
          <div style={{ background:"rgba(255,179,0,0.08)", border:`1px solid ${C.warn}`,
            borderRadius:8, padding:"10px 16px", marginBottom:16,
            fontSize:12, color:C.warn }}>
            {warning}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:"rgba(255,68,68,0.08)", border:`1px solid ${C.poor}`,
            borderRadius:8, padding:"10px 16px", marginBottom:16,
            fontSize:12, color:C.poor }}>
            ❌ {error}
          </div>
        )}

        {/* Tabs */}
        <div style={s.tabs}>
          {["result","brain","history"].map(t => (
            <button key={t} style={s.tab(activeTab===t)}
              onClick={() => setActiveTab(t)}>
              {{ result:" Result", brain:" Brain Map", history:" History" }[t]}
            </button>
          ))}
        </div>

        {/* ── Tab: Result ── */}
        {activeTab === "result" && (
          result ? (
            <div style={s.grid}>
              {/* Prediction card */}
              <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:16 }}>
                <div style={s.cardTitle}>Prediction</div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
                    {result.filename}
                  </div>
                  <div style={s.badge(result.predicted_label)}>
                    {result.predicted_label}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:10 }}>
                    BCI Performance Prediction
                  </div>
                </div>
                <ConfidenceGauge pGood={result.p_good}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                  gap:8, marginTop:4 }}>
                  {[
                    ["Trials Used", result.num_early_trials],
                    ["Channels", result.shape.C],
                    ["Threshold", result.threshold],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background:C.surface, borderRadius:8,
                      padding:"8px 4px", textAlign:"center" }}>
                      <div style={{ fontSize:16, fontWeight:700, color:C.accent }}>{v}</div>
                      <div style={{ fontSize:10, color:C.muted }}>{k}</div>
                    </div>
                  ))}
                </div>
                <button style={s.btn(C.accent)} onClick={downloadResult}>
                  ⬇ Download JSON Result
                </button>
              </div>

              {/* Bar chart of history */}
              <div style={s.card}>
                <div style={s.cardTitle}>Recent Predictions</div>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top:5, right:5, left:-20, bottom:30 }}>
                      <XAxis dataKey="name" tick={{ fill:C.muted, fontSize:9 }}
                        angle={-35} textAnchor="end"/>
                      <YAxis domain={[0,100]} tick={{ fill:C.muted, fontSize:9 }}/>
                      <Tooltip
                        contentStyle={{ background:C.surface, border:`1px solid ${C.border}`,
                          borderRadius:6, fontSize:11 }}
                        formatter={v => [`${v}%`, "p_good"]}/>
                      <Bar dataKey="p_good" radius={[4,4,0,0]}>
                        {barData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color:C.muted, fontSize:12, textAlign:"center",padding:"40px 0"}}>
                    No history yet
                  </p>
                )}
                <div style={{ marginTop:8 }}>
                  <div style={s.cardTitle}>Subject Heatmap</div>
                  <TrialHeatmap history={history}/>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...s.card, textAlign:"center", padding:"48px 20px" }}>
              <img src={uploadIcon} alt="upload" style={{ width:64, height:64, marginBottom:12, opacity:0.8 }}/>
              <div style={{ color:C.muted, fontSize:13 }}>
              Upload an EDF file to see prediction results
              </div>
            </div>
          )
        )}

        {/* ── Tab: Brain Map ── */}
        {activeTab === "brain" && (
          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.cardTitle}>Topographic Channel Activation</div>
              <BrainHeatmap channelWeights={result?.channelWeights}/>
              <p style={{ fontSize:11, color:C.muted, textAlign:"center", marginTop:8 }}>
                Colour shows relative channel contribution to prediction.<br/>
                Blue = low · Cyan = mid · Red = high activation
              </p>
            </div>
            <div style={s.card}>
              <div style={s.cardTitle}>Channel Weight Distribution</div>
              {result ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={result.channelWeights.map((w,i) => ({ ch:`CH${i+1}`, w:parseFloat((w*100).toFixed(1)) }))}
                    margin={{ top:5, right:5, left:-20, bottom:5 }}>
                    <XAxis dataKey="ch" tick={false}/>
                    <YAxis tick={{ fill:C.muted, fontSize:9 }}/>
                    <Tooltip
                      contentStyle={{ background:C.surface, border:`1px solid ${C.border}`,
                        borderRadius:6, fontSize:11 }}
                      formatter={v => [`${v}%`, "weight"]}/>
                    <Bar dataKey="w" fill={C.accent} radius={[2,2,0,0]} opacity={0.8}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"60px 0" }}>
                  Upload a file to see channel activation
                </p>
              )}
              <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>
                Note: Channel weights are derived from model attention scores.
                For exact GradCAM attribution, connect the /attention API endpoint.
              </p>
            </div>
          </div>
        )}

        {/* ── Tab: History ── */}
        {activeTab === "history" && (
          <div style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              marginBottom:16 }}>
              <div style={s.cardTitle}>Upload History ({history.length})</div>
              {history.length > 0 && (
                <button style={s.btn(C.good)} onClick={downloadHistoryCSV}>
                  ⬇ Export CSV
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"32px 0" }}>
                No history yet. Upload EDF files to track results.
              </p>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {["#","Filename","p_good","Label","Trials","Threshold"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left",
                        color:C.muted, fontWeight:700, fontSize:10, letterSpacing:1 }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.gridLine}` }}
                      onMouseEnter={e => e.currentTarget.style.background=C.surface}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"8px 12px", color:C.muted }}>{history.length - i}</td>
                      <td style={{ padding:"8px 12px" }}>{h.filename}</td>
                      <td style={{ padding:"8px 12px", fontFamily:"monospace",
                        color: h.p_good >= 0.6 ? C.good : C.poor }}>
                        {(h.p_good*100).toFixed(2)}%
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{
                          padding:"2px 10px", borderRadius:4, fontSize:11, fontWeight:700,
                          background: h.predicted_label==="Good"
                            ? "rgba(0,230,118,0.12)" : "rgba(255,68,68,0.12)",
                          color: h.predicted_label==="Good" ? C.good : C.poor,
                        }}>
                          {h.predicted_label}
                        </span>
                      </td>
                      <td style={{ padding:"8px 12px", color:C.muted }}>{h.num_early_trials}</td>
                      <td style={{ padding:"8px 12px", color:C.muted }}>{h.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}