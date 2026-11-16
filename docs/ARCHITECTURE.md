# Arsitektur DompetKu: 13 Pilar Rekayasa Perangkat Lunak ("Aplikasi Proper")

Dokumen ini mendokumentasikan prinsip-prinsip arsitektural, pola perancangan (*design patterns*), struktur data, serta ketahanan operasional aplikasi **DompetKu** (`mobile/` dan `supabase/`). Sistem ini dibangun untuk memenuhi kriteria aplikasi kelas produksi (*production-grade mobile app*) berstandar Google Play Store dengan fokus pada integritas data keuangan offline-first.

---

## 1. Pilar 1: Arsitektur Offline-First (Local Database as Single Source of Truth)

- **Prinsip Dasar**: Basis data lokal SQLite (`expo-sqlite`) adalah sumber kebenaran utama (*single source of truth*). Seluruh operasi pengguna (mencatat transaksi, membuat anggaran, menambah dompet, mengubah mutasi) terjadi langsung pada database lokal tanpa menunggu respon jaringan internet.
- **Peran Cloud (Supabase)**: Cloud berfungsi murni sebagai cadangan data (*backup*), sinkronisasi multi-perangkat (*cross-device sync*), dan mekanisme otentikasi. Aplikasi tetap 100% fungsional saat mode pesawat (*airplane mode*) atau saat server Supabase sedang tidak dapat dijangkau.
- **Topologi Aliran Data**:
  ```mermaid
  flowchart LR
    UI[Antarmuka Pengguna] -->|Baca / Tulis Langsung| SQLite[(SQLite Lokal)]
    SQLite -->|Watermark Berbasis Server| SyncEngine[Mesin Sinkronisasi]
    SyncEngine -->|Batch Push / Keyset Pull| Supabase[(Supabase Cloud)]
  ```

---

## 2. Pilar 2: Crash Diagnostics & Self-Healing (Ketahanan Booting)

- **Informative Global Error Boundary**: `mobile/src/app/_layout.tsx` mengekspos Error Boundary resmi Expo Router yang menangkap exception fatal di tingkat aplikasi. Alih-alih menampilkan layar crash buta (*blind crash*), aplikasi menampilkan pesan kesalahan asli, ringkasan kode error, tombol **Salin detail** (via Android Share Sheet), dan tombol **Coba lagi** (`retry()`).
- **Layar Pemulihan Database (Database Recovery Screen)**: Dikelola oleh `mobile/src/providers/LocalDatabaseProvider.tsx` saat inisialisasi basis data gagal (misal: korupsi berkas SQLite atau migrasi gagal). Layar ini mendeteksi status pengguna:
  - **Mode Akun Cloud**: Menawarkan opsi pemulihan/reset basis data lokal dengan aman karena cadangan lengkap tersimpan di Supabase.
  - **Mode Tamu (Guest)**: Memberikan peringatan tegas dua langkah bahwa data di perangkat belum dicadangkan ke cloud sebelum melakukan reset berkas fisik database via `expo-file-system`.

---

## 3. Pilar 3: Mesin Migrasi Database Tahan Banting

- **Idempotensi & Transaksional per Versi**: `mobile/src/database/migrations.ts` menerapkan migrasi bertingkat dari versi 1 hingga versi 11. Setiap blok versi dibungkus dalam `db.withTransactionAsync` mandiri dan menaikkan `PRAGMA user_version = N` seketika saat blok tersebut sukses.
- **Pengecekan Kolom Deterministik**: Helper `columnExists(db, table, column)` via `PRAGMA table_info` memastikan penambahan kolom `ALTER TABLE ADD COLUMN` hanya dieksekusi jika kolom belum ada, menghilangkan kegagalan *silent catch*.
- **Kebijakan Seeding Terisolasi**: `seedDefaultData` hanya dijalankan saat database benar-benar baru (`currentVersion === 0`). Proses upgrade versi tidak pernah mereset atau mengubah dompet dan transaksi pengguna.

---

## 4. Pilar 4: Isolasi Data & Privasi Antar-Akun

- **Kunci Pemilik Data**: `pengaturan_aplikasi` menyimpan kunci `pemilik_data_lokal_user_id` (`data_owner_user_id`). Kunci ini merekam kepemilikan data lokal pengguna terakhir.
- **Pencegahan Kebocoran Data (Multi-User Device)**:
  - Jika Akun A sign out dan Akun B login di perangkat yang sama, sistem mendeteksi ketidakcocokan `pemilik_data_lokal_user_id`.
  - Sistem menampilkan dialog tegas: (1) Hapus data lama di HP lalu muat data akun baru, atau (2) Batal & keluar. Sistem menolak mencampur (*merge*) data Akun A ke dalam akun Akun B.
