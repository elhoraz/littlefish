# 🐟 Sistem Informasi Manajemen Pembelajaran Bimbel Littlefish

> **Platform Terpadu Operasional Bimbel Littlefish**  
> Manajemen presensi digital, data siswa & wali murid, modul ajar bulanan, arsip lembar kerja (worksheet), pelacakan penguasaan materi 5-tingkat, visualisasi progres akademik, administrasi SPP, rekapitulasi honor tutor, dan portal monitoring orang tua.

---

## 🚀 Fitur Utama & Role Pengguna

Aplikasi ini dirancang dengan kontrol akses berbasis peran (Role-Based Access Control) yang ketat pada sisi klien dan server:

### 1. 👑 Admin / Owner
- **Dashboard Operasional Eksekutif**: Metrik real-time siswa aktif, kelas, tutor, kehadiran harian, penagihan SPP, estimasi omset & beban honor tutor, serta grafik distribusi Recharts.
- **Master Data**: Pengelolaan lengkap (CRUD) Siswa, Orang Tua/Wali Murid, Tutor, Kelas/Rombel, dan Mata Pelajaran.
- **Presensi Terpadu**: Monitoring dan rekapitulasi kehadiran siswa dan tutor bimbel.
- **Modul & Worksheet**: Kurasi dan verifikasi modul pembelajaran bulanan serta lembar kerja siswa.
- **Penilaian & Laporan Perkembangan**: Manajemen evaluasi hasil belajar siswa dengan sistem 5 tingkat penguasaan (*Belum Menguasai*, *Mulai Berkembang*, *Cukup Menguasai*, *Menguasai*, *Sangat Menguasai*).
- **Keuangan SPP**: Pembuatan invoice otomatis, pelacakan status pembayaran (*Belum Bayar*, *Menunggu Verifikasi*, *Lunas*), filter periode, dan tanda terima manual.
- **Honor Tutor (Payroll Engine)**: Perhitungan honor otomatis berbasis formula presensi terverifikasi (`Sesi Mengajar × Tarif Sesi Tutor`).
- **Audit Logs**: Rekam jejak audit keamanan seluruh mutasi data penting (login, data master, presensi, nilai, SPP, honor).

### 2. 🧑‍🏫 Tutor
- **Dashboard Tutor**: Jadwal kelas hari ini, daftar siswa ampu, dan pengingat pengisian presensi.
- **Manajemen Kelas & Siswa**: Akses informasi kelas yang diampu dan daftar siswa di dalamnya.
- **Presensi Harian**: Form pengisian presensi batch untuk siswa kelas yang dibimbing dengan pencegahan duplikasi data per sesi.
- **Modul Ajar Bulanan**: Penyusunan tema modul bulanan, capaian pembelajaran, dan rincian aktivitas kelas.
- **Worksheet Repository**: Upload berkas lembar kerja dengan validasi MIME, ekstensi, dan ukuran file.
- **Penilaian & Evaluasi 5-Tingkat**: Input nilai numerik (0-100) dan penguasaan materi per topik pembelajaran.
- **Analisis Progres Akademik Siswa**: Grafik tren nilai dan riwayat penguasaan materi siswa binaan.

### 3. 👨‍👩‍👧 Orang Tua / Wali Murid (Parent Portal)
- **Dashboard Orang Tua yang Ramah & Sederhana**: Informasi instan nama anak, kelas, tutor pendamping, persentase kehadiran, dan ringkasan nilai terbaru.
- **Multi-Child Selector**: Bagi orang tua dengan lebih dari 1 anak yang terdaftar di Bimbel Littlefish, selector anak memungkinkan peralihan data secara instan tanpa login ulang.
- **Monitoring Kehadiran**: Riwayat kehadiran anak (Hadir, Izin, Sakit, Alpa).
- **Perkembangan & Rapor Belajar**: Grafik pencapaian topik dan tingkat penguasaan materi anak secara transparan.
- **Modul Pembelajaran**: Akses modul bulanan yang sedang dipelajari anak di bimbel.
- **Status SPP & Konfirmasi**: Riwayat tagihan SPP bulanan anak dan tombol konfirmasi pembayaran.
- **Isolasi Data Ketat**: Orang tua **TIDAK BISA** melihat data akademik atau keuangan siswa milik keluarga lain (terproteksi di server-level API).

---

