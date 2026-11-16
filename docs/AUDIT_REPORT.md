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

### 6.2 Penghapusan Akun Play Store & Data Berjenjang (`20261106100000_000006_delete_account_rpc.sql` & `20261116100000_000008_security_and_sync_fixes.sql`)
- Membuat fungsi database RPC `public.hapus_semua_data_pengguna(target_user_id UUID)` dengan mode `SECURITY DEFINER` dan `SET search_path = ''`.
- Menghapus data secara berjenjang mengikuti urutan aman Foreign Key (*transaksi → transfer → koreksi → pengingat → anggaran → kategori → dompet → profil*) untuk mencegah pelanggaran `ON DELETE RESTRICT` saat user dihapus dari `auth.users`.
- Pada migrasi `000008`, hak eksekusi fungsi ini dikunci ketat hanya untuk `service_role` (`REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`) dan menghapus pengecekan `auth.uid()` yang sebelumnya meloloskan `NULL`.

### 6.2b Hardening Lanjutan Sinkronisasi & Index Cloud (`20261116090000_000007_prune_unused_query_indexes.sql` & `20261116100000_000008_security_and_sync_fixes.sql`)
- Menghapus 8 index kueri cloud-side yang tidak digunakan (`000007`) serta 4 index FK duplikat warisan `000001` (`idx_transfer_fk_sumber`, `idx_transfer_fk_tujuan`, `idx_koreksi_fk_dompet`, `idx_pengingat_fk_dompet` di `000008`).
- Memperbarui partial unique index `idx_anggaran_aktif_unik` agar memakai `COALESCE(kategori_id_lokal, '__semua__')` setelah menonaktifkan duplikat aktif.
- Memperbarui `public.sync_bundle(jsonb)` agar perbandingan LWW memakai strict `<` (`WHERE public.<tabel>.updated_at < LEAST(...)`) sehingga pengiriman ulang baris berstempel waktu sama tidak memicu *timestamp bump loop*, serta membatasi deaktivasi anggaran hanya pada item payload dengan `is_aktif = true`.

### 6.3 Standar Keamanan Otentikasi (`supabase/config.toml`)
- Mengubah `minimum_password_length` dari `6` menjadi `8` karakter sesuai standar keamanan Google Play Store dan OWASP.
- **Peringatan `config.toml`**: Konfigurasi lokal di `supabase/config.toml` memuat `enable_confirmations = false` yang berbeda dari lingkungan produksi. Jangan menjalankan `supabase config push` tanpa memeriksa diff agar pengaturan verifikasi email produksi tidak tertimpa.

### 6.4 Edge Function `delete-account` (`supabase/functions/delete-account/index.ts`)
- Menerapkan fungsi Deno/Supabase Edge Function untuk memproses permintaan hapus akun secara mandiri:
  1. Memvalidasi token JWT pengguna aktif.
  2. Memanggil RPC `hapus_semua_data_pengguna` untuk membersihkan basis data.
  3. Memanggil `auth.admin.deleteUser(user.id)` menggunakan service role key (variabel `SUPABASE_SERVICE_ROLE_KEY` otomatis di-inject oleh runtime Supabase; prefix `SUPABASE_` bersifat reserved dan tidak diset via `supabase secrets set`).

---

## 7. Rangkuman Perbaikan & Bukti Verifikasi Berkas

Berikut adalah matriks perbaikan yang telah dituntaskan di seluruh tahapan:

| Fase | Area / Isu | Berkas Terkait | Status & Bukti |
|---|---|---|---|
| **Fase 0** | Typo kolom `dompet_sumber_id` & Error Boundary | `mobile/src/database/repositories/dompet.repository.ts`<br>`mobile/src/database/migrations.ts`<br>`mobile/src/app/_layout.tsx`<br>`mobile/src/providers/LocalDatabaseProvider.tsx` | Selesai. Logcat membuktikan SQLite exception tereliminasi. Error boundary informatif & Layar Pemulihan DB aktif. |
| **Fase 1** | Migrasi transaksi per versi, timeout session, EAS | `mobile/src/database/migrations.ts`<br>`mobile/src/providers/AuthProvider.tsx`<br>`mobile/src/lib/supabase.ts`<br>`mobile/app.json`<br>`mobile/eas.json`<br>`mobile/tests/migration_simulation.test.mjs` | Selesai. Helper `columnExists` aktif, test migrasi 6/6 lolos, AppState auto-refresh berjalan, allowBackup false. |
| **Fase 2** | Bug logika sinkronisasi, navigasi, dan anggaran | `mobile/src/app/(auth)/reset-password.tsx`<br>`mobile/src/app/(auth)/verify-email.tsx`<br>`mobile/src/app/(auth)/_layout.tsx`<br>`mobile/src/app/(protected)/(tabs)/dashboard.tsx`<br>`mobile/src/app/(protected)/(tabs)/wallet.tsx`<br>`mobile/src/components/ui/AppScreen.tsx`<br>`mobile/src/database/repositories/wallet.repository.ts`<br>`mobile/src/providers/CloudAutoSyncProvider.tsx`<br>`mobile/src/app/(protected)/riwayat-transaksi.tsx`<br>`mobile/src/services/sync/engine.ts` | Selesai. Cooldown OTP 60 detik, isolasi password recovery, silent offline sync, search input tanpa blur/unmount, batch push chunking. |
| **Fase 3** | Cleaning & modernisasi modul | `mobile/src/database/helpers.ts`<br>`mobile/src/utils/formatters.ts`<br>`mobile/src/services/laporan_export.service.ts` | Selesai. UUID RFC4122 via `crypto.randomUUID()`, singleton formatters rupiah/persen/tanggal, rute navigasi objek resmi. |
| **Fase 4** | Migrasi Supabase & Hardening RPC | `supabase/migrations/20261106090000_000005_sync_core_hardening.sql`<br>`supabase/migrations/20261106100000_000006_delete_account_rpc.sql`<br>`supabase/config.toml`<br>`supabase/functions/delete-account/index.ts` | Selesai. Server timestamp trigger, sync_bundle LWW + koreksi saldo, hapus akun berjenjang FK-safe, password min 8 karakter. |
| **Fase 5** | Arsitektur 13 Pilar & Laporan Audit | `docs/ARCHITECTURE.md`<br>`docs/AUDIT_REPORT.md`<br>`docs/DEBUGGING.md` | Selesai. Dokumentasi arsitektural lengkap, panduan debugging adb, dan instruksi manual pemilik repo. |

---

## 8. Catatan Temuan yang Dilewati / Dialihkan (Skipped Items Rationale)

1. **Uninstall dependensi `expo-symbols`**:
   - *Alasan*: Berkas pustaka inti Expo Router (`node_modules/expo-router/build/native-tabs/...`) mengimpor tipe data dari `expo-symbols`. Penghapusan paket ini akan memicu kegagalan kompilasi TypeScript pada level expo-router. Paket dipertahankan sesuai aturan aman: "JANGAN hapus peer dependency expo-router".
2. **Paket `xlsx`**:
   - *Alasan*: Tidak ditemukan pada berkas `mobile/package.json` yang aktif (telah dibersihkan sebelumnya; ekspor murni menggunakan CSV/Excel teks dan PDF via `expo-print`).
3. **Penyimpanan sesi terenkripsi LargeSecureStore**:
   - *Alasan*: Supabase Auth Storage adapter saat ini memanfaatkan local storage yang diisolasi oleh sandbox OS Android (`allowBackup: false` mencegah berkas diekstraksi lewat backup ADB). Penggantian ke SecureStore custom dengan chunking berpotensi memutuskan sesi pengguna aktif yang sudah login di versi sebelumnya tanpa adanya migrasi multi-tahap.

---

## 9. Panduan Tindakan Manual untuk Pemilik Repositori (Manual Actions Required)

Pengaturan berikut wajib dilakukan secara manual oleh pemilik repositori pada dashboard EAS dan Supabase Console, karena tidak dapat dieksekusi murni melalui kode git:

### 9.1 Variabel Lingkungan di EAS Build Dashboard
Pada dashboard **Expo Application Services (EAS)**:
1. Buka project **dompetku-v2** > **Environment Variables**.
2. Tambahkan variabel untuk setiap environment (`preview`, `production`):
   - `EXPO_PUBLIC_SUPABASE_URL`: URL project Supabase kamu (contoh: `https://xxxx.supabase.co`).
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Kunci anon/publishable Supabase kamu (contoh: `eyJhbGciOi...`).
3. Pastikan tidak ada spasi atau tanda kutip tambahan saat memasukkan nilai.

