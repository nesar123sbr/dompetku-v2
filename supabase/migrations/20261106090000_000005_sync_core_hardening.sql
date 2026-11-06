BEGIN;

-- ============================================================
-- 1. FUNGSI TRIGGER SERVER_UPDATED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_server_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.server_updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. KOLOM DAN INDEX SERVER_UPDATED_AT PADA 9 TABEL SINKRONISASI
-- ============================================================

-- 1. dompet (+ saldo_awal)
ALTER TABLE public.dompet ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE public.dompet ADD COLUMN IF NOT EXISTS saldo_awal numeric(18,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_dompet_server_updated_at ON public.dompet (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_dompet ON public.dompet;
CREATE TRIGGER trg_set_server_updated_at_dompet BEFORE INSERT OR UPDATE ON public.dompet
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 2. kategori_pemasukan
ALTER TABLE public.kategori_pemasukan ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_kategori_pemasukan_server_updated_at ON public.kategori_pemasukan (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_kategori_pemasukan ON public.kategori_pemasukan;
CREATE TRIGGER trg_set_server_updated_at_kategori_pemasukan BEFORE INSERT OR UPDATE ON public.kategori_pemasukan
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 3. kategori_pengeluaran
ALTER TABLE public.kategori_pengeluaran ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_kategori_pengeluaran_server_updated_at ON public.kategori_pengeluaran (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_kategori_pengeluaran ON public.kategori_pengeluaran;
CREATE TRIGGER trg_set_server_updated_at_kategori_pengeluaran BEFORE INSERT OR UPDATE ON public.kategori_pengeluaran
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 4. pemasukan
ALTER TABLE public.pemasukan ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pemasukan_server_updated_at ON public.pemasukan (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_pemasukan ON public.pemasukan;
CREATE TRIGGER trg_set_server_updated_at_pemasukan BEFORE INSERT OR UPDATE ON public.pemasukan
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 5. pengeluaran
ALTER TABLE public.pengeluaran ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pengeluaran_server_updated_at ON public.pengeluaran (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_pengeluaran ON public.pengeluaran;
CREATE TRIGGER trg_set_server_updated_at_pengeluaran BEFORE INSERT OR UPDATE ON public.pengeluaran
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 6. pengingat_tagihan
ALTER TABLE public.pengingat_tagihan ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pengingat_tagihan_server_updated_at ON public.pengingat_tagihan (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_pengingat_tagihan ON public.pengingat_tagihan;
CREATE TRIGGER trg_set_server_updated_at_pengingat_tagihan BEFORE INSERT OR UPDATE ON public.pengingat_tagihan
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 7. transfer_dompet
ALTER TABLE public.transfer_dompet ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_transfer_dompet_server_updated_at ON public.transfer_dompet (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_transfer_dompet ON public.transfer_dompet;
CREATE TRIGGER trg_set_server_updated_at_transfer_dompet BEFORE INSERT OR UPDATE ON public.transfer_dompet
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 8. anggaran_bulanan
ALTER TABLE public.anggaran_bulanan ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_server_updated_at ON public.anggaran_bulanan (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_anggaran_bulanan ON public.anggaran_bulanan;
CREATE TRIGGER trg_set_server_updated_at_anggaran_bulanan BEFORE INSERT OR UPDATE ON public.anggaran_bulanan
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 9. koreksi_saldo_dompet
ALTER TABLE public.koreksi_saldo_dompet ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_koreksi_saldo_dompet_server_updated_at ON public.koreksi_saldo_dompet (pengguna_id, server_updated_at);
DROP TRIGGER IF EXISTS trg_set_server_updated_at_koreksi_saldo_dompet ON public.koreksi_saldo_dompet;
CREATE TRIGGER trg_set_server_updated_at_koreksi_saldo_dompet BEFORE INSERT OR UPDATE ON public.koreksi_saldo_dompet
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- ============================================================
-- 3. HAPUS INDEKS DUPLIKAT DARI MIGRASI AWAL
-- ============================================================
DROP INDEX IF EXISTS public.idx_pemasukan_fk_dompet;
DROP INDEX IF EXISTS public.idx_pemasukan_fk_kategori;
DROP INDEX IF EXISTS public.idx_pengeluaran_fk_dompet;
DROP INDEX IF EXISTS public.idx_pengeluaran_fk_kategori;
DROP INDEX IF EXISTS public.idx_transfer_dompet_fk_asal;
DROP INDEX IF EXISTS public.idx_transfer_dompet_fk_tujuan;
DROP INDEX IF EXISTS public.idx_anggaran_bulanan_fk_kategori;
DROP INDEX IF EXISTS public.idx_pengingat_tagihan_fk_dompet;
DROP INDEX IF EXISTS public.idx_koreksi_saldo_dompet_fk_dompet;

-- ============================================================
-- 4. PEMBARUAN RPC SYNC_BUNDLE (SALDO_AWAL & KOREKSI_SALDO_DOMPET)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_bundle(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak. User tidak terautentikasi.';
  END IF;

  IF jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Payload harus berupa objek JSON.';
  END IF;

  -- 1. Profil Pengguna
  IF jsonb_typeof(payload->'profilPengguna') = 'object' THEN
    INSERT INTO public.profil_pengguna (id, email, nama_lengkap)
    SELECT
      v_user_id,
      payload->'profilPengguna'->>'email',
      payload->'profilPengguna'->>'nama_lengkap'
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      nama_lengkap = EXCLUDED.nama_lengkap,
      updated_at = timezone('utc', now());
  END IF;

  -- 2. Dompet
  IF jsonb_typeof(payload->'dompet') = 'array' THEN
    INSERT INTO public.dompet (
      pengguna_id, id_lokal, nama, jenis, tipe_dompet,
      saldo_saat_ini, saldo_awal, is_default, is_aktif, sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id, d->>'id_lokal', d->>'nama', d->>'jenis', d->>'tipe_dompet',
      (d->>'saldo_saat_ini')::numeric, COALESCE((d->>'saldo_awal')::numeric, 0),
      (d->>'is_default')::boolean, (d->>'is_aktif')::boolean,
      d->>'sumber_data', (d->>'created_at')::timestamptz, (d->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'dompet') AS d
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama,
      jenis = EXCLUDED.jenis,
      tipe_dompet = EXCLUDED.tipe_dompet,
      saldo_saat_ini = EXCLUDED.saldo_saat_ini,
      saldo_awal = EXCLUDED.saldo_awal,
      is_default = EXCLUDED.is_default,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.dompet.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 3. Kategori Pemasukan
  IF jsonb_typeof(payload->'kategoriPemasukan') = 'array' THEN
    INSERT INTO public.kategori_pemasukan (
      pengguna_id, id_lokal, nama, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id, kp->>'id_lokal', kp->>'nama', kp->>'ikon', kp->>'warna', (kp->>'urutan')::integer,
      (kp->>'is_bawaan')::boolean, (kp->>'is_aktif')::boolean, (kp->>'created_at')::timestamptz, (kp->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'kategoriPemasukan') AS kp
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama, ikon = EXCLUDED.ikon, warna = EXCLUDED.warna, urutan = EXCLUDED.urutan,
      is_bawaan = EXCLUDED.is_bawaan, is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.kategori_pemasukan.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 4. Kategori Pengeluaran
  IF jsonb_typeof(payload->'kategoriPengeluaran') = 'array' THEN
    INSERT INTO public.kategori_pengeluaran (
      pengguna_id, id_lokal, nama, kelompok, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id, kg->>'id_lokal', kg->>'nama', kg->>'kelompok', kg->>'ikon', kg->>'warna',
      (kg->>'urutan')::integer, (kg->>'is_bawaan')::boolean, (kg->>'is_aktif')::boolean,
      (kg->>'created_at')::timestamptz, (kg->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'kategoriPengeluaran') AS kg
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama, kelompok = EXCLUDED.kelompok, ikon = EXCLUDED.ikon, warna = EXCLUDED.warna,
      urutan = EXCLUDED.urutan, is_bawaan = EXCLUDED.is_bawaan, is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.kategori_pengeluaran.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 5. Pemasukan
  IF jsonb_typeof(payload->'pemasukan') = 'array' THEN
    INSERT INTO public.pemasukan (
      pengguna_id, id_lokal, dompet_id_lokal, kategori_id_lokal, judul, catatan, jumlah,
      tanggal_transaksi, sumber_data, is_deleted, created_at, updated_at
    )
    SELECT
      v_user_id, p->>'id_lokal', p->>'dompet_id_lokal', p->>'kategori_id_lokal', p->>'judul',
      p->>'catatan', (p->>'jumlah')::numeric, (p->>'tanggal_transaksi')::date, p->>'sumber_data',
      (p->>'is_deleted')::boolean, (p->>'created_at')::timestamptz, (p->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pemasukan') AS p
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_id_lokal = EXCLUDED.dompet_id_lokal, kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      judul = EXCLUDED.judul, catatan = EXCLUDED.catatan, jumlah = EXCLUDED.jumlah,
      tanggal_transaksi = EXCLUDED.tanggal_transaksi, sumber_data = EXCLUDED.sumber_data,
      is_deleted = EXCLUDED.is_deleted,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.pemasukan.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 6. Pengeluaran
  IF jsonb_typeof(payload->'pengeluaran') = 'array' THEN
    INSERT INTO public.pengeluaran (
      pengguna_id, id_lokal, dompet_id_lokal, kategori_id_lokal, judul, catatan, jumlah,
      tanggal_transaksi, pakai_dana_darurat, sumber_data, is_deleted, created_at, updated_at
    )
    SELECT
      v_user_id, g->>'id_lokal', g->>'dompet_id_lokal', g->>'kategori_id_lokal', g->>'judul',
      g->>'catatan', (g->>'jumlah')::numeric, (g->>'tanggal_transaksi')::date,
      (g->>'pakai_dana_darurat')::boolean, g->>'sumber_data', (g->>'is_deleted')::boolean,
      (g->>'created_at')::timestamptz, (g->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pengeluaran') AS g
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_id_lokal = EXCLUDED.dompet_id_lokal, kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      judul = EXCLUDED.judul, catatan = EXCLUDED.catatan, jumlah = EXCLUDED.jumlah,
      tanggal_transaksi = EXCLUDED.tanggal_transaksi, pakai_dana_darurat = EXCLUDED.pakai_dana_darurat,
      sumber_data = EXCLUDED.sumber_data, is_deleted = EXCLUDED.is_deleted,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.pengeluaran.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 7. Pengingat Tagihan
  IF jsonb_typeof(payload->'pengingatTagihan') = 'array' THEN
    INSERT INTO public.pengingat_tagihan (
      pengguna_id, id_lokal, judul, catatan, nominal, dompet_id_lokal,
      tanggal_jatuh_tempo, jam_pengingat, status, pengulangan, notifikasi_diaktifkan,
      sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id, pt->>'id_lokal', pt->>'judul', pt->>'catatan', (pt->>'nominal')::numeric,
      pt->>'dompet_id_lokal', (pt->>'tanggal_jatuh_tempo')::date, (pt->>'jam_pengingat')::time,
      pt->>'status', pt->>'pengulangan', (pt->>'notifikasi_diaktifkan')::boolean,
      pt->>'sumber_data', (pt->>'created_at')::timestamptz, (pt->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pengingatTagihan') AS pt
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      judul = EXCLUDED.judul, catatan = EXCLUDED.catatan, nominal = EXCLUDED.nominal,
      dompet_id_lokal = EXCLUDED.dompet_id_lokal, tanggal_jatuh_tempo = EXCLUDED.tanggal_jatuh_tempo,
      jam_pengingat = EXCLUDED.jam_pengingat, status = EXCLUDED.status,
      pengulangan = EXCLUDED.pengulangan, notifikasi_diaktifkan = EXCLUDED.notifikasi_diaktifkan,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.pengingat_tagihan.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 8. Transfer Dompet
  IF jsonb_typeof(payload->'transferDompet') = 'array' THEN
    INSERT INTO public.transfer_dompet (
      pengguna_id, id_lokal, dompet_sumber_id_lokal, dompet_tujuan_id_lokal,
      jumlah, tanggal_transfer, catatan, sumber_dana_darurat, created_at, updated_at
    )
    SELECT
      v_user_id, td->>'id_lokal', td->>'dompet_sumber_id_lokal', td->>'dompet_tujuan_id_lokal',
      (td->>'jumlah')::numeric, (td->>'tanggal_transfer')::date, td->>'catatan',
      (td->>'sumber_dana_darurat')::boolean, (td->>'created_at')::timestamptz, (td->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'transferDompet') AS td
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_sumber_id_lokal = EXCLUDED.dompet_sumber_id_lokal, dompet_tujuan_id_lokal = EXCLUDED.dompet_tujuan_id_lokal,
      jumlah = EXCLUDED.jumlah, tanggal_transfer = EXCLUDED.tanggal_transfer,
      catatan = EXCLUDED.catatan, sumber_dana_darurat = EXCLUDED.sumber_dana_darurat,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.transfer_dompet.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 9. Anggaran Bulanan
  IF jsonb_typeof(payload->'anggaranBulanan') = 'array' THEN
    UPDATE public.anggaran_bulanan target
    SET is_aktif = false, updated_at = timezone('utc', now())
    FROM (
      SELECT
        ab->>'id_lokal' AS id_baru,
        ab->>'bulan' AS bln,
        ab->>'kategori_id_lokal' AS kat
      FROM jsonb_array_elements(payload->'anggaranBulanan') AS ab
    ) source
    WHERE target.pengguna_id = v_user_id
      AND target.bulan = source.bln
      AND target.kategori_id_lokal IS NOT DISTINCT FROM source.kat
      AND target.id_lokal <> source.id_baru
      AND target.is_aktif = true;

    INSERT INTO public.anggaran_bulanan (
      pengguna_id, id_lokal, bulan, nama, kategori_id_lokal,
      batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id, ab->>'id_lokal', ab->>'bulan', ab->>'nama', ab->>'kategori_id_lokal',
      (ab->>'batas_nominal')::numeric, (ab->>'ambang_peringatan_persen')::numeric,
      (ab->>'is_aktif')::boolean, (ab->>'created_at')::timestamptz, (ab->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'anggaranBulanan') AS ab
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      bulan = EXCLUDED.bulan, nama = EXCLUDED.nama, kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      batas_nominal = EXCLUDED.batas_nominal, ambang_peringatan_persen = EXCLUDED.ambang_peringatan_persen,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.anggaran_bulanan.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 10. Koreksi Saldo Dompet (Append-Only)
  IF jsonb_typeof(payload->'koreksiSaldoDompet') = 'array' THEN
    INSERT INTO public.koreksi_saldo_dompet (
      pengguna_id, id_lokal, dompet_id_lokal, nama_dompet_snapshot,
      saldo_sebelum, saldo_sesudah, selisih, catatan, sumber, created_at, updated_at
    )
    SELECT
      v_user_id, k->>'id_lokal', k->>'dompet_id_lokal', k->>'nama_dompet_snapshot',
      (k->>'saldo_sebelum')::numeric, (k->>'saldo_sesudah')::numeric, (k->>'selisih')::numeric,
      k->>'catatan', COALESCE(k->>'sumber', 'manual'),
      (k->>'created_at')::timestamptz, (k->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'koreksiSaldoDompet') AS k
    ON CONFLICT (pengguna_id, id_lokal) DO NOTHING;
  END IF;

END;
$$;

-- Hak Akses RPC sync_bundle
REVOKE EXECUTE ON FUNCTION public.sync_bundle(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_bundle(jsonb) TO authenticated;

COMMIT;

