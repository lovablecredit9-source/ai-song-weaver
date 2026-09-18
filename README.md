# AI Song Weaver

Buat sebuah web application modern bernama AI Lagu → Not Angka.

Tujuan aplikasi: Pengguna dapat memasukkan konfigurasi AI Router berupa:

API Base URL

API Key

Model

Setelah konfigurasi disimpan, aplikasi harus menguji koneksi API dan menampilkan status "AI Terhubung" jika berhasil.

Pengguna kemudian dapat mengupload file lagu/audio maksimal 100 MB dan meminta sistem menganalisis lagu untuk menghasilkan:

Lirik lagu

Not angka/melodi

Informasi lagu seperti tempo/BPM, nada dasar/key, durasi, dan tanda birama jika dapat dideteksi

Hasil analisis yang dapat diedit pengguna

Riwayat hasil konversi

1. HALAMAN UTAMA

Buat dashboard dengan desain modern, premium, bersih, dan responsive untuk desktop maupun mobile.

Bagian atas:

Logo/nama aplikasi: AI Lagu → Not Angka

Status koneksi AI

Tombol Konfigurasi AI

Tombol Riwayat

Bagian utama: Card besar untuk upload lagu.

Tampilkan: "Upload Lagu" "Upload file audio maksimal 100 MB untuk dianalisis dan dikonversi menjadi lirik serta not angka."

Drag & drop area:

Klik untuk memilih file

Drag & drop file

Maksimal 100 MB

Tampilkan nama file

Ukuran file

Durasi audio jika tersedia

Tombol hapus file

Format audio yang didukung minimal:

MP3

WAV

M4A

AAC

FLAC

OGG

Jangan menerima file lebih dari 100 MB.

Jika file terlalu besar tampilkan: "Ukuran file terlalu besar. Maksimal 100 MB."

2. KONFIGURASI AI ROUTER

Buat modal/halaman konfigurasi AI.

Field:

API Base URL

API Key

Model

Contoh placeholder: API Base URL: https://example.com/v1

API Key: Masukkan API Key

Model: Masukkan nama model

Tambahkan:

tombol Simpan

tombol Test Koneksi

status koneksi

indikator loading

Setelah pengguna menekan Simpan:

Validasi field

Simpan konfigurasi

Test koneksi

Jika berhasil tampilkan: "Konfigurasi AI berhasil disimpan dan koneksi berhasil."

Setelah berhasil, model yang tersimpan harus otomatis digunakan ketika proses analisis lagu dijalankan.

Jangan meminta pengguna memasukkan konfigurasi ulang setiap kali upload lagu.

API Key harus disimpan dengan aman dan jangan pernah ditampilkan secara penuh di UI setelah disimpan.

Tampilkan hanya seperti: sk-••••••••••••1234

3. PROSES UPLOAD DAN ANALISIS

Setelah pengguna memilih lagu, tampilkan tombol:

"Analisis Lagu"

Ketika tombol ditekan, tampilkan progress step-by-step.

Contoh:

✓ File diterima

✓ Memeriksa format audio

⏳ Menganalisis audio

⏳ Mendeteksi vokal

⏳ Mendeteksi lirik

⏳ Mendeteksi nada dasar

⏳ Menganalisis melodi

⏳ Menghasilkan not angka

⏳ Memvalidasi hasil

✓ Selesai

Gunakan status yang jelas dan jangan membuat pengguna mengira proses selesai jika sebenarnya masih berjalan.

4. PEMILIHAN HASIL KONVERSI

Setelah audio berhasil dianalisis, tampilkan pilihan:

Lirik

Menghasilkan transkripsi lirik dari audio.

Not Angka

Menghasilkan not angka berdasarkan melodi/vokal yang terdeteksi.

Lirik + Not Angka

Menghasilkan keduanya.

Pengguna dapat memilih salah satu atau keduanya sebelum proses final.

5. ANALISIS AUDIO

Jangan meminta AI language model untuk menebak not angka langsung dari file audio.

Buat pipeline:

Audio → preprocessing → ekstraksi fitur audio → deteksi tempo/BPM → deteksi key/nada dasar → deteksi pitch/melodi → pemisahan/analisis vokal jika memungkinkan → transkripsi → normalisasi nada → konversi pitch menjadi not angka → AI melakukan formatting dan koreksi konteks → validasi hasil → tampilkan hasil.

Jika backend/environment tidak memungkinkan melakukan pitch detection secara langsung, buat arsitektur backend yang dapat menggunakan service/library audio analysis yang sesuai.

LLM digunakan terutama untuk:

memahami struktur lagu

menggabungkan hasil transkripsi

menyusun lirik

menyusun not angka

memberi nama bagian lagu

memperbaiki formatting

melakukan pengecekan konsistensi

Jangan membuat AI mengarang not angka yang tidak berasal dari hasil analisis audio.

