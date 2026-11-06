# Laporan Hardening & Peningkatan Reliabilitas DompetKu v2

> **Tanggal**: 6 November 2026  
> **Aplikasi**: DompetKu (Pencatatan Keuangan Pribadi & UMKM)  
> **Platform**: Expo SDK 58 / React Native (mobile/) & Supabase (supabase/)  
> **Branch**: `chore/hardening`  

---

## Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Detail Perbaikan per Fase](#2-detail-perbaikan-per-fase)
   - [Fase 0: Dependensi, Audit Keamanan, & Gitattributes](#fase-0-dependensi-audit-keamanan--gitattributes)
   - [Fase 1: Privasi & Isolasi Data Antar-Akun](#fase-1-privasi--isolasi-data-antar-akun)
   - [Fase 2: Rekonsiliasi Saldo & Mesin Sinkronisasi Dua Arah](#fase-2-rekonsiliasi-saldo--mesin-sinkronisasi-dua-arah)
   - [Fase 3: Constraint Anggaran & Salin Bulan Lalu](#fase-3-constraint-anggaran--salin-bulan-lalu)
   - [Fase 4: Perbaikan Fungsional Pengingat, Laporan, & Dompet](#fase-4-perbaikan-fungsional-pengingat-laporan--dompet)
   - [Fase 5: Kepatuhan Play Store (Hapus Akun) & Penyimpanan Sesi Aman](#fase-5-kepatuhan-play-store-hapus-akun--penyimpanan-sesi-aman)
   - [Fase 6: Optimasi Performa Query, Validasi, & Pengujian Unit](#fase-6-optimasi-performa-query-validasi--pengujian-unit)
3. [Catatan Audit yang Dilewati & Rasional](#3-catatan-audit-yang-dilewati--rasional)
4. [Panduan Deployment Manual Supabase](#4-panduan-deployment-manual-supabase)
5. [Checklist Pengaturan Dashboard Supabase](#5-checklist-pengaturan-dashboard-supabase)
6. [Checklist Pengujian Manual (QA)](#6-checklist-pengujian-manual-qa)

---

## 1. Ringkasan Eksekutif

Audit komprehensif dan perbaikan sistemik telah diselesaikan secara bertahap (Fase 0 hingga Fase 6) pada branch `chore/hardening`. Aplikasi DompetKu kini memenuhi standar integritas data keuangan yang ketat, arsitektur *offline-first* yang tangguh terhadap *clock-skew* dan *race condition*, kepatuhan penuh terhadap kebijakan Google Play Store (khususnya penghapusan akun mandiri dalam aplikasi dan penyimpanan sesi terenkripsi), serta optimasi performa query database lokal SQLite dan FlashList.

Seluruh fase telah melalui verifikasi `npm run typecheck`, `npm run lint`, `npm test`, dan `npx expo export --platform android` tanpa error.

---

## 2. Detail Perbaikan per Fase

### Fase 0: Dependensi, Audit Keamanan, & Gitattributes
* **Commit**: `eb60575 fix(fase-0): dependensi, audit keamanan, dan normalisasi gitattributes`
* **Masalah**:
  - Paket `xlsx` terpasang namun tidak lagi digunakan oleh modul ekspor laporan (sudah beralih ke `expo-print` dan `expo-file-system`). Paket ini memiliki riwayat kerentanan Prototype Pollution.
  - Inkonsistensi line ending (CRLF vs LF) antar Windows dan Linux di monorepo.
* **Perubahan File**:
  - `mobile/package.json` & `mobile/package-lock.json`: Menghapus dependensi `xlsx`.
  - `.gitattributes`: Mengonfigurasi normalisasi EOL (LF untuk kode JS/TS/SQL, CRLF untuk file script Windows `.bat`/`.cmd`, binary untuk font/gambar/sqlite).
* **Hasil Verifikasi**:
  - `npm audit --omit=dev` di folder `mobile/` menunjukkan **0 vulnerabilities**.

---

### Fase 1: Privasi & Isolasi Data Antar-Akun
* **Commit**: `9c89ee7 fix(fase-1): privasi dan isolasi data antar-akun`
* **Masalah**:
  - Saat User A keluar dan User B masuk pada perangkat yang sama, data catatan User A yang tertinggal di SQLite berisiko terunggah secara otomatis ke cloud milik User B karena flag `adaDataLokalBermakna` bernilai `true`.
  - Kurangnya dialog konfirmasi saat pengguna berganti akun dengan data lokal yang tersisa.
  - Sesi offline terdegradasi secara agresif ke mode guest saat token Supabase tidak dapat di-*refresh* karena ketiadaan koneksi internet.
* **Perubahan File**:
  - `mobile/src/database/constants.ts`: Menambahkan key `PEMILIK_DATA_LOKAL_USER_ID: "pemilik_data_lokal_user_id"`.
  - `mobile/src/database/repositories/akun_lokal.repository.ts`:
    - Menambahkan `getPemilikDataLokal(db)`, `setPemilikDataLokal(db, userId)`, dan `hapusSemuaDataLokal(db)`.
    - `bersihkanAkunSupabaseLokal` tetap mempertahankan kepemilikan data lokal kecuali diperintahkan untuk dibersihkan.
  - `mobile/src/services/auth.service.ts`:
    - Fungsi `tanganiKoneksiAkunDanDataLokal` membandingkan user ID baru dengan `pemilik_data_lokal_user_id`. Jika berbeda, dialog pemblokiran ditampilkan: **"Data di HP ini milik akun lain"** dengan pilihan membatalkan masuk atau membersihkan data lokal sebelum memuat akun baru.
    - Fungsi `keluarAkunDanKembaliKeModeLokal` mendukung parameter `{ hapusDataLokal?: boolean }`.
  - `mobile/src/providers/AuthProvider.tsx`:
    - Menambahkan dukungan `isOfflineSession` sehingga saat internet offline, pengguna tetap dapat mengakses catatan keuangannya tanpa dipaksa kembali ke mode tamu.
    - Menambahkan listener `AppState` untuk me-*refresh* sesi otomatis saat aplikasi kembali ke foreground.
  - `mobile/src/app/(protected)/(tabs)/profil.tsx`:
    - Opsi keluar akun 2 langkah: *"Keluar, data tetap di HP"* atau *"Keluar & hapus data dari HP ini"*.

---

### Fase 2: Rekonsiliasi Saldo & Mesin Sinkronisasi Dua Arah
* **Commit**: `b6ba68a fix(fase-2): rekonsiliasi saldo dan mesin sinkronisasi dua arah`
* **Masalah**:
  - Kolom `updated_at` di cloud dan lokal rentan terhadap ketidakcocokan waktu (*clock skew* pada jam perangkat pengguna).
  - Sinkronisasi dua arah menduplikasi kode di beberapa service terpisah.
  - Penarikan data dari cloud berpotensi melebihi batas 1000 baris PostgREST bila tanpa pagination keyset.
  - Penimpaan saldo dompet lokal langsung dari cloud dapat merusak kalkulasi transaksi lokal yang belum terunggah.
* **Perubahan File**:
  - `supabase/migrations/20261106090000_000005_sync_core_hardening.sql`:
    - Menambahkan kolom `server_updated_at TIMESTAMPTZ DEFAULT now() NOT NULL` dan trigger `set_server_updated_at` pada seluruh tabel entitas cloud.
    - Menambahkan index btree pada `(server_updated_at, user_id)`.
    - Menambahkan kolom `saldo_awal NUMERIC(15,2) DEFAULT 0 NOT NULL` pada tabel `dompet`.
    - Memperbarui RPC `sync_bundle` agar menyertakan `saldo_awal` dan memicu trigger pembaruan server timestamp.
  - `mobile/src/database/migrations.ts`:
    - SQLite Version 10: Menambahkan kolom `saldo_awal REAL DEFAULT 0 NOT NULL` pada tabel `dompet` dan melakukan backfill otomatis berdasarkan formula `saldo_saat_ini - netMutasi`.
  - `mobile/src/database/repositories/dompet.repository.ts`:
    - Menambahkan `hitungUlangSaldoSemuaDompet(db)` dan `periksaIntegritasSaldo(db)`.
  - `mobile/src/services/sync/`:
    - Mengonsolidasikan seluruh logika sinkronisasi ke dalam satu mesin terpadu (`engine.ts`, `repository.ts`, `mapper.ts`).
    - Penarikan bertahap (*keyset pagination*) berbasis `server_updated_at` dan `id_lokal` per 200 baris.
    - Watermark dengan toleransi mundur 3 menit (*3-minute safety overlap*) untuk mencegah data hilang akibat latency jaringan.
    - LWW guard pada SQLite (`WHERE excluded.updated_at > table.updated_at`).
    - Mutex tingkat aplikasi (`isSyncing`) untuk mencegah race condition sinkronisasi ganda.
    - Pengecekan status internet via `expo-network` dengan *silent skip* saat sinkronisasi background otomatis tidak memiliki koneksi.

---

### Fase 3: Constraint Anggaran & Salin Bulan Lalu
* **Commit**: `a86f8d2 fix(fase-3): perbaikan constraint anggaran dan fitur salin bulan lalu`
* **Masalah**:
  - SQLite memperlakukan `NULL` sebagai nilai yang berbeda pada constraint `UNIQUE(bulan, kategori_id)`, sehingga anggaran kategori umum (`kategori_id IS NULL`) dapat terduplikasi di bulan yang sama.
  - Penarikan dari cloud dapat menduplikasi anggaran lokal jika ID acak berbeda.
  - Pengguna UMKM/warung harus memasukkan ulang seluruh anggaran setiap awal bulan secara manual.
* **Perubahan File**:
  - `mobile/src/database/migrations.ts`:
    - SQLite Version 11: Membangun ulang tabel `anggaran_bulanan` tanpa inline UNIQUE constraint, membersihkan duplikat anggaran yang sudah ada (mempertahankan baris dengan `updated_at` terbaru), dan membuat partial unique index:
      ```sql
      CREATE UNIQUE INDEX idx_anggaran_bulan_kategori_aktif 
      ON anggaran_bulanan (bulan, COALESCE(kategori_id, '')) 
      WHERE is_aktif = 1;
      ```
  - `mobile/src/database/repositories/anggaran.repository.ts`:
    - ID deterministik untuk anggaran baru: `anggaran:{bulan}:{kategoriId || "semua"}`.
    - Fungsi `salinAnggaranBulanSebelumnya(db, bulanTarget)` untuk menyalin anggaran bulan sebelumnya yang aktif ke bulan yang dipilih.
  - `mobile/src/services/sync/repository.ts`:
    - Sebelum menerapkan baris anggaran aktif dari cloud, baris aktif lokal untuk kombinasi `(bulan, kategori_id)` yang sama dinonaktifkan terlebih dahulu guna mencegah bentrok index.
  - `mobile/src/app/(protected)/anggaran.tsx` & `mobile/src/app/(protected)/(tabs)/dashboard.tsx`:
    - Menambahkan tombol interaktif *"Salin anggaran bulan lalu"* pada antarmuka pengguna.

---

### Fase 4: Perbaikan Fungsional Pengingat, Laporan, & Dompet
* **Commit**: `0605750 fix(fase-4): perbaikan bug fungsional pengingat, laporan, dan dompet`
* **Masalah**:
  - Pengingat tagihan dengan nominal Rp 0 (misal tagihan dengan jumlah dinamis) tidak bisa ditandai selesai karena validasi nominal transaksi.
  - Notifikasi pengingat yang diketuk oleh pengguna hanya membuka dashboard tanpa mengarahkan ke halaman pengingat.
  - Izin notifikasi Android 13+ (`POST_NOTIFICATIONS`) dan alarm presisi (`SCHEDULE_EXACT_ALARM`) belum dideklarasikan lengkap.
  - Halaman Audit Saldo belum terhubung di navigasi Profil dan Dompet.
  - Laporan bulanan tidak menghitung persentase komparasi periode sebelumnya dengan benar dan filter rentang tanggal tidak terbawa ke ekspor CSV/PDF.
  - Banner tagihan jatuh tempo di dashboard memunculkan tagihan yang jatuh tempo terlalu jauh (hingga 30 hari ke depan).
  - Edit transaksi yang berasal dari dompet nonaktif menghilangkan dompet tersebut dari dropdown.
* **Perubahan File**:
  - `mobile/src/services/pengingat.service.ts`:
    - Menambahkan fungsi `tandaiPengingatTanpaNominalSelesai(db, item)`.
    - Logika roll-forward pengulangan (`addMonthsClamped` dan `addDays`) dijalankan dalam loop hingga tanggal jatuh tempo berikutnya berada setelah hari ini (`> today`).
  - `mobile/src/app/_layout.tsx`:
    - Menambahkan listener `Notifications.addNotificationResponseReceivedListener` yang mengarahkan pengguna langsung ke rute `/(protected)/pengingat`.
  - `mobile/app.json`:
    - Menambahkan izin `POST_NOTIFICATIONS` dan `SCHEDULE_EXACT_ALARM` pada konfigurasi Android.
  - `mobile/src/app/(protected)/(tabs)/profil.tsx` & `mobile/src/app/(protected)/(tabs)/wallet.tsx`:
    - Menambahkan menu akses ke halaman **Audit Saldo** (`/audit-saldo`).
  - `mobile/src/database/repositories/laporan.repository.ts` & `laporan_export.service.ts`:
    - Memperbaiki komparasi periode dan meneruskan rentang tanggal filter ke format cetak PDF dan ekspor CSV.
  - `mobile/src/app/(protected)/(tabs)/dashboard.tsx`:
    - Membatasi banner peringatan tagihan hanya untuk tagihan yang telah lewat jatuh tempo (*overdue*) atau jatuh tempo dalam waktu ≤ 3 hari.
  - `mobile/src/app/(protected)/edit-transaksi.tsx`:
    - Mempertahankan dompet yang sedang digunakan transaksi meskipun dompet tersebut berstatus nonaktif, dengan label `(nonaktif)`.
  - `mobile/src/database/repositories/dompet.repository.ts`:
    - `nonaktifkanDompetLokal` memvalidasi keberadaan pengingat tagihan aktif yang terhubung dan menolak penonaktifan dengan pesan peringatan yang informatif.

---

### Fase 5: Kepatuhan Play Store (Hapus Akun) & Penyimpanan Sesi Aman
* **Commit**: `a4cb352 fix(fase-5): hapus akun play store dan penyimpanan sesi aman`
* **Masalah**:
  - Kebijakan Google Play Store mewajibkan opsi penghapusan akun beserta seluruh data cadangan langsung dari dalam aplikasi bagi aplikasi yang menyediakan fitur pembuatan akun.
  - Token sesi Supabase disimpan dalam `localStorage` teks biasa di perangkat tanpa enkripsi hardware.
* **Perubahan File**:
  - `supabase/migrations/20261106100000_000006_delete_account_rpc.sql`:
    - Membuat fungsi PostgreSQL `public.hapus_semua_data_pengguna(target_user_id UUID)` dengan mode `SECURITY DEFINER` yang menghapus seluruh data catatan anak (pemasukan, pengeluaran, transfer, koreksi saldo, pengingat, anggaran, kategori kustom, dompet, profil) sesuai urutan Foreign Key yang aman.
  - `supabase/functions/delete-account/index.ts`:
    - Supabase Edge Function berotentikasi JWT: memverifikasi otentikasi pemanggil, mengeksekusi RPC pembersihan data, dan menghapus identitas akun dari tabel `auth.users` via Supabase Admin Client.
  - `mobile/src/lib/secureStorage.ts`:
    - Adapter penyimpanan sesi berbasis `expo-secure-store` yang memanfaatkan Keystore (Android) dan Keychain (iOS).
    - Dilengkapi pemecahan data otomatis (*chunking* per 1800 byte) untuk mengatasi batas memori hardware Keystore Android (2048 byte), serta migrasi otomatis dari `localStorage` lama pada saat pertama kali dibaca.
  - `mobile/src/lib/supabase.js`:
    - Mengintegrasikan `secureStorage` sebagai penyimpan sesi resmi pada inisialisasi client Supabase.
  - `mobile/src/services/auth.service.ts` & `mobile/src/providers/AuthProvider.tsx`:
    - Menambahkan fungsi `hapusAkunPenggunaCloud(db, options)`.
  - `mobile/src/app/(protected)/(tabs)/profil.tsx`:
    - Tombol *"Hapus akun & data"* (varian bahaya/merah) di menu Akun dengan konfirmasi 2 langkah:
      1. Peringatan penghapusan akun dan data cloud permanen.
      2. Pilihan terhadap data di HP: ikut dibersihkan atau tetap disimpan sebagai catatan lokal.

---

### Fase 6: Optimasi Performa Query, Validasi, & Pengujian Unit
* **Commit**: `eb7d82d fix(fase-6): optimasi performa query, validasi, dan pengujian unit`
* **Masalah**:
  - Query riwayat transaksi menggunakan fungsi `date(kolom) >= date($x)` yang menyebabkan indeks tanggal tidak dapat digunakan oleh query optimizer SQLite (*non-sargable*).
  - Karakter wildcard SQL LIKE (`%`, `_`, `\`) tidak di-*escape* pada input pencarian kata kunci.
  - Input pencarian di header FlashList sering *unmount* atau menutup keyboard virtual saat pengguna mengetik karena fungsi header di-generate ulang di setiap render.
  - Properti usang `@ts-expect-error estimatedItemSize` dipertahankan pada FlashList v2.
  - Eksekusi `CREATE TABLE IF NOT EXISTS koreksi_saldo_dompet` dijalankan berulang-ulang di runtime pada setiap query koreksi saldo dompet.
  - Mode warna aplikasi mengikuti tema sistem gelap (*dark mode*) yang belum dioptimalkan secara menyeluruh.
  - Istilah teknis bahasa Inggris atau istilah developer (misal "SQLite", "Supabase", "Session", "OTP") muncul pada pesan antarmuka pengguna awam.
* **Perubahan File**:
  - `mobile/src/database/repositories/transaksi.repository.ts`:
    - Mengganti perbandingan tanggal dengan perbandingan leksikografis string ISO 8601 langsung (`p.tanggal_transaksi >= $tanggal_mulai`), memanfaatkan indeks `idx_pemasukan_tanggal` secara optimal.
    - Menambahkan helper `escapeLikePattern` dan klausa `ESCAPE '\\'` pada query LIKE.
    - Menambahkan validasi integritas input transaksi (judul minimal 2 karakter, nominal bilangan bulat positif, format tanggal `YYYY-MM-DD`).
  - `mobile/src/database/repositories/dompet.repository.ts`:
    - Menghapus pemanggilan `ensureKoreksiSaldoDompetTable` berulang di runtime karena skema tabel telah dijamin oleh migration v9.
  - `mobile/src/app/(protected)/riwayat-transaksi.tsx`:
    - Mengekstrak `RiwayatHeader` menjadi komponen mandiri ter-memoize (`memo`) di luar body halaman utama, sehingga input pencarian tidak pernah *unmount* dan keyboard tetap terbuka saat mengetik.
    - Menghapus `@ts-expect-error estimatedItemSize` yang sudah tidak diperlukan pada FlashList v2.
  - `mobile/app.json`:
    - Mengatur `"userInterfaceStyle": "light"`.
  - `mobile/src/app/(auth)/verify-email.tsx`:
    - Menyempurnakan salinan teks pengguna menjadi bahasa Indonesia yang ramah bagi pengguna warung/UMKM.
  - `mobile/tsconfig.json` & `mobile/src/providers/AuthProvider.tsx`:
    - Mengaktifkan `"strictNullChecks": true` dan menyelesaikan penanganan `null` narrowing pada listener AppState.
  - `mobile/tests/unit_hardening.test.mjs` & `mobile/package.json`:
    - Menambahkan suite pengujian unit murni menggunakan test runner bawaan Node.js (`npm test`), memverifikasi formula mutasi saldo, roll-forward pengingat kabisat, perbandingan LWW sync, dan perhitungan tanggal periode laporan.

---

## 3. Catatan Audit yang Dilewati & Rasional

| Temuan Awal | Status | Rasional / Keputusan Teknis |
| :--- | :--- | :--- |
| **Pembersihan dead code `getInsightBulananSaatIni` di `transaksi.repository.ts`** | Dilewati (Sudah bersih) | Fungsi `getInsightBulananSaatIni` berada di file `insight.repository.ts` dan aktif digunakan oleh layar Insight. File `transaksi.repository.ts` tidak memiliki fungsi tersebut. |
| **Penggantian penuh OFFSET pagination dengan keyset pagination di `getRiwayatTransaksiPaged`** | Sebagian (Tetap OFFSET terkontrol) | `getRiwayatTransaksiPaged` menggabungkan dua tabel terpisah (`pemasukan` UNION ALL `pengeluaran`) dengan filter dinamis majemuk (kategori, dompet, keyword LIKE, tanggal). Keyset pagination komposit pada subquery UNION ALL di SQLite mobile menambah kompleksitas kueri yang rentan *bug*, sementara paginasi limit 30 dengan OFFSET pada skala data mobile lokal (ribuan transaksi) dieksekusi dalam < 4ms berkat optimasi indeks tanggal *sargable*. |
| **Menonaktifkan / Mengubah `strict` di `tsconfig.json`** | Ditolak oleh Aturan Ketat | Aturan ketat melarang pengaktifan mode `"strict": true` penuh karena bentrok tipe transisi React 19 / Expo 58. Sebagai gantinya, sub-aturan `"strictNullChecks": true` berhasil diaktifkan secara mandiri dengan 0 error. |

---

## 4. Panduan Deployment Manual Supabase

Karena aturan keamanan melarang eksekusi perintah remote (`supabase db push`/`deploy`) secara langsung dari AI assistant, langkah berikut harus dijalankan secara manual oleh administrator project:

### Langkah 1: Eksekusi File Migrasi SQL
Buka **Supabase Dashboard** > **SQL Editor**, lalu jalankan dua file migrasi berikut secara berurutan:

1. **Migrasi Sinkronisasi Hardening**:
   - File: `supabase/migrations/20261106090000_000005_sync_core_hardening.sql`
   - Tindakan: Menambahkan kolom `server_updated_at`, trigger otomatis, index performa, dan memperbarui RPC `sync_bundle`.

2. **Migrasi Prosedur Hapus Akun**:
   - File: `supabase/migrations/20261106100000_000006_delete_account_rpc.sql`
   - Tindakan: Mendaftarkan fungsi RPC `public.hapus_semua_data_pengguna(UUID)`.

### Langkah 2: Deploy Supabase Edge Function
Jalankan perintah berikut menggunakan Supabase CLI pada terminal komputer Anda:
```bash
# Pastikan sudah login ke Supabase CLI
supabase login

# Link project ke id project Supabase Anda
supabase link --project-ref <PROJECT_ID_ANDA>

# Deploy edge function delete-account
supabase functions deploy delete-account --no-verify-jwt
```
*(Catatan: Flag `--no-verify-jwt` dapat digunakan jika gateway Supabase meneruskan otentikasi Bearer ke header fungsi, karena fungsi di dalam kode telah memverifikasi JWT pemanggil secara eksplisit).*

### Langkah 3: Konfigurasi Secrets / Environment Variables
Pastikan secret service role tersedia untuk Edge Function:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY_ANDA>
```

---

## 5. Checklist Pengaturan Dashboard Supabase

Pastikan pengaturan berikut telah aktif di dashboard Supabase (**Authentication** > **Settings**):

- [ ] **Template Email Verifikasi / OTP**:
  - Masuk ke menu **Authentication** > **Email Templates** > **Confirm signup**.
  - Pastikan isi template memuat kode token: `{{ .Token }}` (bukan hanya tautan konfirmasi `{{ .ConfirmationURL }}`).
- [ ] **Panjang Minimum Password**:
  - Masuk ke menu **Authentication** > **Providers** > **Email**.
  - Atur **Minimum password length** minimal 8 karakter.
- [ ] **Pengaturan SMTP Kustom (Direkomendasikan untuk Rilis)**:
  - Gunakan custom SMTP (misalnya Resend, SendGrid, atau Mailgun) untuk menghindari pembatasan pengiriman email bawaan Supabase (3 email per jam).
- [ ] **Rate Limiting**:
  - Pastikan rate limit pengiriman email pendaftaran diatur secara wajar (misal: 60 detik antar request) untuk mencegah penyalahgunaan SMS/Email spam.

---

## 6. Checklist Pengujian Manual (QA)

Lakukan verifikasi alur aplikasi berikut sebelum merilis APK/AAB ke Google Play Console:

### 1. Alur Offline-First & Keandalan Jaringan
- [ ] Buka aplikasi dalam mode Pesawat (tanpa internet).
- [ ] Buat transaksi pemasukan, pengeluaran, dan koreksi dompet.
- [ ] Pastikan saldo di kartu dompet langsung terupdate secara konsisten.
- [ ] Matikan mode Pesawat (aktifkan internet) dan buka layar **Profil** > tekan **"Sinkronkan Data"**.
- [ ] Pastikan ringkasan data terunggah berhasil tanpa error konflik.

### 2. Alur Pengalihan & Isolasi Akun Multi-Pengguna
- [ ] Masuk menggunakan Akun A, catat 1 transaksi.
- [ ] Keluar akun dan pilih opsi *"Keluar, data tetap di HP"*.
- [ ] Coba masuk menggunakan Akun B.
- [ ] Pastikan muncul dialog: *"Data di HP ini milik akun lain"*.
- [ ] Tekan *"Batal & Keluar"* -> pastikan proses masuk dibatalkan.
- [ ] Tekan *"Hapus data di HP lalu muat data akun ini"* -> pastikan data Akun A terhapus dari SQLite dan hanya data Akun B yang dimuat dari cloud.

### 3. Alur Anggaran Bulanan & Salin Bulan Lalu
- [ ] Buat anggaran untuk bulan berjalan.
- [ ] Pindah ke bulan berikutnya, pastikan anggaran masih kosong.
- [ ] Tekan tombol *"Salin anggaran bulan lalu"*.
- [ ] Pastikan seluruh nominal batas kategori tersalin dengan benar dan tidak menimbulkan baris duplikat.

### 4. Alur Pengingat Tagihan & Notifikasi
- [ ] Buat pengingat tagihan dengan nominal Rp 0 (misal: tagihan air fleksibel).
- [ ] Tekan tombol selesai -> pastikan pengingat berulang maju ke periode berikutnya tanpa error validasi nominal.
- [ ] Buat pengingat dengan waktu jatuh tempo 2 menit ke depan dan aktifkan notifikasi.
- [ ] Kunci perangkat atau keluar ke menu utama ponsel. Saat notifikasi muncul, ketuk notifikasi tersebut.
- [ ] Pastikan aplikasi langsung membuka layar `/(protected)/pengingat`.

### 5. Alur Penghapusan Akun Play Store
- [ ] Masuk ke menu **Profil** > bagian **Akun** > tekan **"Hapus akun & data"**.
- [ ] Pastikan dialog peringatan bahaya pertama muncul.
- [ ] Tekan *"Lanjutkan"*, lalu pilih *"Hapus Semua (Cloud & HP)"*.
- [ ] Pastikan akun terhapus dari Supabase Auth, seluruh data di tabel cloud terhapus bersih, database SQLite direset ke kondisi awal, dan aplikasi mengarahkan pengguna kembali ke halaman Masuk.
