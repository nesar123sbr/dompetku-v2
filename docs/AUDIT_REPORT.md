# Laporan Audit Komprehensif DompetKu (Stabilization & Hardening)

Laporan ini mendokumentasikan hasil audit teknis, analisis akar penyebab crash, verifikasi berbasis bukti pada kode dan perangkat keras fisik (*real hardware*), serta daftar perbaikan bertahap (Fase 0 hingga Fase 5) pada monorepo **DompetKu** (`mobile/` dan `supabase/`).

---

## 1. Analisis Akar Masalah Crash Booting APK (Fase 0)

### 1.1 Temuan & Bukti Hardware Langsung
Saat menjalankan APK preview pada perangkat Android fisik (`adb -s YHZ9ZLKFLF6LH6HM`), aplikasi langsung memicu *Global Error Boundary* pada `mobile/src/app/_layout.tsx` dengan log:
```text
ReactNativeJS: 'Global ErrorBoundary caught error:', { [Error: Error code 1: no such column: dompet_asal_id]
  code: 'ERR_INTERNAL_SQLITE_ERROR',
  nativeStack: 'expo.modules.sqlite.SQLiteErrorException: Error code 1: no such column: dompet_asal_id\n...
```

### 1.2 Urutan & Pembuktian Kandidat Penyebab (Prompt 0.3)

| Urutan | Kandidat | Status & Bukti | Tingkat Keyakinan |
|---|---|---|---|
| **#1** | **A. SQLite Schema / Typo Kolom & Migrasi** | **AKAR PENYEBAB UTAMA (SMOKING GUN)**.<br>Ditemukan typo kolom `dompet_asal_id` (seharusnya `dompet_sumber_id`) pada:<br>- `mobile/src/database/repositories/dompet.repository.ts:406`<br>- `mobile/src/database/repositories/dompet.repository.ts:480`<br>- `mobile/src/database/migrations.ts:446`<br>Karena `SQLiteProvider` menggunakan `useSuspense`, exception saat `onInit` / migrasi v9 langsung melempar error ke `ErrorBoundary` root. | **100% (Terbukti Logcat)** |
| **#2** | **B. Variabel Lingkungan (.env) pada EAS** | **FAKTOR KONTRIBUSI AWAN**.<br>Berkas `.env` masuk `.gitignore`. Di EAS Build, `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bernilai `undefined` jika tidak diset di dashboard EAS Environment Variables. Walaupun kode `supabase.ts` memiliki penanganan `null` (`isSupabaseConfigured = false`), kegagalan database lokal membuat aplikasi tidak bisa menampilkan fallback offline. | **Tinggi (Konfigurasi EAS)** |
| **#3** | **C. Kecocokan Versi Dependensi** | Versi Expo SDK 58, React Native 0.88.1, dan flash-list 2.3.2 sudah lolos `expo-doctor` (20/20 checks passed). Pinning versi paket Expo telah diselaraskan. | **Sedang** |
| **#4** | **D. Struktur Rute & Navigator** | Rute `/` ganda (`src/app/index.tsx` dan `(tabs)/index.tsx`) keduanya mengarah ke `/dashboard`. `riwayat.tsx` merupakan re-export `riwayat-transaksi.tsx`. `audit-saldo.tsx` belum terdaftar di Stack navigator. | **Sedang** |
| **#5** | **E. Case-Sensitivity Aset di Linux/EAS** | Terverifikasi aman. Nama aset di `app.json` (`Dompetku.png`, `DompetKu_icon.png`, `dompetku_logo_horizontal.png`) cocok 100% dengan kapitalisasi di `git ls-files`. | **Rendah (Aman)** |
| **#6** | **F. Permissions Android & Handler Notifikasi** | `POST_NOTIFICATIONS` dan `SCHEDULE_EXACT_ALARM` sudah terdaftar di `app.json`. Handler notifikasi di level modul perlu pengetikan resmi tanpa `as any`. | **Rendah** |

---

## 2. Rincian Perbaikan Fase 0

### Berkas Diubah:
1. `mobile/src/database/repositories/dompet.repository.ts`:
   - Mengganti `dompet_asal_id` menjadi `dompet_sumber_id` pada query `hitungUlangSaldoSemuaDompet` (baris 406) dan `periksaIntegritasSaldo` (baris 480).