6. NOT ANGKA

Hasil not angka harus menggunakan notasi angka Indonesia.

Contoh:

1 2 3 4 | 5 5 4 3 | 2 3 4 5 | 6 - 5 4 |

Gunakan: 1 = Do 2 = Re 3 = Mi 4 = Fa 5 = Sol 6 = La 7 = Si 1' = Do tinggi

Gunakan tanda:

- untuk nada ditahan

0 untuk istirahat

titik/penanda oktaf yang konsisten

garis | untuk pemisah birama

Sertakan informasi:

Nada dasar

BPM

Birama

Range nada

Tingkat keyakinan hasil jika tersedia

7. SINKRONISASI LIRIK DAN NOT ANGKA

Jika memungkinkan, hasil harus ditampilkan secara sinkron.

Contoh:

Lirik: Ku lihat awan di langit

Not angka: 1 2 3 3 | 4 3 2 1

Setiap bagian not angka harus berusaha mengikuti suku kata/melodi yang sesuai.

Jika terdapat melisma atau satu suku kata memiliki beberapa nada, tampilkan secara jelas.

Contoh:

Ku li-hat a-wan 1 2-3 4 3 2

Jangan memaksakan sinkronisasi jika data audio tidak cukup jelas. Tandai bagian yang memiliki tingkat keyakinan rendah.

8. STRUKTUR LAGU

Jika dapat dideteksi, kelompokkan hasil berdasarkan:

Intro

Verse

Pre-Chorus

Chorus

Bridge

Outro

Contoh:

Verse 1

Lirik: ...

Not Angka: ...

Chorus

Lirik: ...

Not Angka: ...

Jika struktur tidak dapat diketahui, gunakan:

Bagian 1

Bagian 2

Bagian 3

9. HASIL ANALISIS

Setelah selesai, tampilkan halaman hasil.

Header: Hasil Analisis Lagu

Informasi:

Nama file

Durasi

BPM

Key

Birama

Status analisis

Tab:

Lirik Not Angka Lirik + Not Angka Detail Analisis

Tambahkan tombol:

Salin

Download TXT

Download PDF

Edit

Simpan

Analisis ulang

10. EDITOR HASIL

Pengguna harus dapat mengedit:

Lirik

Not angka

Key

BPM

Birama

Struktur lagu

Sediakan editor yang nyaman.

Setelah diedit: Simpan Perubahan

Jangan menghapus hasil asli. Simpan versi hasil AI dan versi hasil edit pengguna jika memungkinkan.

11. VALIDASI NOT ANGKA

Sebelum hasil ditampilkan sebagai selesai, lakukan validasi.

Periksa:

Not berada pada format yang valid

Birama konsisten

Key sesuai dengan hasil deteksi

Nada tidak keluar dari range yang terdeteksi secara ekstrem

Jumlah ketukan per birama masuk akal

Sinkronisasi lirik dan nada tidak rusak

Jika confidence rendah, tampilkan:

"Beberapa bagian lagu kurang jelas sehingga not angka mungkin perlu diperiksa atau diedit secara manual."

Jangan mengatakan hasil 100% akurat.

12. RIWAYAT

Buat halaman Riwayat Analisis.

Simpan:

Nama lagu

Nama file

Tanggal analisis

Durasi

Key

BPM

Status

Hasil lirik

Hasil not angka

Versi edit pengguna

Tampilkan dalam card/table.

Setiap item memiliki:

Buka

Edit

Download

Hapus

Tambahkan pencarian berdasarkan nama lagu.

Tambahkan filter:

Semua

Terbaru

Lama

Selesai

Gagal

13. DATABASE

Gunakan Supabase untuk menyimpan:

projects audio_files analysis_jobs analysis_results lyrics number_notes analysis_history ai_configurations

Relasikan data dengan user/session yang sesuai.

Audio file sebaiknya disimpan di Supabase Storage atau storage backend yang sesuai.

Jangan menyimpan API Key secara plaintext jika dapat dihindari. Gunakan backend/secret storage.

14. ANALYSIS JOB

Gunakan sistem job/asynchronous processing untuk file besar.

Karena file bisa sampai 100 MB, jangan membuat request HTTP biasa menunggu terlalu lama.

Flow:

Upload → create analysis job → status queued → status processing → audio analysis → transcription → pitch detection → AI processing → validation → status completed

Jika gagal:

status failed

Simpan pesan error yang aman dan mudah dipahami pengguna.

UI harus melakukan polling atau realtime subscription untuk melihat perubahan status job.

15. API ROUTE

Buat backend endpoint seperti:

POST /api/ai/test POST /api/audio/upload POST /api/analysis/start GET /api/analysis/:id GET /api/history PUT /api/analysis/:id DELETE /api/analysis/:id

