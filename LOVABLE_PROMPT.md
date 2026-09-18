# AI Lagu → Not Angka — Spesifikasi Lovable

Buat aplikasi web bernama **AI Lagu → Not Angka**. Aplikasi harus memungkinkan pengguna memasukkan konfigurasi AI Router (Base URL, API Key, Model), menyimpannya dengan aman, menguji koneksi, lalu mengunggah lagu maksimal 100 MB untuk dianalisis menjadi lirik dan not angka Indonesia.

## 1. Konfigurasi AI Router
Sediakan halaman/panel Pengaturan AI:
- AI Router Base URL
- AI Router API Key (masked)
- Model
- Tombol Simpan
- Tombol Test Koneksi
- Status: Belum dikonfigurasi / Terhubung / Gagal
- Setelah konfigurasi valid tersimpan, gunakan otomatis pada proses analisis.
- Jangan pernah mengekspos API key di frontend, log, response API, atau hasil analisis.
- Sediakan kemampuan mengganti konfigurasi.

## 2. Dashboard
Tampilan utama modern, bersih, responsif, bahasa Indonesia.
Menu:
- Dashboard
- Analisis Lagu
- Riwayat
- Pengaturan AI
- Pengaturan

Dashboard menampilkan status AI Router dan analisis terakhir.

## 3. Upload Lagu
- Drag & drop dan tombol pilih file.
- Maksimal ukuran file: **100 MB**.
- Format: MP3, WAV, M4A, AAC, FLAC, OGG.
- Validasi MIME type, ekstensi, dan ukuran.
- Tampilkan nama file, ukuran, durasi jika tersedia, progress upload.
- Gunakan asynchronous/background job agar file 100 MB tidak menyebabkan request timeout.

## 4. Pipeline Analisis
Jangan meminta LLM menebak not angka langsung dari audio.

Gunakan pipeline:
Audio
→ preprocessing
→ ekstraksi fitur audio
→ deteksi BPM/tempo
→ estimasi key/tangga nada
→ deteksi pitch/melodi
→ vocal/source separation jika tersedia
→ transkripsi melodi
→ transkripsi lirik bila memungkinkan
→ normalisasi
→ konversi pitch ke not angka
→ AI Router untuk formatting, konteks, koreksi dan validasi
→ validation
→ hasil.

Tahapan progress:
1. File diterima
2. Memeriksa format
3. Menganalisis audio
4. Mendeteksi vokal
5. Mendeteksi lirik
6. Mendeteksi nada dasar
7. Mendeteksi melodi/pitch
8. Membuat not angka
9. Validasi hasil
10. Selesai

Jika komponen audio/ML tertentu belum tersedia di environment Lovable, buat abstraction/service interface yang jelas sehingga engine dapat diganti atau dihubungkan kemudian. Jangan membuat klaim analisis audio akurat jika engine belum benar-benar tersedia.

## 5. Not Angka Indonesia
Gunakan mapping:
- 1 = Do
- 2 = Re
- 3 = Mi
- 4 = Fa
- 5 = Sol
- 6 = La
- 7 = Si
- 1' = Do tinggi
- 2' = Re tinggi, dst.
- 0 = istirahat
- - = tahan/sustain
- | = batas birama

Not angka harus mengikuti key/tangga nada lagu yang terdeteksi dan menyimpan informasi key serta confidence.

## 6. Sinkronisasi Lirik dan Not
Hasil harus dapat menampilkan:
- Lirik
- Not angka
- Lirik + not angka
- Bagian lagu: Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro bila terdeteksi.
- Sinkronisasi suku kata/kata dengan nada sejauh data memungkinkan.
- Tandai bagian dengan confidence rendah sehingga pengguna dapat memeriksa dan mengeditnya.

## 7. Format Output AI
Gunakan JSON terstruktur, bukan output bebas. Minimal:
{
  "title": "...",
  "artist": "...",
  "duration": 0,
  "bpm": 0,
  "key": "...",
  "time_signature": "...",
  "confidence": 0,
  "sections": [
    {
      "name": "Verse",
      "start": 0,
      "end": 0,
      "lyrics": "...",
      "lines": [
        {
          "text": "...",
          "notes": ["1", "2", "3"],
          "confidence": 0
        }
      ]
    }
  ],
  "warnings": []
}

Validasi schema sebelum menyimpan hasil.

## 8. Halaman Hasil
Tampilkan:
- Judul lagu
- Artist jika terdeteksi
- BPM
- Key
- Time signature
- Confidence
- Lirik
- Not angka
- Lirik + not angka
- Warnings/confidence rendah
- Tombol edit
- Tombol simpan
- Tombol hapus
- Tombol export bila memungkinkan.

Buat editor agar pengguna dapat mengubah lirik, nada, sustain, rest, dan section.

## 9. Riwayat
Simpan histori setiap analisis:
- Nama lagu
- File
- Tanggal
- Status
- Key
- BPM
- Confidence
- Link untuk membuka hasil
- Hapus histori.

## 10. Supabase
Gunakan Supabase untuk database, storage, dan job state bila tersedia.

Buat struktur tabel yang sesuai, minimal:
- projects
- audio_files
- analysis_jobs
- analysis_results
- lyrics
- number_notes
- analysis_history
- ai_configurations

Relasikan data dengan user/project. Gunakan Row Level Security. API key AI Router harus disimpan secara aman/server-side dan tidak dikirim ke client.

## 11. API
Buat endpoint/service yang jelas:
- POST /api/ai/test
- POST /api/audio/upload
- POST /api/analysis/start
- GET /api/analysis/:id
- GET /api/history
- PUT /api/analysis/:id
- DELETE /api/analysis/:id

Polling/status atau realtime dapat digunakan untuk job analisis.

## 12. Keamanan
- Jangan expose API key.
- Validasi upload server-side.
- Batasi ukuran 100 MB.
- Tolak file berbahaya.
- Gunakan signed URL/private storage untuk audio.
- Terapkan RLS.
- Jangan menyimpan secret di source code.
- Tampilkan error yang aman dan mudah dipahami.

## 13. UX
Gunakan bahasa Indonesia untuk seluruh UI.
Desain modern dan premium, responsif desktop/mobile.
Tampilkan loading/progress yang jelas.
Error harus menjelaskan penyebab dan langkah perbaikan.
Jangan membuat UI seolah hasil pasti akurat; tampilkan confidence dan warning.

## 14. Prioritas Akurasi
Akurasi not angka harus berasal dari hasil pitch/melody extraction dan proses musik, bukan tebakan LLM. AI Router dipakai untuk membantu normalisasi, konteks, struktur, koreksi, dan validasi hasil yang sudah berasal dari analisis audio.

Bangun arsitektur modular agar audio-analysis engine dapat diganti tanpa merombak UI/database/API.