2. `mobile/src/database/migrations.ts`:
   - Mengganti `dompet_asal_id` menjadi `dompet_sumber_id` pada query migrasi `createVersion9` (baris 446).
3. `mobile/src/app/_layout.tsx`:
   - Memperbarui `ErrorBoundary` global expo-router untuk menampilkan pesan error asli (`error.message`), stack trace pada mode `__DEV__`, tombol **"Salin detail"** via Android Share Sheet, dan tombol **"Coba lagi"** (`retry`).
   - Menambahkan komponen `<StatusBar style="dark" />` dari `expo-status-bar` agar ikon status bar kontras di atas latar belakang terang.
4. `mobile/src/providers/LocalDatabaseProvider.tsx`:
   - Menambahkan penanganan `onError` pada `SQLiteProvider`.
   - Mengimplementasikan **Layar Pemulihan Database** mandiri dengan deteksi sesi akun Supabase:
     - Jika akun terhubung: opsi reset database lokal dengan konfirmasi 2 langkah (data cloud aman).
     - Jika mode tamu: opsi reset dengan peringatan tegas bahwa data lokal akan hilang permanen.
     - Menggunakan API modern `File` dan `Paths` dari Expo SDK 58 (`expo-file-system`) untuk menghapus berkas SQLite korup secara idempotent.
5. `docs/DEBUGGING.md`:
   - Panduan lengkap cara menangkap log via ADB logcat, development build, dan verifikasi ekspor bundel Android.


---

## 3. Rincian Perbaikan Fase 1 (Stabilitas P0)

### 3.1 Migrasi Database Tahan Banting (`mobile/src/database/migrations.ts`)
- **Pengecekan Kolom Deterministik**: Menambahkan helper `columnExists(db, table, column)` via `PRAGMA table_info` menggantikan `.catch(() => {})` yang sebelumnya menelan error secara diam-diam pada versi 3, 5, dan 7.
- **Transaksi per Versi**: Seluruh migrasi dari v1 hingga v11 kini dibungkus dalam `db.withTransactionAsync` mandiri dengan pembaruan `PRAGMA user_version = N` seketika setelah blok versi sukses.
- **Kebijakan Seeding Terkontrol**: `seedDefaultData` hanya dieksekusi saat inisialisasi basis data baru (`currentVersion === 0`). Pada proses upgrade skema, hanya data pengaturan aplikasi dan kategori bawaan yang dipastikan tersedia (`INSERT OR IGNORE`) tanpa menyentuh atau mereset dompet pengguna yang sudah ada.
- **Uji Simulasi Migrasi**: Dibuat suite pengujian otomatis `mobile/tests/migration_simulation.test.mjs` menggunakan `node:sqlite` yang memvalidasi bahwa migrasi upgrade dari DB v7 ke v11 menghasilkan skema, index, dan perhitungan `saldo_awal` yang 100% konsisten dengan instalasi baru.

### 3.2 Boot Flow & Ketahanan Offline (`mobile/src/providers/AuthProvider.tsx`)
- **Timeout Session Supabase**: Menambahkan timeout 5 detik pada `supabase.auth.getSession()` dengan `Promise.race` plus failsafe timer 7 detik. Hal ini menjamin status `isReady` selalu `true` dalam kondisi koneksi lambat, mode pesawat, atau kegagalan jaringan, sehingga `RootNavigator` tidak pernah tersangkut pada splash screen.
- **Autentikasi Offline-First**: Mendukung akses aplikasi secara penuh saat offline jika `localMode === 'authenticated'` dan `authUserId` tersimpan di database lokal.
- **Fallback Sign Out Lokal**: Fallback ke `signOut({ scope: 'local' })` bila koneksi ke remote Supabase gagal.

### 3.3 Konfigurasi Klien & Keamanan Platform
- **Konversi TypeScript**: Mengonversi `mobile/src/lib/supabase.js` menjadi `mobile/src/lib/supabase.ts` dengan pengetikan `SupabaseClient` yang aman.
- **Privasi & Backup Android**: Menambahkan `"allowBackup": false` pada konfigurasi Android di `mobile/app.json` untuk mencegah pencadangan otomatis berkas database keuangan SQLite dan token otentikasi ke Google Drive / cloud backup Android.
- **Konfigurasi EAS**: Memperbarui profil `preview`, `development`, dan `production` di `mobile/eas.json` dengan channel eksplisit dan distribusi internal.