- **Sign Out Terkendali**: Pengguna diberikan pilihan saat keluar: "Keluar, data tetap di HP" (untuk perangkat pribadi) atau "Keluar & hapus data dari HP ini" (untuk perangkat bersama/warung). Fallback offline menggunakan `signOut({ scope: 'local' })`.

---

## 5. Pilar 5: Integritas Saldo & Kebenaran Matematis Turunan

- **Saldo Awal (`saldo_awal`)**: Setiap dompet memiliki nilai `saldo_awal` (saldo saat pertama kali didaftarkan).
- **Rumus Mutasi Deterministik**:
  $$\text{Saldo Akhir} = \text{Saldo Awal} + \Sigma \text{Pemasukan} - \Sigma \text{Pengeluaran} + \Sigma \text{Transfer Masuk} - \Sigma \text{Transfer Keluar} + \Sigma \text{Koreksi}$$
- **Mesin Rekonsiliasi**: `hitungUlangSaldoSemuaDompet(db)` menghitung ulang saldo berdasarkan seluruh riwayat mutasi aktif dan menyelaraskan kolom cache `saldo_saat_ini`.
- **Audit Mandiri**: `periksaIntegritasSaldo(db)` membandingkan saldo cache dengan hasil hitung riwayat mutasi secara real-time dan diekspos melalui menu **Audit Saldo** pada tab Profil.

---

## 6. Pilar 6: Mesin Sinkronisasi Dua Arah yang Tangguh

- **Modul Terpusat**: Seluruh logika sinkronisasi dikonsolidasikan dalam `mobile/src/services/sync/` (`engine.ts`, `repository.ts`, `mapper.ts`, `types.ts`).
- **Watermark Waktu Mulai**: Nilai watermark push lokal dicatat dari **waktu mulai** sinkronisasi (`syncStartTime`), bukan waktu selesai, mencegah hilangnya mutasi yang dicatat pengguna saat proses upload sedang berlangsung.
- **Penanda Waktu Server (`server_updated_at`)**: Cloud menggunakan trigger `BEFORE INSERT OR UPDATE` yang mengisi `clock_timestamp()` di sisi server PostgreSQL. Hal ini menjamin urutan waktu mutlak tanpa terpengaruh oleh jam perangkat pengguna.
- **LWW Guard**: Penerapan data dari cloud ke SQLite menggunakan perlindungan:
  ```sql
  WHERE excluded.updated_at > <tabel>.updated_at
  ```
  Demikian pula di sisi cloud (`sync_bundle`), upsert menggunakan perbandingan ketat `WHERE public.<tabel>.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()))` sehingga pengiriman ulang baris dengan `updated_at` yang sama tidak memicu pembaruan semu (*no-op timestamp bump*) pada trigger `set_updated_at`.
  Khusus untuk tabel `dompet`, `saldo_saat_ini` tidak pernah ditimpa langsung dari cloud; melainkan dihitung ulang secara matematis dari riwayat transaksi yang masuk.
- **Payload Batching**: Jika mutasi offline melebihi 300 baris, payload dipecah menjadi batch berukuran maksimal 300 entitas berurutan: entitas master (profil, dompet, kategori) dikirim lebih dahulu untuk menjamin integritas relasi (*Foreign Keys*).
- **Service Mutex**: Panggilan sinkronisasi ganda (*concurrent calls*) digabungkan ke promise aktif yang sama, mencegah konflik tulis paralel.

---

## 7. Pilar 7: Batasan Anggaran Bulanan yang Aman

- **Partial Unique Index**:
  ```sql
  CREATE UNIQUE INDEX idx_anggaran_aktif_unik
  ON anggaran_bulanan (bulan, COALESCE(kategori_id, '__semua__'))
  WHERE is_aktif = 1;
  ```
  Menghilangkan kelemahan standar SQLite di mana nilai `NULL` tidak dianggap unik, sehingga anggaran "Semua pengeluaran" tidak dapat terduplikasi.
- **ID Anggaran Deterministik**: `buatIdAnggaranDeterministik(bulan, kategoriId)` membentuk ID terprediksi (`anggaran:{bulan}:{kategoriId|semua}`), mencegah dua perangkat membuat entri ganda saat offline.
- **Salin Anggaran Bulan Lalu**: Fitur cerdas di Dashboard dan halaman Anggaran yang mendeteksi jika bulan berjalan belum memiliki anggaran aktif namun bulan sebelumnya ada, memungkinkan penyalinan 1-klik tanpa input ulang.

---

## 8. Pilar 8: Pengingat Tagihan & Penjadwalan Notifikasi

- **Penyelesaian Nominal Nol**: Pengingat tagihan dengan nominal Rp 0 (misal: pengingat administratif/lapor pajak) dapat ditandai "Selesai" tanpa dipaksa mencatat mutasi pengeluaran ke dompet.
- **Roll-Forward Tanggal Jatuh Tempo**: Pengingat berulang (*mingguan/bulanan*) otomatis dimajukan tanggalnya menggunakan fungsi `getNextTanggalJatuhTempo` sampai melewati hari ini.
- **Rekonsiliasi Notifikasi Lokal**: Setelah proses pull sinkronisasi cloud selesai, notifikasi alarm Android dijadwalkan ulang secara otomatis untuk pengingat aktif yang belum kedaluwarsa.

