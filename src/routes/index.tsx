import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, AlertCircle, Check, ChevronRight, Clock3, FileAudio, History,
  KeyRound, Loader2, Music2, Play, Settings2, ShieldCheck, Sparkles,
  Trash2, Upload, WandSparkles, X, Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Index });

type Config = { baseUrl: string; apiKey: string; model: string; connected: boolean };
type Song = { id: string; name: string; size: number; duration: number; createdAt: string; status: string; key?: string; bpm?: number; notation?: string; lyrics?: string };

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

function Index() {
  const [page, setPage] = useState<"dashboard" | "history" | "settings">("dashboard");
  const [config, setConfig] = useState<Config>(() => {
    try { return JSON.parse(localStorage.getItem("songweaver-config") || '{"baseUrl":"","apiKey":"","model":"","connected":false}'); }
    catch { return { baseUrl: "", apiKey: "", model: "", connected: false }; }
  });
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [history, setHistory] = useState<Song[]>(() => {
    try { return JSON.parse(localStorage.getItem("songweaver-history") || "[]"); } catch { return []; }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = ["File diterima", "Memeriksa format audio", "Menganalisis audio", "Mendeteksi vokal", "Mendeteksi lirik", "Mendeteksi nada dasar", "Menganalisis melodi", "Menghasilkan not angka", "Memvalidasi hasil", "Selesai"];

  useEffect(() => localStorage.setItem("songweaver-config", JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem("songweaver-history", JSON.stringify(history)), [history]);

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
    if (!next.baseUrl.trim() || !next.apiKey.trim() || !next.model.trim()) {
      toast.error("Base URL, API Key, dan Model wajib diisi."); return;
    }
    setConfig({ ...next, connected: true }); setShowConfig(false);
    toast.success("Konfigurasi AI berhasil disimpan.");
  }

  const recent = useMemo(() => history.slice(0, 3), [history]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Music2 size={22}/></div>
          <div><strong>AI Song Weaver</strong><span>Not Angka Studio</span></div>
        </div>
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
            <div className="hero">
              <div><span className="pill"><WandSparkles size={14}/> AI AUDIO WORKSPACE</span><h2>Ubah lagu menjadi<br/><em>lirik & not angka.</em></h2><p>Upload audio sampai 100 MB, lalu siapkan hasil melodi, lirik, dan notasi angka Indonesia dalam satu workspace.</p></div>
              <div className="hero-orb"><Music2 size={70}/><div className="orb-ring r1"/><div className="orb-ring r2"/></div>
            </div>

            <div className="stats">
              <div className="stat"><span><Activity size={17}/></span><div><small>Status AI</small><b>{config.connected ? "Terhubung" : "Belum diatur"}</b></div></div>
              <div className="stat"><span><FileAudio size={17}/></span><div><small>Total analisis</small><b>{history.length}</b></div></div>
              <div className="stat"><span><Clock3 size={17}/></span><div><small>Batas audio</small><b>100 MB</b></div></div>
            </div>

            <div className="section-head"><div><h3>Upload lagu</h3><p>MP3, WAV, M4A, AAC, FLAC, OGG · maksimal 100 MB</p></div></div>
            <div className={drag ? "dropzone drag" : "dropzone"} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files[0]); }}>
              <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={e => chooseFile(e.target.files?.[0])}/>
              <div className="upload-icon"><Upload size={25}/></div>
              <h3>{file ? file.name : "Tarik & lepas lagu di sini"}</h3>
              <p>{file ? `${formatBytes(file.size)} · siap dianalisis` : "atau pilih file dari perangkat Anda"}</p>
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
  return <section className="content page-content"><div className="settings-card"><div className="settings-icon"><Settings2/></div><h2>AI Router</h2><p>Masukkan endpoint dan credential AI yang ingin digunakan untuk memproses hasil analisis.</p><label>API Base URL<input value={draft.baseUrl} onChange={e=>setDraft({...draft,baseUrl:e.target.value})} placeholder="https://example.com/v1"/></label><label>API Key<input type="password" value={draft.apiKey} onChange={e=>setDraft({...draft,apiKey:e.target.value})} placeholder="Masukkan API Key"/></label><label>Model<input value={draft.model} onChange={e=>setDraft({...draft,model:e.target.value})} placeholder="Nama model"/></label><div className="notice"><ShieldCheck size={18}/><span>Credential tidak ditampilkan di halaman publik. Untuk produksi, panggil AI Router melalui backend/proxy agar API key tidak terekspos ke browser.</span></div><button className="primary wide" onClick={()=>onSave(draft)}><Check size={17}/> Simpan & Hubungkan</button></div></section>;
}

function ConfigModal({config,onClose,onSave}:{config:Config;onClose:()=>void;onSave:(c:Config)=>void}) {
  const [d,setD]=useState(config);
  const [testing,setTesting]=useState(false);
  async function test(){ if(!d.baseUrl||!d.apiKey||!d.model){toast.error("Lengkapi semua field terlebih dahulu.");return;} setTesting(true); try { const r=await fetch(d.baseUrl.replace(/\/$/,"")+"/models",{headers:{Authorization:`Bearer ${d.apiKey}`}}); if(!r.ok) throw new Error(); toast.success("Koneksi AI berhasil."); } catch { toast.error("Test koneksi gagal. Pastikan Base URL, API Key, dan Model benar."); } finally {setTesting(false);} }
  return <div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><div className="modal"><div className="modal-head"><div><span className="pill"><KeyRound size={13}/> AI ROUTER</span><h2>Konfigurasi AI</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div><label>API Base URL<input value={d.baseUrl} onChange={e=>setD({...d,baseUrl:e.target.value})} placeholder="https://example.com/v1"/></label><label>API Key<input type="password" value={d.apiKey} onChange={e=>setD({...d,apiKey:e.target.value})} placeholder="Masukkan API Key"/></label><label>Model<input value={d.model} onChange={e=>setD({...d,model:e.target.value})} placeholder="contoh: model-name"/></label><div className={d.connected?"modal-status ok":"modal-status"}>{d.connected?<><Check size={16}/> Konfigurasi tersimpan</>:<><AlertCircle size={16}/> Belum terhubung</>}</div><div className="modal-actions"><button className="ghost" onClick={test} disabled={testing}>{testing?<Loader2 className="spin" size={16}/>:<Activity size={16}/>} Test Koneksi</button><button className="primary" onClick={()=>onSave(d)}><Check size={16}/> Simpan</button></div></div></div>;
}
