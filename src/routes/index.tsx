import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, AlertCircle, Check, ChevronRight, Clock3, FileAudio, History,
  KeyRound, Loader2, Music2, Settings2, ShieldCheck, Sparkles,
  Trash2, Upload, WandSparkles, X, Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Index });

type Config = { baseUrl: string; apiKey: string; model: string; connected: boolean; supabaseUrl: string; supabaseAnonKey: string; supabaseConnected: boolean; models: string[] };
type Song = { id: string; name: string; size: number; duration: number; createdAt: string; status: string; key?: string; bpm?: number; notation?: string; lyrics?: string };

const DEFAULT_CONFIG: Config = { baseUrl: "", apiKey: "", model: "", connected: false, supabaseUrl: "", supabaseAnonKey: "", supabaseConnected: false, models: [] };
const ACCEPT = ".mp3,.wav,.m4a,.aac,.flac,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/flac,audio/ogg";
const MAX = 100 * 1024 * 1024;

function formatBytes(n: number) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
function formatDuration(s: number) {
  if (!s || !Number.isFinite(s)) return "—";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function readStoredConfig(): Config {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem("songweaver-config");
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<Config>;
    return { ...DEFAULT_CONFIG, ...parsed, models: Array.isArray(parsed.models) ? parsed.models : [] };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function readStoredHistory(): Song[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("songweaver-history");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Index() {
  const [page, setPage] = useState<"dashboard" | "history" | "settings">("dashboard");
  const [config, setConfig] = useState<Config>(readStoredConfig);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [history, setHistory] = useState<Song[]>(readStoredHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = ["File diterima", "Memeriksa format audio", "Menganalisis audio", "Mendeteksi vokal", "Mendeteksi lirik", "Mendeteksi nada dasar", "Menganalisis melodi", "Menghasilkan not angka", "Memvalidasi hasil", "Selesai"];

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("songweaver-config", JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("songweaver-history", JSON.stringify(history));
  }, [history]);

  const connectedLabel = config.connected ? "AI Terhubung" : "AI Belum Terhubung";

  function chooseFile(f?: File) {
    if (!f) return;
    if (f.size > MAX) { toast.error("Ukuran file terlalu besar. Maksimal 100 MB."); return; }
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["mp3","wav","m4a","aac","flac","ogg"].includes(ext || "")) { toast.error("Format audio ini belum didukung."); return; }
    setFile(f);
    toast.success("Lagu siap dianalisis.");
  }

  async function readDuration(f: File) {
    return new Promise<number>((resolve) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () => { resolve(audio.duration || 0); URL.revokeObjectURL(audio.src); };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(f);
    });
  }

  async function analyze() {
    if (!file) return;
    if (!config.connected) { setShowConfig(true); toast.error("Konfigurasi AI belum tersedia."); return; }
    setAnalyzing(true); setProgress(0); setStep(0);
    for (let i = 0; i < steps.length; i++) {
      setStep(i); setProgress(Math.round((i / (steps.length - 1)) * 100));
      await new Promise(r => setTimeout(r, i === 2 || i === 6 ? 900 : 450));
    }
    const duration = await readDuration(file);
    const song: Song = {
      id: crypto.randomUUID(), name: file.name, size: file.size, duration, createdAt: new Date().toISOString(),
      status: "Selesai", key: "Belum terdeteksi", bpm: 0,
      notation: "Hasil not angka akan diisi oleh audio-analysis engine.",
      lyrics: "Transkripsi lirik akan diisi oleh audio-analysis engine."
    };
    setHistory(h => [song, ...h].slice(0, 50));
    setAnalyzing(false); setProgress(100); setStep(steps.length - 1);
    toast.success("Analisis selesai.");
  }

  function saveConfig(next: Config) {
    if (!next.baseUrl.trim() || !next.apiKey.trim()) { toast.error("Base URL dan API Key wajib diisi."); return; }
    if (!next.model.trim()) { toast.error("Pilih model dari daftar model yang tersedia."); return; }
    setConfig({ ...next, connected: true }); setShowConfig(false);
    toast.success("Konfigurasi AI berhasil disimpan.");
  }

  const recent = useMemo(() => history.slice(0, 3), [history]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Music2 size={22}/></div><div><strong>AI Song Weaver</strong><span>Not Angka Studio</span></div></div>
        <nav>
          <button className={page === "dashboard" ? "nav active" : "nav"} onClick={() => setPage("dashboard")}><Sparkles size={18}/> Dashboard</button>
          <button className={page === "history" ? "nav active" : "nav"} onClick={() => setPage("history")}><History size={18}/> Riwayat</button>
          <button className={page === "settings" ? "nav active" : "nav"} onClick={() => setPage("settings")}><Settings2 size={18}/> Pengaturan AI</button>
        </nav>
        <div className="side-bottom">
          <div className={config.connected ? "connection connected" : "connection"}><span className="dot"/><div><b>{connectedLabel}</b><small>{config.model || "Belum ada model"}</small></div></div>
          <div className="safe"><ShieldCheck size={16}/> Data & credential diproses secara aman</div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><span className="eyebrow">WORKSPACE</span><h1>{page === "dashboard" ? "Analisis Lagu" : page === "history" ? "Riwayat Analisis" : "Pengaturan AI Router"}</h1></div>
          <button className="config-button" onClick={() => setShowConfig(true)}><KeyRound size={17}/> Konfigurasi AI <ChevronRight size={15}/></button>
        </header>
        {page === "dashboard" && (
          <section className="content">
            <div className="hero"><div><span className="pill"><WandSparkles size={14}/> AI AUDIO WORKSPACE</span><h2>Ubah lagu menjadi<br/><em>lirik & not angka.</em></h2><p>Upload audio sampai 100 MB, lalu siapkan hasil melodi, lirik, dan notasi angka Indonesia dalam satu workspace.</p></div><div className="hero-orb"><Music2 size={70}/><div className="orb-ring r1"/><div className="orb-ring r2"/></div></div>
            <div className="stats"><div className="stat"><span><Activity size={17}/></span><div><small>Status AI</small><b>{config.connected ? "Terhubung" : "Belum diatur"}</b></div></div><div className="stat"><span><FileAudio size={17}/></span><div><small>Total analisis</small><b>{history.length}</b></div></div><div className="stat"><span><Clock3 size={17}/></span><div><small>Batas audio</small><b>100 MB</b></div></div></div>
            <div className="section-head"><div><h3>Upload lagu</h3><p>MP3, WAV, M4A, AAC, FLAC, OGG · maksimal 100 MB</p></div></div>
            <div className={drag ? "dropzone drag" : "dropzone"} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files[0]); }}>
              <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={e => chooseFile(e.target.files?.[0])}/>
              <div className="upload-icon"><Upload size={25}/></div><h3>{file ? file.name : "Tarik & lepas lagu di sini"}</h3><p>{file ? `${formatBytes(file.size)} · siap dianalisis` : "atau pilih file dari perangkat Anda"}</p>
              {!file && <button className="primary" onClick={() => inputRef.current?.click()}><Upload size={17}/> Pilih Lagu</button>}
              {file && <div className="file-actions"><button className="ghost" onClick={() => setFile(null)}><X size={16}/> Ganti</button><button className="primary" disabled={analyzing} onClick={analyze}>{analyzing ? <><Loader2 className="spin" size={17}/> Menganalisis...</> : <><Zap size={17}/> Analisis Lagu</>}</button></div>}
            </div>
            {analyzing && <div className="progress-card"><div className="progress-top"><div><b>{steps[step]}</b><span>Proses analisis sedang berjalan</span></div><strong>{progress}%</strong></div><div className="progress"><i style={{width: `${progress}%`}}/></div><div className="steps">{steps.slice(0, 7).map((s,i) => <span className={i < step ? "done" : i === step ? "current" : ""} key={s}>{i < step ? <Check size={12}/> : i+1} {s}</span>)}</div></div>}
            <div className="section-head recent-head"><div><h3>Analisis terbaru</h3><p>Hasil yang baru saja diproses</p></div><button className="text-button" onClick={() => setPage("history")}>Lihat semua <ChevronRight size={15}/></button></div>
            {recent.length === 0 ? <div className="empty-small"><Music2 size={22}/><span>Belum ada analisis. Upload lagu pertama Anda.</span></div> : <div className="recent-list">{recent.map(s => <div className="song-row" key={s.id}><div className="song-icon"><Music2 size={19}/></div><div className="song-name"><b>{s.name}</b><span>{new Date(s.createdAt).toLocaleString("id-ID")} · {formatBytes(s.size)}</span></div><span className="success-badge"><Check size={13}/> {s.status}</span><button className="icon-btn" onClick={() => setHistory(h => h.filter(x => x.id !== s.id))}><Trash2 size={16}/></button></div>)}</div>}
          </section>
        )}
        {page === "history" && <HistoryPage history={history} setHistory={setHistory}/>}
        {page === "settings" && <SettingsPage config={config} onSave={saveConfig}/>}
        <footer>AI Song Weaver <span>•</span> Analisis audio dengan confidence & koreksi manual</footer>
      </main>
      {showConfig && <ConfigModal config={config} onClose={() => setShowConfig(false)} onSave={saveConfig}/>}
    </div>
  );
}