## 🛠️ Arsitektur & Teknologi

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack, Server Actions & Route Handlers)
- **Frontend & UI**: React 19, TypeScript, [Tailwind CSS](https://tailwindcss.com/) v4
- **Komponen & Desain**: Design system kustom dengan estetika modern, responsive mobile-first, Lucide React icons
- **Visualisasi Data**: [Recharts](https://recharts.org/) (Bar charts, Pie charts, Area & Line charts)
- **Database & ORM**: PostgreSQL-ready schema via [Prisma ORM](https://www.prisma.io/) (default configured with zero-config SQLite `file:./dev.db`)
- **Autentikasi & Keamanan**:
  - Password hashing dengan `bcryptjs`
  - Signed HTTP-Only cookie sessions dengan `jose` (JWT)
  - Role-based server guards (`requireAuth`) & Next.js middleware proxy
  - Validasi schema input menyeluruh dengan `zod`
  - Proteksi upload berkas dengan validasi MIME-type dan safe filenames

---

## 🔑 Kredensial Demo (DEVELOPMENT ONLY)

> ⚠️ **PERHATIAN**: Kredensial berikut disediakan khusus untuk keperluan pengujian dan evaluasi lokal. Jangan gunakan kredensial ini di lingkungan produksi!

| Role | Nama Pengguna | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | Bunda Rina (Kepala Bimbel) | `admin@littlefish.test` | `admin123` |
| **Tutor** | Kak Dimas Setiawan, S.Pd | `tutor@littlefish.test` | `tutor123` |
| **Tutor** | Kak Sarah Nurul, S.Si | `sarah@littlefish.test` | `tutor123` |
| **Parent** | Ibu Ratna Wijaya (2 Siswa: Budi & Siti) | `ortu@littlefish.test` | `parent123` |
| **Parent** | Ibu Maya Sartika (1 Siswa: Kenzo) | `maya@littlefish.test` | `parent123` |

*Catatan: Pada halaman login (`/login`), terdapat tombol quick-fill 1-klik untuk mempercepat login tanpa mengetik manual.*

---

## 💻 Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat
- Node.js versi 20 atau lebih baru
- npm, pnpm, atau yarn

### 2. Kloning & Instalasi Dependensi
```bash
# Instal seluruh pustaka dependensi
npm install
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin file template lingkungan:
```bash
cp .env.example .env
```
Isi konfigurasi dalam file `.env`:
```env
# Supabase PostgreSQL Configuration (Prisma + Connection Pooling)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

JWT_SECRET="littlefish-super-secure-production-jwt-secret-key-32chars"
NEXT_PUBLIC_APP_NAME="Bimbel Littlefish"
UPLOAD_DIR="./uploads"
```

### 4. Migrasi & Seeding Database
Inisialisasi skema tabel dan masukkan data dummy awal yang realistis:
```bash
# Sinkronisasi skema ke database
npx prisma db push

# Jalankan seeder data demo
npm run seed
```

### 5. Menjalankan Aplikasi
```bash
# Mode Development
npm run dev

# Atau Mode Produksi
npm run build
npm run start
```
Buka browser pada: `http://localhost:3000`

---

## 🧪 Pengujian Otomatis (Automated Tests)

Sistem dilengkapi dua rangkaian uji otomatis yang komprehensif:

### 1. Critical Unit & Integration Flows
Menguji verifikasi password hash, JWT session signing, operasi CRUD siswa, pencegahan presensi ganda, pemetaan 5-tier mastery, status SPP, dan formula honor tutor:
```bash
npm test
```

### 2. Live HTTP & API End-to-End Test Suite
Menguji seluruh batasan otorisasi role, proteksi unauthenticated, pembuatan presensi live, pembaruan SPP, kalkulasi honor, dan log audit:
```bash
npm run test:e2e
```

---

## 📱 Standar Responsivitas & Aksesibilitas
Aplikasi telah diuji dan dioptimalkan untuk berbagai ukuran layar:
- **Ponsel Pintar**: 360px, 375px, 390px, 414px (Navigasi drawer seluler, kartu tabel responsif, formulir 1 kolom)
- **Tablet**: 768px, 1024px (Grid 2 kolom fleksibel)
- **Desktop & Laptop**: 1280px, 1440px+ (Sidebar permanen, tabel master lengkap, multi-chart layout)