API Base URL dan API Key yang dimasukkan pengguna digunakan oleh backend untuk memanggil AI Router.

Jangan expose API Key ke browser jika arsitektur memungkinkan backend proxy.

Request ke AI Router harus mengikuti API yang kompatibel dengan OpenAI-style API jika endpoint tersebut memang kompatibel.

Model yang digunakan harus berasal dari konfigurasi yang disimpan pengguna.

16. ERROR HANDLING

Buat pesan error bahasa Indonesia yang jelas.

Contoh:

Jika AI belum dikonfigurasi: "Konfigurasi AI belum tersedia. Silakan masukkan API Base URL, API Key, dan Model terlebih dahulu."

Jika koneksi gagal: "Koneksi ke AI gagal. Periksa API Base URL, API Key, dan Model."

Jika file terlalu besar: "File melebihi batas maksimal 100 MB."

Jika format tidak didukung: "Format audio ini belum didukung."

Jika analisis gagal: "Analisis lagu gagal. Silakan coba lagi."

Jika audio terlalu bising: "Audio kurang jelas. Hasil transkripsi dan not angka mungkin memerlukan koreksi manual."

17. KEAMANAN

Implementasikan:

validasi MIME type

validasi extension

batas ukuran 100 MB

sanitasi nama file

authentication/session jika aplikasi menggunakan akun

authorization untuk hasil milik user

rate limiting jika memungkinkan

jangan expose API Key

jangan menyimpan API Key dalam localStorage jika dapat dihindari

gunakan server-side environment/secure storage untuk credential

18. UI/UX

Gunakan desain premium modern.

Tema:

Dark mode

Light mode

Gunakan card dengan rounded corner, shadow ringan, animasi loading yang halus.

Status proses menggunakan:

pending

processing

completed

failed

Buat responsive untuk:

Android

iPhone

tablet

desktop

Pada mobile, upload dan hasil harus tetap mudah digunakan.

19. HASIL YANG HARUS DIUTAMAKAN

Prioritas utama aplikasi:

Akurasi hasil analisis audio

Akurasi pitch/melodi

Not angka berdasarkan melodi yang benar-benar terdeteksi

Lirik berdasarkan audio

Sinkronisasi lirik dengan not angka

Kemudahan mengoreksi hasil

Riwayat hasil

Jangan membuat hasil not angka berdasarkan tebakan/random generation.

Jika sistem tidak yakin terhadap bagian tertentu, tampilkan indikator confidence atau tandai bagian tersebut untuk diperiksa pengguna.

20. OUTPUT AI

Minta AI menghasilkan struktur JSON yang konsisten, misalnya:

{ "song_info": { "title": "", "duration": 0, "bpm": 0, "key": "", "time_signature": "" }, "lyrics": [ { "section": "", "text": "" } ], "number_notation": [ { "section": "", "notation": "", "confidence": 0 } ], "synced_sections": [ { "section": "", "lyrics": "", "notation": "", "confidence": 0 } ], "warnings": [] }

Backend harus memvalidasi JSON tersebut sebelum menyimpannya.

21. PERFORMA

Karena maksimum audio adalah 100 MB:

gunakan multipart/resumable upload jika diperlukan

jangan mengirim seluruh file audio ke LLM secara langsung jika API tidak mendukung audio

lakukan preprocessing/audio feature extraction di backend

pecah proses menjadi beberapa tahap

simpan status setiap tahap

jangan timeout hanya karena analisis membutuhkan waktu lama

22. DASHBOARD

Dashboard menampilkan:

Total Lagu Berhasil Dianalisis Sedang Diproses Riwayat Terakhir

Tambahkan tombol utama: + Upload Lagu

23. FINAL REQUIREMENT

Buat aplikasi benar-benar functional, bukan hanya mockup.

Semua tombol harus memiliki fungsi.

Pastikan:

konfigurasi AI dapat disimpan

koneksi dapat dites

model otomatis digunakan setelah konfigurasi tersimpan

file sampai 100 MB dapat diproses sesuai kemampuan infrastructure

analysis job berjalan asynchronous

lirik dihasilkan

not angka dihasilkan dari data pitch/melodi audio

hasil dapat diedit

hasil dapat disimpan

riwayat dapat dibuka kembali

hasil dapat di-download

error ditampilkan dengan bahasa Indonesia

UI responsive

gunakan Supabase untuk database/storage jika tersedia.

Jika ada bagian yang membutuhkan service/library tambahan untuk audio transcription atau pitch detection, jelaskan dependency tersebut di dalam project dan buat abstraction layer sehingga provider dapat diganti tanpa mengubah UI.

Jangan membuat klaim bahwa hasil not angka selalu 100% akurat. Sistem harus memberikan hasil berdasarkan analisis audio dan menyediakan editor untuk koreksi manual.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6fdf065-a685-4336-8e3f-9377f2b4c223).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