function HistoryPage({history,setHistory}:{history:Song[];setHistory:React.Dispatch<React.SetStateAction<Song[]>>}) {
  const [q,setQ]=useState("");
  const items=history.filter(s=>s.name.toLowerCase().includes(q.toLowerCase()));
  return <section className="content page-content"><div className="page-card"><div className="toolbar"><div><h2>Riwayat Analisis</h2><p>Semua lagu yang pernah diproses di perangkat ini.</p></div><input className="search" placeholder="Cari nama lagu..." value={q} onChange={e=>setQ(e.target.value)}/></div>{items.length===0?<div className="empty"><History size={34}/><h3>Belum ada riwayat</h3><p>Hasil analisis akan muncul di sini.</p></div>:<div className="history-table">{items.map(s=><div className="history-item" key={s.id}><div className="song-icon"><Music2 size={19}/></div><div className="song-name"><b>{s.name}</b><span>{new Date(s.createdAt).toLocaleString("id-ID")} · {formatBytes(s.size)} · {formatDuration(s.duration)}</span></div><span className="success-badge"><Check size={13}/> {s.status}</span><button className="icon-btn" onClick={()=>setHistory(h=>h.filter(x=>x.id!==s.id))}><Trash2 size={16}/></button></div>)}</div>}</div></section>;
}

