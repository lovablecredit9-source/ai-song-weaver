import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, AlertCircle, Check, ChevronRight, Clock3, FileAudio, History,
  KeyRound, Loader2, Music2, Settings2, ShieldCheck, Sparkles,
  Trash2, Upload, WandSparkles, X, Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getAiConfig, loadRouterModels, saveAiConfig, testOnlineStorage } from "../lib/ai-config.functions";

export const Route = createFileRoute("/")({ component: Index });

type Config = {
  configured: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  storageReady: boolean;
  updatedAt?: string;
};

type Draft = Config & { apiKey: string };
type Song = { id: string; name: string; size: number; duration: number; createdAt: string; status: string };

const EMPTY_CONFIG: Config = {
  configured: false,
  baseUrl: "",
  model: "",
  models: [],
  storageReady: false,
};

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

function readHistory(): Song[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem("songweaver-history") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function Index() {
  const [page, setPage] = useState<"dashboard" | "history" | "settings">("dashboard");
  const [config, setConfig] = useState<Config>(EMPTY_CONFIG);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [history, setHistory] = useState<Song[]>(readHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = ["File diterima", "Memeriksa format audio", "Menganalisis audio", "Mendeteksi vokal", "Mendeteksi lirik", "Mendeteksi nada dasar", "Menganalisis melodi", "Menghasilkan not angka", "Memvalidasi hasil", "Selesai"];

  useEffect(() => {
    let alive = true;
    getAiConfig()
      .then((saved) => { if (alive) setConfig(saved); })
      .catch((error) => console.error(error));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("songweaver-history", JSON.stringify(history));
  }, [history]);

  function chooseFile(f?: File) {
    if (!f) return;
    if (f.size > MAX) { toast.error("Ukuran file terlalu besar. Maksimal 100 MB."); return; }
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav", "m4a", "aac", "flac", "ogg"].includes(ext || "")) {
      toast.error("Format audio ini belum didukung.");
      return;
    }
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
    setResult(null);
    setAnalyzing(true);
    setStep(0);
    setProgress(0);
    try {
      const analysis = await analyzeAudio(file, (index) => {
        setStep(index);
        setProgress(Math.round((index / (steps.length - 1)) * 100));
      });

      setStep(7);
      setProgress(80);
      const refined = await refineNotation({
        data: {
          fileName: file.name,
          duration: analysis.duration,
          bpm: analysis.bpm,
          key: analysis.key,
          timeSignature: analysis.timeSignature,
          rangeLow: analysis.rangeLow,
          rangeHigh: analysis.rangeHigh,
          confidence: analysis.confidence,
          sections: analysis.sections.slice(0, 24).map((s) => ({
            section: s.section,
            notation: s.notation,
            confidence: s.confidence,
          })),
        },
      });

      setStep(8);
      setProgress(95);
      const finalResult: AnalysisResult = {
        fileName: file.name,
        duration: analysis.duration,
        bpm: analysis.bpm,
        key: analysis.key,
        timeSignature: analysis.timeSignature,
        rangeLow: analysis.rangeLow,
        rangeHigh: analysis.rangeHigh,
        confidence: analysis.confidence,
        sections: refined.number_notation,
        warnings: [...analysis.warnings, ...refined.warnings],
        aiUsed: refined.aiUsed,
      };
      setResult(finalResult);

      const song: Song = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        duration: analysis.duration,
        createdAt: new Date().toISOString(),
        status: finalResult.sections.length ? "Selesai" : "Gagal",
      };
      setHistory((items) => [song, ...items].slice(0, 50));
      setStep(steps.length - 1);
      setProgress(100);
      if (finalResult.sections.length) toast.success("Not angka berhasil dibuat.");
      else toast.error("Analisis gagal: melodi tidak terdeteksi pada audio ini.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Analisis lagu gagal.");
    } finally {
      setAnalyzing(false);
    }
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
          <div className={config.configured ? "connection connected" : "connection"}><span className="dot"/><div><b>{config.configured ? "AI Terhubung" : "AI Belum Terhubung"}</b><small>{config.model || "Belum ada model"}</small></div></div>
          <div className="safe"><ShieldCheck size={16}/> {config.storageReady ? "Konfigurasi tersimpan online" : "Menyiapkan penyimpanan online"}</div>
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
            <div className="stats">
              <div className="stat"><span><Activity size={17}/></span><div><small>Status AI</small><b>{config.configured ? "Terhubung" : "Belum diatur"}</b></div></div>
              <div className="stat"><span><FileAudio size={17}/></span><div><small>Total analisis</small><b>{history.length}</b></div></div>
              <div className="stat"><span><Clock3 size={17}/></span><div><small>Batas audio</small><b>100 MB</b></div></div>
            </div>
            <div className="section-head"><div><h3>Upload lagu</h3><p>MP3, WAV, M4A, AAC, FLAC, OGG · maksimal 100 MB</p></div></div>
            <div className={drag ? "dropzone drag" : "dropzone"} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files[0]); }}>
              <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(e) => chooseFile(e.target.files?.[0])}/>
              <div className="upload-icon"><Upload size={25}/></div>
              <h3>{file ? file.name : "Tarik & lepas lagu di sini"}</h3>
              <p>{file ? `${formatBytes(file.size)} · siap dianalisis` : "atau pilih file dari perangkat Anda"}</p>
              {!file && <button className="primary" onClick={() => inputRef.current?.click()}><Upload size={17}/> Pilih Lagu</button>}
              {file && <div className="file-actions"><button className="ghost" onClick={() => setFile(null)}><X size={16}/> Ganti</button><button className="primary" disabled={analyzing} onClick={analyze}>{analyzing ? <><Loader2 className="spin" size={17}/> Menganalisis...</> : <><Zap size={17}/> Analisis Lagu</>}</button></div>}
            </div>
            {analyzing && <div className="progress-card"><div className="progress-top"><div><b>{steps[step]}</b><span>Proses analisis sedang berjalan</span></div><strong>{progress}%</strong></div><div className="progress"><i style={{width: `${progress}%`}}/></div><div className="steps">{steps.slice(0, 7).map((s, i) => <span className={i < step ? "done" : i === step ? "current" : ""} key={s}>{i < step ? <Check size={12}/> : i + 1} {s}</span>)}</div></div>}
            <div className="section-head recent-head"><div><h3>Analisis terbaru</h3><p>Hasil yang baru saja diproses</p></div><button className="text-button" onClick={() => setPage("history")}>Lihat semua <ChevronRight size={15}/></button></div>
            {recent.length === 0 ? <div className="empty-small"><Music2 size={22}/><span>Belum ada analisis. Upload lagu pertama Anda.</span></div> : <div className="recent-list">{recent.map((s) => <div className="song-row" key={s.id}><div className="song-icon"><Music2 size={19}/></div><div className="song-name"><b>{s.name}</b><span>{new Date(s.createdAt).toLocaleString("id-ID")} · {formatBytes(s.size)}</span></div><span className="success-badge"><Check size={13}/> {s.status}</span><button className="icon-btn" onClick={() => setHistory((items) => items.filter((x) => x.id !== s.id))}><Trash2 size={16}/></button></div>)}</div>}
          </section>
        )}

        {page === "history" && <HistoryPage history={history} setHistory={setHistory}/>}
        {page === "settings" && <SettingsPage config={config} onSave={setConfig}/>}
        <footer>AI Song Weaver <span>•</span> Analisis audio dengan confidence & koreksi manual</footer>
      </main>

      {showConfig && <ConfigModal config={config} onClose={() => setShowConfig(false)} onSaved={(next) => { setConfig(next); setShowConfig(false); }}/>}
    </div>
  );
}