### 9.2 Konfigurasi Dashboard Supabase Production
Pada **Supabase Dashboard** (`https://supabase.com/dashboard/project/<project-ref>`):
1. **Custom SMTP (Wajib untuk Produksi)**:
   - Masuk ke menu **Project Settings** > **Authentication** > **SMTP Settings**.
   - Aktifkan **Enable Custom SMTP** dan gunakan penyedia terpercaya seperti Resend, SendGrid, atau Mailgun.
   - *Peringatan*: Layanan bawaan Supabase dibatasi hanya 3 email per jam, yang dapat menyebabkan kegagalan penerimaan OTP pada pengguna sungguhan.
2. **Template Email OTP & Reset Password**:
   - Masuk ke **Authentication** > **Email Templates** > **Confirm signup**, **Magic Link**, dan **Reset Password**.
   - Pastikan seluruh template tersebut menyertakan tag token 6 digit `{{ .Token }}` (khususnya **Reset Password**, sebab `reset-password.tsx` memverifikasi kode melalui `verifyOtp` dengan tipe `recovery`):
     ```html
     <h2>Kode Verifikasi DompetKu:</h2>
     <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
     ```
3. **Leaked Password Protection & Panjang Minimum Sandi**:
   - Pada menu **Authentication** > **Providers** > **Email** (atau **Policies**), pastikan panjang minimum password diatur ke **8 karakter**.
   - Aktifkan toggle **Leaked Password Protection** di dashboard Supabase (fitur khusus paket **Pro ke atas**, tidak dikelola dari kode atau `config.toml`).
4. **Rate Limiting**:
   - Pada menu **Authentication** > **Rate Limits**, pastikan batas *Email OTP* disesuaikan dengan volume pengguna yang diharapkan.

### 9.3 Penerapan Migrasi & Edge Function ke Server Remote
Jalankan perintah berikut menggunakan terminal di lingkungan pemilik proyek (jangan jalankan `supabase config push` tanpa memeriksa diff karena `enable_confirmations = false` di `config.toml` lokal berbeda dari produksi):
```bash
# 1. Login ke Supabase CLI
npx supabase login

# 2. Tautkan dengan project remote Supabase kamu
npx supabase link --project-ref <your-project-ref>

# 3. Terapkan migrasi skema dan RPC terbaru (hingga 000008)
npx supabase db push

# 4. Deploy Edge Function hapus akun (SUPABASE_SERVICE_ROLE_KEY auto-injected oleh Supabase)
npx supabase functions deploy delete-account
```

---

## 10. Checklist Pengujian Manual Komprehensif (Manual Test Scenarios)

Berikut adalah skenario uji yang dapat dijalankan pada perangkat Android fisik untuk memverifikasi keandalan sistem:

- [ ] **Skenario 1: Isolasi Multi-Akun & Pencegahan Bocor Data**
  1. Masuk ke Akun A, catat 2 transaksi pemasukan dan 1 dompet baru.
  2. Buka tab Profil > Keluar > Pilih "Keluar, data tetap di HP".
  3. Masuk dengan Akun B pada perangkat yang sama.
  4. Verifikasi: Dialog "Data di HP ini milik akun lain" muncul dengan pilihan "Hapus data di HP lalu muat data akun ini" atau "Batal". Data Akun A tidak tercampur ke Akun B.
- [ ] **Skenario 2: Sinkronisasi Offline & Rekonsiliasi Saldo**
  1. Aktifkan Mode Pesawat (*Airplane Mode*).
  2. Catat 1 pengeluaran Rp 50.000 dan 1 koreksi saldo.
  3. Matikan Mode Pesawat.
  4. Buka Profil > Tekan "Sinkronkan Data".
  5. Verifikasi: Data berhasil didorong ke Supabase, cursor server tersimpan, dan saldo terhitung akurat.
- [ ] **Skenario 3: Anggaran Bulanan & Salin Bulan Lalu**
  1. Buat anggaran kategori "Makanan & Minuman" untuk bulan berjalan.
  2. Coba buat anggaran baru dengan kategori yang sama di bulan yang sama.
  3. Verifikasi: Nilai ter-update tanpa membuat duplikasi baris.
  4. Buka bulan berikutnya di mana belum ada anggaran: verifikasi banner "Salin anggaran bulan lalu" muncul dan dapat disalin dalam 1 klik.