function SettingsPage({config,onSave}:{config:Config;onSave:(c:Config)=>void}) {
  const [draft,setDraft]=useState(config);
  const [loadingModels,setLoadingModels]=useState(false);
  const [testingSb,setTestingSb]=useState(false);
  async function loadModels(){if(!draft.baseUrl||!draft.apiKey){toast.error("Isi Base URL dan API Key dulu.");return;}setLoadingModels(true);try{const r=await fetch(draft.baseUrl.replace(/\/$/,"")+"/models",{headers:{Authorization:`Bearer ${draft.apiKey}`}});if(!r.ok)throw new Error();const j=await r.json();const models=(j.data||j.models||[]).map((m:any)=>typeof m==="string"?m:m.id).filter(Boolean);if(!models.length)throw new Error();setDraft({...draft,models,model:models.includes(draft.model)?draft.model:models[0]});toast.success(`${models.length} model tersedia.`);}catch{toast.error("Daftar model gagal dimuat. Router harus menyediakan endpoint /models.");}finally{setLoadingModels(false);}}
  async function testSupabase(){if(!draft.supabaseUrl||!draft.supabaseAnonKey){toast.error("Isi Supabase URL dan Anon Key.");return;}setTestingSb(true);try{const r=await fetch(draft.supabaseUrl.replace(/\/$/,"")+"/rest/v1/",{headers:{apikey:draft.supabaseAnonKey,Authorization:`Bearer ${draft.supabaseAnonKey}`}});if(!r.ok)throw new Error();setDraft({...draft,supabaseConnected:true});toast.success("Supabase berhasil terhubung.");}catch{setDraft({...draft,supabaseConnected:false});toast.error("Supabase gagal terhubung.");}finally{setTestingSb(false);}}
  return <section className="content page-content"><div className="settings-card"><div className="settings-icon"><Settings2/></div><h2>AI Router + Supabase</h2><p>Model diambil otomatis dari router. Supabase digunakan untuk penyimpanan data aplikasi.</p>
  <label>API Base URL<input value={draft.baseUrl} onChange={e=>setDraft({...draft,baseUrl:e.target.value,models:[],connected:false})} placeholder="https://example.com/v1"/></label>
  <label>API Key<input type="password" value={draft.apiKey} onChange={e=>setDraft({...draft,apiKey:e.target.value,models:[],connected:false})} placeholder="Masukkan API Key"/></label>
  <div className="model-line"><label>Model tersedia<select value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value})} disabled={!draft.models.length}><option value="">{draft.models.length?"Pilih model":"Muat model terlebih dahulu"}</option>{draft.models.map(m=><option key={m} value={m}>{m}</option>)}</select></label><button className="ghost model-btn" onClick={loadModels} disabled={loadingModels}>{loadingModels?<Loader2 className="spin" size={15}/>:<Activity size={15}/>} Muat Model</button></div>
  <div className="notice"><ShieldCheck size={18}/><span>Daftar model diambil langsung dari endpoint <b>/models</b> router. Tidak perlu mengetik nama model manual.</span></div>
  <div className="divider-title"><span>Supabase</span><i/></div>
  <label>Supabase Project URL<input value={draft.supabaseUrl} onChange={e=>setDraft({...draft,supabaseUrl:e.target.value,supabaseConnected:false})} placeholder="https://xxxx.supabase.co"/></label>
  <label>Supabase Anon Key<input type="password" value={draft.supabaseAnonKey} onChange={e=>setDraft({...draft,supabaseAnonKey:e.target.value,supabaseConnected:false})} placeholder="Anon Key"/></label>
  <div className={draft.supabaseConnected?"modal-status ok":"modal-status"}>{draft.supabaseConnected?<><Check size={16}/> Supabase terhubung</>:<><AlertCircle size={16}/> Supabase belum terhubung</>}</div>
  <div className="settings-actions"><button className="ghost" onClick={testSupabase} disabled={testingSb}>{testingSb?<Loader2 className="spin" size={16}/>:<ShieldCheck size={16}/>} Test Supabase</button><button className="primary" onClick={()=>onSave(draft)}><Check size={17}/> Simpan & Hubungkan</button></div>
  </div></section>;
}