---

## 9. Pilar 9: Pelaporan Keuangan & Ekspor Data

- **Periode Pembanding Proporsional**: Halaman `insight.tsx` menghitung perbandingan periode sebelumnya dengan durasi hari yang sama persis (misal: 7 hari vs 7 hari sebelumnya), memberikan visualisasi tren yang valid.
- **Ekspor Rentang Fleksibel**: Ekspor laporan CSV/Excel dan dokumen PDF menerima parameter rentang tanggal aktif (`tanggalMulai` s.d. `tanggalSelesai`) dengan nama berkas dan kop laporan yang mencerminkan periode yang dipilih.
- **Performa Formatters Singleton**: Menggunakan singleton `Intl.NumberFormat` dan `Intl.DateTimeFormat` di tingkat modul untuk memangkas waktu pemrosesan tabel laporan besar.

---

## 10. Pilar 10: Kepatuhan Play Store & Penghapusan Akun

- **Self-Serve Account Deletion (Google Play Mandate)**: Menu Profil > Akun menyediakan opsi **Hapus akun & data** dengan konfirmasi 2 langkah yang ketat.
- **Penghapusan Berjenjang di Cloud**:
  ```mermaid
  sequenceDiagram
    participant Mobile as Aplikasi Mobile
    participant Edge as Edge Function (delete-account)
    participant RPC as PostgreSQL RPC (hapus_semua_data_pengguna)
    participant Auth as Supabase Auth Admin

    Mobile->>Edge: POST /delete-account (JWT Bearer)
    Edge->>Edge: Verifikasi JWT & dapatkan user.id
    Edge->>RPC: Eksekusi hapus data anak (FK safe order)
    RPC-->>Edge: Data transaksi, transfer, dompet terhapus
    Edge->>Auth: admin.deleteUser(user.id)
    Auth-->>Edge: User terhapus permanen
    Edge-->>Mobile: HTTP 200 OK
    Mobile->>Mobile: Hapus SQLite lokal & reset ke status tamu
  ```
- **Proteksi Backup Android**: Atribut `"allowBackup": false` diset pada `app.json` untuk mencegah Google Drive mencadangkan database lokal dan kredensial sesi secara tidak terenkripsi.

---

## 11. Pilar 11: Antarmuka Responsif & Stabilitas Fokus Keyboard

- **Tata Letak Tab Bar Mengambang**: Layar tab utama (`dashboard`, `insight`, `profil`, `wallet`) mengaktifkan `withFloatingTabSpace` untuk mencegah elemen bawah tertutup navigasi tab. Layar stack biasa mempertahankan margin alami.
- **Pencarian Terisolasi pada List Transaksi**: Komponen `RiwayatSearchBar` mengelola input teks secara lokal dan mengirimkan hasil pencarian setelah *debounce* 300ms. Header list tidak di-remount saat mengetik, menjaga keyboard tetap aktif dan fokus input stabil.

---

## 12. Pilar 12: Ketahanan Sesi & Status Jaringan

- **Pencegahan Splash Screen Hang**: Pemanggilan `supabase.auth.getSession()` dibatasi oleh timeout balapan (*race condition*) 5 detik dan failsafe 7 detik di `AuthProvider.tsx`. Jika jaringan tidak merespon, aplikasi langsung beralih ke cache offline lokal.
- **Lifecycle Otentikasi**: Memanfaatkan listener `AppState` (`startAutoRefresh()` saat aplikasi berada di latar depan (*active*) dan `stopAutoRefresh()` saat di latar belakang (*background*)).
- **Deteksi Konektivitas**: `CloudAutoSyncProvider` menggunakan `expo-network` untuk memeriksa status internet sebelum melakukan sinkronisasi otomatis, menghindari pesan kesalahan mengambang saat offline.

---

## 13. Pilar 13: Rekayasa Rilis & Standar Verifikasi Mutu

- **Profil EAS Terstruktur**: `mobile/eas.json` mendefinisikan profil `preview`, `development`, dan `production` dengan konfigurasi channel dan distribusi APK internal.
- **Suite Pengujian Otomatis**: Pengujian unit `mobile/tests/` memvalidasi simulasi migrasi skema, rumus LWW, kalkulasi saldo, dan fungsi manipulasi tanggal sebelum setiap commit.
- **Build Zero-Warning & Hermes Bytecode**: Setiap rilis diverifikasi dengan `npx tsc --noEmit`, `npx expo lint` (0 error), `npx expo-doctor` (20/20 checks passed), dan `npx expo export --platform android` (menghasilkan bundel teroptimasi Hermes bytecode).