function HistoryPage({ history, setHistory }: { history: Song[]; setHistory: React.Dispatch<React.SetStateAction<Song[]>> }) {
  const [q, setQ] = useState("");
  const items = history.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  return <section className="content page-content"><div className="page-card"><div className="toolbar"><div><h2>Riwayat Analisis</h2><p>Riwayat sementara tersimpan di perangkat ini.</p></div><input className="search" placeholder="Cari nama lagu..." value={q} onChange={(e) => setQ(e.target.value)}/></div>{items.length === 0 ? <div className="empty"><History size={34}/><h3>Belum ada riwayat</h3><p>Hasil analisis akan muncul di sini.</p></div> : <div className="history-table">{items.map((s) => <div className="history-item" key={s.id}><div className="song-icon"><Music2 size={19}/></div><div className="song-name"><b>{s.name}</b><span>{new Date(s.createdAt).toLocaleString("id-ID")} · {formatBytes(s.size)} · {formatDuration(s.duration)}</span></div><span className="success-badge"><Check size={13}/> {s.status}</span><button className="icon-btn" onClick={() => setHistory((items) => items.filter((x) => x.id !== s.id))}><Trash2 size={16}/></button></div>)}</div>}</div></section>;
}

function SettingsPage({ config, onSave }: { config: Config; onSave: (next: Config) => void }) {
  const [draft, setDraft] = useState<Draft>({ ...config, apiKey: "" });
  const [loading, setLoading] = useState(false);
  const [testingStorage, setTestingStorage] = useState(false);

  useEffect(() => setDraft((current) => ({ ...current, ...config })), [config]);

  async function loadModels() {
    if (!draft.baseUrl || !draft.apiKey) {
      toast.error(draft.baseUrl ? "Masukkan API Key untuk mengambil model." : "Isi Base URL dan API Key dulu.");
      return;
    }
    setLoading(true);
    try {
      const result = await loadRouterModels({ data: { baseUrl: draft.baseUrl, apiKey: draft.apiKey } });
      setDraft((current) => ({ ...current, models: result.models, model: result.models.includes(current.model) ? current.model : (result.models[0] ?? "") }));
      toast.success(`${result.models.length} model tersedia.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Model gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  async function checkStorage() {
    setTestingStorage(true);
    const result = await testOnlineStorage();
    setTestingStorage(false);
    if (result.ok) toast.success("Supabase aktif. Konfigurasi akan tersimpan online.");
    else toast.error(result.message);
  }

  async function save() {
    if (!draft.baseUrl) { toast.error("Base URL wajib diisi."); return; }
    setLoading(true);
    try {
      const result = await saveAiConfig({ data: { baseUrl: draft.baseUrl, apiKey: draft.apiKey || undefined, model: draft.model || undefined } });
      onSave(result);
      toast.success("Konfigurasi tersimpan online. Bisa dipakai dari HP/perangkat lain.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konfigurasi gagal disimpan.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="content page-content"><div className="settings-card"><div className="settings-icon"><Settings2/></div><h2>AI Router</h2><p>Supabase sudah dipasang di server. Anda tidak perlu memasukkan Project URL atau Anon Key di web.</p>
    <div className="notice"><ShieldCheck size={18}/><span><b>Penyimpanan online:</b> konfigurasi router disimpan di Supabase server. API Key tidak dikirim kembali ke browser saat perangkat lain membukanya.</span></div>
    <label>API Base URL<input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value, models: [], model: "" })} placeholder="https://example.com/v1"/></label>
    <label>API Key<input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={config.configured ? "API Key sudah tersimpan — kosongkan jika tidak diganti" : "Masukkan API Key"}/></label>
    <div className="model-line"><label>Model tersedia<select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} disabled={!draft.models.length}><option value="">{draft.models.length ? "Pilih model" : "Klik Muat Model"}</option>{draft.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></label><button className="ghost model-btn" onClick={loadModels} disabled={loading}>{loading ? <Loader2 className="spin" size={15}/> : <Activity size={15}/>} Muat Model</button></div>
    <div className={config.storageReady ? "modal-status ok" : "modal-status"}>{config.storageReady ? <><Check size={16}/> Supabase penyimpanan online aktif</> : <><AlertCircle size={16}/> Supabase belum siap</>}</div>
    <div className="settings-actions"><button className="ghost" onClick={checkStorage} disabled={testingStorage}>{testingStorage ? <Loader2 className="spin" size={16}/> : <ShieldCheck size={16}/>} Cek Supabase</button><button className="primary" onClick={save} disabled={loading}><Check size={17}/> Simpan Online</button></div>
  </div></section>;
}

function ConfigModal({ config, onClose, onSaved }: { config: Config; onClose: () => void; onSaved: (next: Config) => void }) {
  const [draft, setDraft] = useState<Draft>({ ...config, apiKey: "" });
  const [loading, setLoading] = useState(false);

  async function loadModels() {
    if (!draft.baseUrl || !draft.apiKey) {
      toast.error(draft.baseUrl ? "Masukkan API Key untuk mengambil model." : "Isi Base URL dan API Key dulu.");
      return;
    }
    setLoading(true);
    try {
      const result = await loadRouterModels({ data: { baseUrl: draft.baseUrl, apiKey: draft.apiKey } });
      setDraft((current) => ({ ...current, models: result.models, model: result.models.includes(current.model) ? current.model : (result.models[0] ?? "") }));
      toast.success(`${result.models.length} model tersedia.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Model gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft.baseUrl) { toast.error("Base URL wajib diisi."); return; }
    setLoading(true);
    try {
      const result = await saveAiConfig({ data: { baseUrl: draft.baseUrl, apiKey: draft.apiKey || undefined, model: draft.model || undefined } });
      onSaved(result);
      toast.success("Tersimpan online dan siap dipakai di perangkat lain.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konfigurasi gagal disimpan.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && onClose()}><div className="modal">
    <div className="modal-head"><div><span className="pill"><KeyRound size={13}/> AI ROUTER</span><h2>Konfigurasi AI</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="notice"><ShieldCheck size={18}/><span>Konfigurasi tersimpan di server Supabase, bukan di HP. Jadi HP lain akan memakai konfigurasi yang sama.</span></div>
    <label>API Base URL<input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value, models: [], model: "" })} placeholder="https://example.com/v1"/></label>
    <label>API Key<input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={config.configured ? "Sudah tersimpan — isi hanya jika mengganti" : "Masukkan API Key"}/></label>
    <div className="model-line"><label>Model tersedia<select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} disabled={!draft.models.length}><option value="">{draft.models.length ? "Pilih model" : "Klik Muat Model"}</option>{draft.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></label><button className="ghost model-btn" onClick={loadModels} disabled={loading}>{loading ? <Loader2 className="spin" size={15}/> : <Activity size={15}/>} Muat Model</button></div>
    <div className={config.storageReady ? "modal-status ok" : "modal-status"}>{config.storageReady ? <><Check size={16}/> Penyimpanan online aktif</> : <><AlertCircle size={16}/> Penyimpanan online belum siap</>}</div>
    <div className="modal-actions"><button className="ghost" onClick={onClose}>Batal</button><button className="primary" onClick={save} disabled={loading}>{loading ? <Loader2 className="spin" size={16}/> : <Check size={16}/>} Simpan Online</button></div>
  </div></div>;
}