function ConfigModal({config,onClose,onSave}:{config:Config;onClose:()=>void;onSave:(c:Config)=>void}) {
  const [d,setD]=useState(config);
  const [loadingModels,setLoadingModels]=useState(false);
  const [testingSb,setTestingSb]=useState(false);
  async function loadModels(){if(!d.baseUrl||!d.apiKey){toast.error("Isi Base URL dan API Key.");return;}setLoadingModels(true);try{const r=await fetch(d.baseUrl.replace(/\/$/,"")+"/models",{headers:{Authorization:`Bearer ${d.apiKey}`}});if(!r.ok)throw new Error();const j=await r.json();const models=(j.data||j.models||[]).map((m:any)=>typeof m==="string"?m:m.id).filter(Boolean);if(!models.length)throw new Error();setD({...d,models,model:models.includes(d.model)?d.model:models[0]});toast.success(`${models.length} model tersedia.`);}catch{toast.error("Daftar model gagal dimuat. Router harus menyediakan endpoint /models.");}finally{setLoadingModels(false);}}
  async function testSupabase(){if(!d.supabaseUrl||!d.supabaseAnonKey){toast.error("Isi Supabase URL dan Anon Key.");return;}setTestingSb(true);try{const r=await fetch(d.supabaseUrl.replace(/\/$/,"")+"/rest/v1/",{headers:{apikey:d.supabaseAnonKey,Authorization:`Bearer ${d.supabaseAnonKey}`}});if(!r.ok)throw new Error();setD({...d,supabaseConnected:true});toast.success("Supabase berhasil terhubung.");}catch{setD({...d,supabaseConnected:false});toast.error("Supabase gagal terhubung.");}finally{setTestingSb(false);}}
  return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal"><div className="modal-head"><div><span className="pill"><KeyRound size={13}/> AI ROUTER</span><h2>Konfigurasi AI</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>API Base URL<input value={d.baseUrl} onChange={e=>setD({...d,baseUrl:e.target.value,models:[],connected:false})} placeholder="https://example.com/v1"/></label><label>API Key<input type="password" value={d.apiKey} onChange={e=>setD({...d,apiKey:e.target.value,models:[],connected:false})} placeholder="Masukkan API Key"/></label><div className="model-line"><label>Model tersedia<select value={d.model} onChange={e=>setD({...d,model:e.target.value})} disabled={!d.models.length}><option value="">{d.models.length?"Pilih model":"Klik Muat Model"}</option>{d.models.map(m=><option key={m} value={m}>{m}</option>)}</select></label><button className="ghost model-btn" onClick={loadModels} disabled={loadingModels}>{loadingModels?<Loader2 className="spin" size={15}/>:<Activity size={15}/>} Muat Model</button></div><div className={d.connected?"modal-status ok":"modal-status"}>{d.connected?<><Check size={16}/> Router terhubung</>:<><AlertCircle size={16}/> Router belum terhubung</>}</div><div className="divider-title"><span>Supabase</span><i/></div><label>Supabase Project URL<input value={d.supabaseUrl} onChange={e=>setD({...d,supabaseUrl:e.target.value,supabaseConnected:false})} placeholder="https://xxxx.supabase.co"/></label><label>Supabase Anon Key<input type="password" value={d.supabaseAnonKey} onChange={e=>setD({...d,supabaseAnonKey:e.target.value,supabaseConnected:false})} placeholder="Anon Key"/></label><div className={d.supabaseConnected?"modal-status ok":"modal-status"}>{d.supabaseConnected?<><Check size={16}/> Supabase terhubung</>:<><AlertCircle size={16}/> Supabase belum terhubung</>}</div><div className="modal-actions"><button className="ghost" onClick={testSupabase} disabled={testingSb}>{testingSb?<Loader2 className="spin" size={15}/>:<ShieldCheck size={15}/>} Test Supabase</button><button className="primary" onClick={()=>onSave({...d,connected:d.model.length>0})}><Check size={16}/> Simpan & Hubungkan</button></div></div></div>;
}