- [ ] **Skenario 4: Penyelesaian Pengingat Tanpa Nominal**
  1. Buat pengingat tagihan dengan nominal Rp 0 (opsional).
  2. Buka daftar pengingat > Tekan "Tandai selesai".
  3. Verifikasi: Pengingat berstatus selesai tanpa memaksa pembuatan transaksi pengeluaran.
- [ ] **Skenario 5: Ekspor Laporan Rentang Tanggal**
  1. Masuk ke tab Insight > Pilih rentang tanggal kustom (misal: tanggal 1 s.d. 15).
  2. Tekan tombol Ekspor CSV atau PDF.
  3. Verifikasi: Dokumen yang diunduh memuat transaksi dalam rentang tanggal tersebut, bukan hanya bulan aktif.
- [ ] **Skenario 6: Hapus Akun & Data (Play Store Compliance)**
  1. Buka tab Profil > Menu Akun > Tekan "Hapus akun & data".
  2. Konfirmasi dialog peringatan 2 langkah.
  3. Verifikasi: Seluruh data cloud terhapus dari tabel Supabase, sesi lokal ditutup, dan aplikasi kembali ke tampilan tamu bersih.

---

## 11. Audit Linting & Resolusi Peringatan React Compiler (Pasca-Upgrade Expo SDK 58)

Setelah upgrade ke Expo SDK 58 (React Native 0.88.1 dan aturan React Compiler / `eslint-config-expo`), dilakukan audit menyeluruh pada linter. Jumlah peringatan berhasil ditekan dari **23 peringatan menjadi 8 peringatan (0 error)** pada hasil verifikasi `npm run lint` terkini.

### 11.1 Peringatan yang Berhasil Diselesaikan (15 Item)
1. **`mobile/src/app/(protected)/(tabs)/profil.tsx` (3 peringatan)**:
   - Aturan: `react-hooks/preserve-manual-memoization`.
   - Solusi: Menghapus pembungkus manual `useMemo` pada `namaPengguna` dan `backupDescription`. React Compiler secara otomatis mengoptimalkan kalkulasi ini tanpa risiko dependensi inferred yang tidak selaras.
   - Dampak: Aturan `"react-hooks/preserve-manual-memoization"` di `mobile/eslint.config.js` kini aman dipromosikan kembali ke level **`"error"`**.
2. **`mobile/src/providers/CloudAutoSyncProvider.tsx` (1 peringatan)**:
   - Aturan: `react-hooks/set-state-in-effect`.
   - Solusi: Menggunakan pola resmi React *"adjust state during render"* untuk transisi `userId` (saat logout / pergantian akun) serta menurunkan visibilitas indikator secara reaktif (`shouldShowIndicator = Boolean(userId) && ...`). Efek samping hanya membersihkan timer dan ref, mencegah masalah cascading render dan memastikan pesan sinkronisasi lama tidak berkedip saat login kembali.
3. **`mobile/src/lib/notifications.ts` (4 peringatan)**:
   - Aturan: `import/namespace`.
   - Solusi: Mengganti pemanggilan namespace `Notifications.AndroidImportance` dan `Notifications.IosAuthorizationStatus` menjadi impor bernama langsung (`import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications"`), menghilangkan kegagalan resolusi AST linter.
4. **`mobile/src/components/ui/AppScreen.tsx` (1 peringatan)**:
   - Aturan: `react-hooks/set-state-in-effect`.
   - Solusi: Menghapus pemanggilan `setKeyboardHeight(0)` sinkron dalam efek ketika `shouldUseKeyboardAwareScroll` bernilai `false`, karena padding bawah layar sudah otomatis mengabaikan keyboard height saat flag dinonaktifkan.
5. **`mobile/src/providers/AuthProvider.tsx` (1 peringatan)**:
   - Aturan: `react-hooks/set-state-in-effect`.
   - Solusi: Menginisialisasi nilai awal state `isRemoteReady` dengan `!isSupabaseConfigured || !supabase` secara deklaratif, sehingga tidak lagi memerlukan pemanggilan `setIsRemoteReady(true)` di dalam efek saat berjalan dalam mode offline / tanpa Supabase.
