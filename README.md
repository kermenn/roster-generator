# ⚡ Aplikasi Penataan Roster Modern (CK BMB - Sitarum)

Aplikasi Web modern berbasis Python (FastAPI) dan antarmuka web interaktif untuk mempermudah pembuatan, pengeditan, validasi, dan export jadwal roster operasional tambang/site.

---

## 🚀 Cara Menjalankan Aplikasi

Ada dua cara mudah untuk menjalankan aplikasi:

### Cara 1: Double Click (Paling Praktis)
Cukup klik ganda (double-click) file **`run.bat`** di folder project:
```
d:\Project-Phyton\Roster Generator\run.bat
```
Aplikasi akan otomatis menyalakan server dan membuka browser di `http://127.0.0.1:8000`.

### Cara 2: Lewat Terminal / Command Prompt
```powershell
cd "d:\Project-Phyton\Roster Generator"
python run.py
```
Atau via Uvicorn langsung:
```powershell
uvicorn main:app --host 127.0.0.1 --port 8000
```

---

## 📋 Fitur Utama & Logika Kerja

### 0. 🔐 Mode Akses: Admin vs Guest (Tamu / Anggota Tim)
Aplikasi sekarang mendukung pembagian hak akses:
- **Mode Guest (Default):**
  - Hanya dapat melihat jadwal roster, navigasi bulan, ringkasan jam lembur, dan status standby.
  - Dapat men-download / Export Excel resmi.
  - **TIDAK BISA** mengubah jadwal (klik sel tidak membuka edit popover).
  - Tombol edit seperti *Auto-Generate*, *Tukar Shift*, *Cuti / FB*, dan *Kelola Karyawan* otomatis disembunyikan.
- **Mode Admin (Editor Penuh):**
  - Klik tombol **🔐 Login Admin** di pojok kanan atas.
  - Masukkan PIN Admin (Default bawaan: `admin123`).
  - Seluruh tombol edit, tukar shift, cuti, kelola personil, dan edit sel aktif kembali.
  - **Ubah PIN Admin:** Setelah login Admin, klik tombol **🔑 Ubah PIN** di navbar untuk mengganti PIN lama dengan PIN baru.
  - Untuk kembali ke mode hanya lihat, cukup klik **🚪 Keluar Admin**.

### 1. 🔄 Auto-Generate Sampai Akhir Tahun (Bahkan Multi-Tahun)
- **Pola Reguler (5:2):** 5 hari kerja (D / DN) diikuti 2 hari libur (OFF).
- **Pola Rotasi Malam (15 Hari):** 5 hari siang (`D`/`DN`) ➔ 2 hari `OFF` ➔ 5 hari malam (`N`) ➔ 3 hari `OFF`.
- Sistem menggunakan rumus siklus matematis dengan *anchor date & offset*, sehingga jadwal bulan mendatang (November, Desember 2026, 2027, dst.) **langsung terisi otomatis** tanpa perlu input manual setiap awal bulan.
- Klik tombol **⚡ Auto-Generate** di navbar untuk memproyeksikan jadwal ke seluruh bulan yang diinginkan.

### 2. 🏖️ Atur Hari OFF Teman-Teman (Kecuali Night Shift)
- **Perlindungan Shift Malam (Muhammad Riski):** Pola Rotasi Malam 15 hari tetap **terkunci otomatis** mengikuti siklus roster (5 Siang - 2 OFF - 5 Malam - 3 OFF) sehingga tidak akan terganggu atau salah ubah.
- **Pengaturan Rentang Waktu OFF Teman-Teman:**
  - Klik tombol **🏖️ Atur Hari OFF** di navbar.
  - Pilih personil shift siang tertentu (atau semua teman sekaligus).
  - Tentukan **Tanggal Mulai** dan **Tanggal Selesai** (rentang waktu).
  - Pilih tindakan:
    - **🔴 Jadikan Hari OFF (Libur)**
    - **🟢 Jadikan Hari Kerja D (Standby)**
    - **🔄 Reset (Kembalikan ke Default Siklus)**
  - *(Opsional)* **Filter Hari Tertentu:** Disediakan filter centang hari (Sn, Sl, Rb, Km, Jm, Sb, Mg) jika ingin menerapkan libur berkala (misal: semua Sabtu-Minggu atau Selasa-Rabu dalam rentang tanggal).
  - Terdapat **Rekap Hari OFF Bulan Ini** secara live di dalam menu agar admin dapat memantau persebaran hari libur antar personil.

### 3. ⏱️ Kalkulasi Otomatis Jam Lembur
- **Shift `D` (06.00 – 18.00):** Terhitung **3 Jam Lembur**.
- **Shift `N` (18.00 – 06.00):** Terhitung **3 Jam Lembur**.
- **Shift `DN` (06.00 – 15.00):** Shift Day Normal (0 jam lembur).
- Di sisi kanan tabel, sistem otomatis menghitung:
  - Total `D`, `DN`, `N`, `OFF`, `CT`, `FB`
  - **Total Jam Lembur Personal**
  - **Total Jam Lembur Tim** di kartu metrik atas.

