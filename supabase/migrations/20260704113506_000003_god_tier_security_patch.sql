BEGIN;

-- ============================================================
-- 1. FIX PERFORMA: RLS INITPLAN (CEGAH N+1 QUERY EVALUATION)
-- ============================================================
DROP POLICY IF EXISTS profil_pengguna_all_own ON public.profil_pengguna;
DROP POLICY IF EXISTS dompet_all_own ON public.dompet;
DROP POLICY IF EXISTS kategori_pemasukan_all_own ON public.kategori_pemasukan;
DROP POLICY IF EXISTS kategori_pengeluaran_all_own ON public.kategori_pengeluaran;
DROP POLICY IF EXISTS pemasukan_all_own ON public.pemasukan;
DROP POLICY IF EXISTS pengeluaran_all_own ON public.pengeluaran;
DROP POLICY IF EXISTS pengingat_tagihan_all_own ON public.pengingat_tagihan;
DROP POLICY IF EXISTS transfer_dompet_all_own ON public.transfer_dompet;
DROP POLICY IF EXISTS anggaran_bulanan_all_own ON public.anggaran_bulanan;
DROP POLICY IF EXISTS koreksi_saldo_dompet_all_own ON public.koreksi_saldo_dompet;

-- Gunakan Scalar Subquery (SELECT auth.uid()) agar dievaluasi sekali di awal query (InitPlan)
CREATE POLICY profil_pengguna_all_own ON public.profil_pengguna FOR ALL USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY dompet_all_own ON public.dompet FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY kategori_pemasukan_all_own ON public.kategori_pemasukan FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY kategori_pengeluaran_all_own ON public.kategori_pengeluaran FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY pemasukan_all_own ON public.pemasukan FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY pengeluaran_all_own ON public.pengeluaran FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY pengingat_tagihan_all_own ON public.pengingat_tagihan FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY transfer_dompet_all_own ON public.transfer_dompet FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY anggaran_bulanan_all_own ON public.anggaran_bulanan FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));
CREATE POLICY koreksi_saldo_dompet_all_own ON public.koreksi_saldo_dompet FOR ALL USING (pengguna_id = (SELECT auth.uid())) WITH CHECK (pengguna_id = (SELECT auth.uid()));

-- ============================================================
-- 2. FIX PERFORMA: COMPOSITE INDEX UNTUK FOREIGN KEY
-- ============================================================
-- Indeks harus persis mencocokkan susunan Foreign Key untuk mencegah Deadlock/Full Table Scan
CREATE INDEX IF NOT EXISTS idx_anggaran_fk_kategori ON public.anggaran_bulanan (pengguna_id, kategori_id_lokal);
CREATE INDEX IF NOT EXISTS idx_koreksi_fk_dompet_id ON public.koreksi_saldo_dompet (pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pemasukan_fk_dompet_id ON public.pemasukan (pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pemasukan_fk_kategori_id ON public.pemasukan (pengguna_id, kategori_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_fk_dompet_id ON public.pengeluaran (pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_fk_kategori_id ON public.pengeluaran (pengguna_id, kategori_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pengingat_fk_dompet_id ON public.pengingat_tagihan (pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_transfer_fk_sumber_id ON public.transfer_dompet (pengguna_id, dompet_sumber_id_lokal);
CREATE INDEX IF NOT EXISTS idx_transfer_fk_tujuan_id ON public.transfer_dompet (pengguna_id, dompet_tujuan_id_lokal);

-- Hapus unused index sesuai saran Performance Advisor
DROP INDEX IF EXISTS public.idx_koreksi_saldo_dompet_pengguna_created;

-- ============================================================
-- 3. FIX KEAMANAN: TRIGGER SEARCH PATH & LOGIKA TERISOLASI
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '' -- Mengunci path dari manipulasi eksternal
AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = timezone('utc', now());
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. FIX KEAMANAN & SINKRONISASI: RPC SECURITY INVOKER & JSON SAFE
-- ============================================================
DROP FUNCTION IF EXISTS public.sync_bundle(jsonb);
CREATE OR REPLACE FUNCTION public.sync_bundle(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER -- Beralih ke INVOKER agar patuh pada RLS dan menyingkirkan warning Security Definer
SET search_path = '' -- Mengunci environment
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

  -- Gunakan jsonb_typeof untuk memastikan payload bukan NULL atau tipe salah
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

  IF jsonb_typeof(payload->'dompet') = 'array' THEN
    INSERT INTO public.dompet (
      pengguna_id, id_lokal, nama, jenis, tipe_dompet,
      saldo_saat_ini, is_default, is_aktif, sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id, d->>'id_lokal', d->>'nama', d->>'jenis', d->>'tipe_dompet',
      (d->>'saldo_saat_ini')::numeric, (d->>'is_default')::boolean, (d->>'is_aktif')::boolean,
      d->>'sumber_data', (d->>'created_at')::timestamptz, (d->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'dompet') AS d
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama, jenis = EXCLUDED.jenis, tipe_dompet = EXCLUDED.tipe_dompet,
      saldo_saat_ini = EXCLUDED.saldo_saat_ini, is_default = EXCLUDED.is_default,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.dompet.updated_at <= LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

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

  IF jsonb_typeof(payload->'anggaranBulanan') = 'array' THEN
    -- SOFT DELETE untuk Split-Brain
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

END;
$$;

COMMIT;