6. **Pembersihan lanjutan (`wallet.tsx` 4 peringatan & `transaksi.tsx` `exhaustive-deps` 1 peringatan)**:
   - Pada pembaruan berikutnya, 4 peringatan `react-hooks/set-state-in-effect` di `wallet.tsx` sudah terselesaikan dan `transaksi.tsx` baris 445 telah diberi anotasi `eslint-disable-next-line react-hooks/exhaustive-deps` yang disengaja.

### 11.2 Katalog 8 Peringatan yang Dipertahankan & Rasional Teknis
Sisa 8 peringatan (`react-hooks/set-state-in-effect`) dipertahankan pada status `"warn"` demi menjaga stabilitas fungsional dan mencegah regresi pada alur transaksi utama:
1. **Fallback Pemilihan Default Form & Sinkronisasi Route (`react-hooks/set-state-in-effect` - 8 item)**:
   - `mobile/src/app/(protected)/(tabs)/transaksi.tsx` (baris 450, 457, 466, 475)
   - `mobile/src/app/(protected)/edit-transaksi.tsx` (baris 268, 277)
   - `mobile/src/app/(protected)/pengingat.tsx` (baris 244, 253)
   - *Rasional*: Form-form ini menyinkronkan jenis transaksi dari parameter rute (`syncJenisTransaksiFromRoute`), mereset konfirmasi dana darurat saat dompet berubah, serta menyinkronkan opsi pemilihan dompet (`selectedDompetId`/`selectedPaymentDompetId`) dan kategori default (`selectedKategoriId`) begitu data asynchronous dari SQLite selesai dimuat. Mengubah arsitektur ini ke pola komputasi render memerlukan penulisan ulang mekanisme input formulir yang sangat krusial bagi kenyamanan pengguna warung/UMKM.

---

## 12. Catatan Kerentanan Dependensi

Berdasarkan audit di folder `mobile/` (`expo@58.0.25`):
- Kerentanan *high* pada `brace-expansion` telah diatasi melalui pembaruan lockfile dari `1.1.13` menjadi `1.1.22`.
- Output `npm audit` terkini menunjukkan **8 moderate, 0 high**, dan `npm audit --omit=dev` menunjukkan **3 moderate** (`minimatch` → `@expo/fingerprint` → `expo`).
- Seluruh temuan berasal dari satu advisory yang sama: `minimatch@10.2.6` (**`GHSA-g3hv-75wg-m249`**, perbaikan tersedia di `>=11.0.1`).

| Paket Terdampak | Severity | Versi Terpasang | Jalur Dependensi (`npm ls`) | Klasifikasi | Alasan Dibiarkan |
|---|---|---|---|---|---|
| `minimatch` | moderate | `10.2.6` | `expo` → `@expo/fingerprint` (`^10.2.6`) & `eslint-config-expo` → `@typescript-eslint/typescript-estree` (`^10.2.2`) | **TOOLING** | Perbaikan ke `>=11.0.1` adalah *major bump* di luar rentang semver induknya. |
| `@expo/fingerprint` | moderate | `0.21.10` | `expo@58.0.25` → `@expo/fingerprint` | **TOOLING** | Alat fingerprinting build/dev (tidak ikut bundle APK); induknya masih mensyaratkan `minimatch ^10.2.6`. |
| `expo` | moderate | `58.0.25` | Direct dependency (`expo@^58.0.25`) via `@expo/fingerprint` | **TOOLING** | Advisory hanya lewat `@expo/fingerprint`; `npm audit fix --force` menyarankan downgrade merusak ke `expo@52.0.49`. |
| `@typescript-eslint/typescript-estree`, `@typescript-eslint/parser`, `@typescript-eslint/utils`, `@typescript-eslint/type-utils`, `@typescript-eslint/eslint-plugin` (5 paket) | moderate | `8.72.2` | `eslint-config-expo@58.0.4` → `@typescript-eslint/*` | **TOOLING** | Alat linter dev/CI saja; rilis terbaru `@typescript-eslint/typescript-estree` masih mensyaratkan `minimatch ^10.2.2`. |

**Tindak lanjut**:
- Jangan menjalankan `npm audit fix --force` atau memberi `overrides` paksa ke `minimatch@11` pada paket inti Expo/ESLint.
- Cek ulang `npm audit` dan `npm audit --omit=dev` setiap kali ada rilis patch **Expo SDK 58** (atau pembaruan `@expo/fingerprint` / `@typescript-eslint/*`) yang telah mengadopsi `minimatch ^11.0.1`.