---

## 4. Rincian Perbaikan Fase 2 (Bug Logika Sinkronisasi, Anggaran, & Navigasi)

### 4.1 UI Layout & Tab Bar Floating Space (B11)
- `mobile/src/components/ui/AppScreen.tsx`: Mengubah nilai bawaan `withFloatingTabSpace` menjadi `false` agar layar stack biasa (seperti form transaksi, audit saldo, riwayat) tidak memiliki ruang kosong berlebih di bagian bawah.
- Mengaktifkan `withFloatingTabSpace` secara eksplisit hanya pada 4 layar tab utama: `dashboard.tsx`, `insight.tsx`, `profil.tsx`, dan `wallet.tsx`.

### 4.2 Zona Waktu SQLite (B12)
- `mobile/src/database/repositories/wallet.repository.ts`: Mengubah `date('now', '-30 day')` menjadi `date('now', 'localtime', '-30 day')` agar kalkulasi mutasi 30 hari terakhir selaras dengan waktu lokal pengguna (WIB/WITA/WIT).

### 4.3 Navigasi Modal & State Bersih (B9 & B10)
- `mobile/src/app/(protected)/(tabs)/wallet.tsx`: Menambahkan `router.setParams({ action: undefined })` seketika setelah modal transfer dibuka dari route query agar modal tidak terbuka ulang saat berpindah tab.
- `mobile/src/providers/AuthProvider.tsx` & `mobile/src/app/(auth)/_layout.tsx`: Menambahkan state `isRecoveringPassword`. Saat verifikasi OTP pemulihan sandi berhasil, sesi aktif tidak langsung me-redirect pengguna ke `/dashboard`, melainkan menahan navigator tetap di layar `reset-password.tsx` hingga kata sandi baru berhasil disimpan.

### 4.4 Cooldown Resend OTP & Reset Code (B14)
- `mobile/src/app/(auth)/verify-email.tsx` & `mobile/src/app/(auth)/reset-password.tsx`: Menambahkan timer cooldown 60 detik dengan tampilan waktu mundur pada tombol kirim ulang kode OTP/reset untuk mencegah *rate-limiting* dari penyedia email Supabase.

### 4.5 Sinkronisasi Otomatis Tahan Kondisi Offline (B13)
- `mobile/src/providers/CloudAutoSyncProvider.tsx`: Menambahkan pengecekan status jaringan via `Network.getNetworkStateAsync()`. Jika perangkat offline, sinkronisasi otomatis dilewati secara diam-diam tanpa memicu toast pesan kesalahan yang mengganggu pengguna.

### 4.6 Input Pencarian Stabil pada Riwayat Transaksi (B8)
- `mobile/src/app/(protected)/riwayat-transaksi.tsx`: Mengisolasi input pencarian ke dalam komponen memo `RiwayatSearchBar` dengan *local state*. Setiap ketikan huruf tidak lagi memicu pembuatan ulang JSX `ListHeaderComponent` pada `FlashList`, sehingga *keyboard focus* tidak pernah lepas (*unmount*) saat pengguna mengetik.

### 4.7 Batching & Chunking Payload Sinkronisasi (B5)
- `mobile/src/services/sync/engine.ts`: Mengimplementasikan pembagian payload dorong (*push chunking*) dengan ukuran maksimal 300 entitas per batch dan urutan ketergantungan relasi (*foreign keys*): data master (profil, dompet, kategori) dikirim terlebih dahulu sebelum *batches* transaksi, transfer, koreksi, anggaran, dan pengingat.

---

## 5. Rincian Perbaikan Fase 3 (Cleaning & Modernisasi Modul)

### 5.1 Generator ID Standar UUID
- `mobile/src/database/helpers.ts`: Mengganti generator ID acak `Math.random()` dengan implementasi standar `globalThis.crypto.randomUUID()` (didukung penuh oleh mesin Hermes di React Native 0.88 dan runtime modern) dengan fallback aman, menghasilkan format UUID RFC4122 deterministik tanpa menambah dependensi pihak ketiga.

