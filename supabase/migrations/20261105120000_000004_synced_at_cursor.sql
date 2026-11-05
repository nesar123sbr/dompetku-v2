BEGIN;

-- ============================================================
-- FUNGSI TRIGGER SET_SYNCED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_synced_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.synced_at := clock_timestamp();
  RETURN NEW;
END;
$$;

-- ============================================================
-- KOLOM, INDEKS, DAN TRIGGER SYNCED_AT UNTUK 8 TABEL
-- ============================================================

-- 1. dompet
ALTER TABLE public.dompet ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_dompet_synced_at ON public.dompet (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_dompet ON public.dompet;
CREATE TRIGGER trg_set_synced_at_dompet BEFORE INSERT OR UPDATE ON public.dompet
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 2. kategori_pemasukan
ALTER TABLE public.kategori_pemasukan ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_kategori_pemasukan_synced_at ON public.kategori_pemasukan (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_kategori_pemasukan ON public.kategori_pemasukan;
CREATE TRIGGER trg_set_synced_at_kategori_pemasukan BEFORE INSERT OR UPDATE ON public.kategori_pemasukan
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 3. kategori_pengeluaran
ALTER TABLE public.kategori_pengeluaran ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_kategori_pengeluaran_synced_at ON public.kategori_pengeluaran (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_kategori_pengeluaran ON public.kategori_pengeluaran;
CREATE TRIGGER trg_set_synced_at_kategori_pengeluaran BEFORE INSERT OR UPDATE ON public.kategori_pengeluaran
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 4. pemasukan
ALTER TABLE public.pemasukan ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pemasukan_synced_at ON public.pemasukan (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_pemasukan ON public.pemasukan;
CREATE TRIGGER trg_set_synced_at_pemasukan BEFORE INSERT OR UPDATE ON public.pemasukan
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 5. pengeluaran
ALTER TABLE public.pengeluaran ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pengeluaran_synced_at ON public.pengeluaran (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_pengeluaran ON public.pengeluaran;
CREATE TRIGGER trg_set_synced_at_pengeluaran BEFORE INSERT OR UPDATE ON public.pengeluaran
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 6. pengingat_tagihan
ALTER TABLE public.pengingat_tagihan ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_pengingat_tagihan_synced_at ON public.pengingat_tagihan (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_pengingat_tagihan ON public.pengingat_tagihan;
CREATE TRIGGER trg_set_synced_at_pengingat_tagihan BEFORE INSERT OR UPDATE ON public.pengingat_tagihan
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 7. transfer_dompet
ALTER TABLE public.transfer_dompet ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_transfer_dompet_synced_at ON public.transfer_dompet (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_transfer_dompet ON public.transfer_dompet;
CREATE TRIGGER trg_set_synced_at_transfer_dompet BEFORE INSERT OR UPDATE ON public.transfer_dompet
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

-- 8. anggaran_bulanan
ALTER TABLE public.anggaran_bulanan ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_synced_at ON public.anggaran_bulanan (pengguna_id, synced_at);
DROP TRIGGER IF EXISTS trg_set_synced_at_anggaran_bulanan ON public.anggaran_bulanan;
CREATE TRIGGER trg_set_synced_at_anggaran_bulanan BEFORE INSERT OR UPDATE ON public.anggaran_bulanan
  FOR EACH ROW EXECUTE FUNCTION public.set_synced_at();

COMMIT;