### 3. 🛡️ Live Standby Monitor (Minimal 2 Orang Counterman)
- Baris rekap harian di bagian bawah langsung menghitung jumlah personil Counterman yang Standby (`D`).
- Jika suatu hari personil Standby **< 2 orang**, sel hari tersebut otomatis **berkedip merah dengan peringatan `⚠️ Kurang Personil`**.

### 4. 🔄 Asisten Tukar Shift (Shift Swap)
- Klik tombol **🔄 Tukar Shift**.
- Pilih tanggal dan 2 personil yang ingin bertukar shift.
- Sistem langsung menukar shift mereka secara otomatis dan memvalidasi ketersediaan Standby di hari tersebut.

### 5. 🏖️ Input Cuti & Field Break Sekali Klik
- Klik tombol **🏖️ Cuti / FB**.
- Pilih personil dan rentang tanggal (misal tgl 10 s/d 15).
- Sistem langsung mengubah hari-hari tersebut menjadi `CT` (Cuti) atau `FB` (Field Break) tanpa perlu klik satu per satu.

### 6. 🎨 Mode Edit Grid Interaktif (3 Pilihan Cara Edit):
1. **Klik Sel:** Pop-up melayang (*floating popover*) akan muncul di dekat sel untuk memilih shift dengan 1 klik.
2. **Kuas Cat (*Quick Paint Brush*):** Klik badge shift di toolbar atas (misal klik `OFF`), lalu klik sel mana saja di tabel untuk langsung mewarnainya.
3. **Reset Sampai Sesuai Template Asli:** Tersedia tombol reset jika ingin kembali ke data awal [Contoh Roster.xlsx].

### 7. 📥 Export Excel Resmi (.xlsx)
- Klik tombol **📥 Export Excel**.
- File `.xlsx` yang diunduh memiliki struktur, header, warna, border, dan rumus (`COUNTIF`, `SUM`) yang **persis sama dengan template asli Contoh Roster**.

### 8. 👥 Kelola Karyawan (Tambah & Hapus Personil)
- Klik tombol **👥 Karyawan** di navbar (Mode Admin).
- **Hapus Karyawan:** Klik tombol **🗑️ Hapus** di samping nama karyawan yang ingin dihapus. Sistem akan meminta konfirmasi dan otomatis membersihkan seluruh jadwal terkait dari roster.
- **Tambah Karyawan:** Klik tombol **+ Tambah Personil** untuk membuka formulir input nama, NRP, posisi, dan pola kerja (Reguler 5:2 atau Rotasi Malam 15 Hari).

### 9. 📱 Akses Mobile / HP & Keamanan Jaringan
- **Tampilan Responsif HP:** Desain web telah dioptimalkan secara dinamis untuk layar smartphone dan tablet (navigasi fleksibel, kartu metrik 2x2, serta tabel dengan smooth horizontal touch scroll).
- **Aman Diakses Tim:** Akses dari HP tim secara default berstatus **Guest (Hanya Lihat)**. Anggota tim dapat mengecek jadwal dan mengunduh Excel dari HP tanpa risiko jadwal terhapus atau terubah tanpa PIN Admin.

---

## 📂 Struktur File Project

```
d:\Project-Phyton\Roster Generator\
│
├── run.bat                 # Shortcut Windows untuk langsung menjalankan app
├── run.py                  # Script launcher server + auto-buka browser
├── main.py                 # FastAPI backend & REST endpoints
├── test_app.py             # Unit test otomatis engine & excel export
├── README.md               # Dokumentasi lengkap
│
├── engine/                 # Logika Matematis & Perhitungan Roster
│   ├── models.py           # Definisi shift, jam lembur, warna, dan pola siklus
│   └── roster_engine.py    # Mesin hitung kalender, proyeksi rotasi, validasi
│
├── services/               # Layanan Eksternal & Data
│   ├── storage_service.py  # Penyimpanan JSON persisten (karyawan, override)
│   └── excel_service.py    # Export & Import Excel resmi openpyxl
│
├── data/
│   └── roster_store.json   # Database lokal data roster & karyawan
│
└── static/                 # Frontend Modern (HTML5, Vanilla CSS, JS)
    ├── index.html          # Halaman utama aplikasi
    ├── css/
    │   └── style.css       # Design system modern (dark mode, glassmorphism)
    └── js/
        └── app.js          # Logika interaktif antarmuka, popover, modal
```

---

Dibuat khusus untuk efisiensi penataan roster operasional **CK BMB - Sitarum**.