### 5.2 Singleton Formatters (Performa Komputasi & Alokasi Memori)
- `mobile/src/utils/formatters.ts`: Mengubah inisialisasi berulang `Intl.NumberFormat` dan `Intl.DateTimeFormat` menjadi *module-level singletons* (`rupiahFormatter`, `persenFormatter`, `tanggalPendekFormatter`, `tanggalWaktuFormatter`). Hal ini meniadakan *overhead* alokasi objek dan inisialisasi tabel locale pada setiap siklus render daftar transaksi dan laporan.
- `mobile/src/services/laporan_export.service.ts`: Memodernisasi fungsi pemformatan tanggal pada ekspor laporan agar memanfaatkan formatters singleton tingkat modul.

### 5.3 Modernisasi Navigasi & Pembersihan Variabel Tak Terpakai
- `mobile/src/app/(protected)/riwayat-transaksi.tsx`: Mengganti navigasi string template `as Href` pada edit transaksi dengan sintaks rute objek resmi Expo Router (`pathname` & `params`).
- Menghapus konstanta `EDIT_TRANSAKSI_HREF` yang tidak lagi terpakai.

---

## 6. Rincian Perbaikan Fase 4 (Migrasi Supabase & Hardening Keamanan Cloud)

### 6.1 Pembaruan Skema & RPC `sync_bundle` (`20261106090000_000005_sync_core_hardening.sql`)
- **Pembersihan Indeks Duplikat**: Menghapus indeks duplikat FK warisan skema awal (`idx_pemasukan_fk_dompet`, `idx_pengeluaran_fk_dompet`, `idx_transfer_dompet_fk_asal`, dll.) yang identik dengan indeks pada patch keamanan 000003.
- **Trigger `server_updated_at`**: Menambahkan kolom `server_updated_at timestamptz not null default clock_timestamp()` beserta trigger `BEFORE INSERT OR UPDATE` pada seluruh 9 tabel sinkronisasi agar penanda waktu pembaruan server konsisten dan kebal terhadap perbedaan jam klien (*client clock drift*).
- **Kolom `saldo_awal` pada Dompet**: Mendukung pencatatan dan rekonsiliasi saldo turunan cloud.
- **Pembaruan RPC `sync_bundle`**:
  - Validasi ketat format payload JSONB.
  - Dukungan tabel `koreksi_saldo_dompet` secara append-only (`ON CONFLICT (pengguna_id, id_lokal) DO NOTHING`).
  - Pencegahan pembaruan mundur (*backdated timestamp attack*) dengan fungsi `LEAST(EXCLUDED.updated_at, timezone('utc', now()))`.
  - Pembatasan hak eksekusi: `REVOKE EXECUTE ... FROM public, anon;` dan `GRANT EXECUTE ... TO authenticated;`.

### 6.2 Penghapusan Akun Play Store & Data Berjenjang (`20261106100000_000006_delete_account_rpc.sql`)
- Membuat fungsi database RPC `public.hapus_semua_data_pengguna(target_user_id UUID)` dengan mode `SECURITY DEFINER`.
- Menghapus data secara berjenjang mengikuti urutan aman Foreign Key (*transaksi → transfer → koreksi → pengingat → anggaran → kategori → dompet → profil*) untuk mencegah pelanggaran `ON DELETE RESTRICT` saat user dihapus dari `auth.users`.
- Memberikan akses fungsi hanya kepada `authenticated` dan `service_role`.

### 6.3 Standar Keamanan Otentikasi (`supabase/config.toml`)
- Mengubah `minimum_password_length` dari `6` menjadi `8` karakter sesuai standar keamanan Google Play Store dan OWASP.

### 6.4 Edge Function `delete-account` (`supabase/functions/delete-account/index.ts`)
- Menerapkan fungsi Deno/Supabase Edge Function untuk memproses permintaan hapus akun secara mandiri:
  1. Memvalidasi token JWT pengguna aktif.
  2. Memanggil RPC `hapus_semua_data_pengguna` untuk membersihkan basis data.
  3. Memanggil `auth.admin.deleteUser(user.id)` menggunakan service role key.
