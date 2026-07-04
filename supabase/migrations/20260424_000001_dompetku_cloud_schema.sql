create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = timezone('utc', now());
  END IF;
  return new;
end;
$$;

create table if not exists public.profil_pengguna (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nama_lengkap text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dompet (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  nama text not null,
  jenis text not null check (jenis in ('utama', 'tabungan', 'dana_darurat')),
  tipe_dompet text not null default 'tunai',
  saldo_saat_ini numeric(18,2) not null default 0,
  is_default boolean not null default false,
  is_aktif boolean not null default true,
  sumber_data text not null default 'lokal',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal)
);

create table if not exists public.kategori_pemasukan (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  nama text not null,
  ikon text,
  warna text,
  urutan integer not null default 0,
  is_bawaan boolean not null default true,
  is_aktif boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal)
);

create table if not exists public.kategori_pengeluaran (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  nama text not null,
  kelompok text not null check (kelompok in ('kebutuhan', 'rutin', 'fleksibel', 'usaha', 'lainnya')),
  ikon text,
  warna text,
  urutan integer not null default 0,
  is_bawaan boolean not null default true,
  is_aktif boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal)
);

create table if not exists public.pemasukan (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  dompet_id_lokal text not null,
  kategori_id_lokal text,
  judul text not null,
  catatan text,
  jumlah numeric(18,2) not null check (jumlah > 0),
  tanggal_transaksi date not null,
  sumber_data text not null default 'lokal',
  is_deleted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal),
  foreign key (pengguna_id, dompet_id_lokal) references public.dompet (pengguna_id, id_lokal) on delete restrict,
  foreign key (pengguna_id, kategori_id_lokal) references public.kategori_pemasukan (pengguna_id, id_lokal) on delete restrict
);

create table if not exists public.pengeluaran (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  dompet_id_lokal text not null,
  kategori_id_lokal text,
  judul text not null,
  catatan text,
  jumlah numeric(18,2) not null check (jumlah > 0),
  tanggal_transaksi date not null,
  pakai_dana_darurat boolean not null default false,
  sumber_data text not null default 'lokal',
  is_deleted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal),
  foreign key (pengguna_id, dompet_id_lokal) references public.dompet (pengguna_id, id_lokal) on delete restrict,
  foreign key (pengguna_id, kategori_id_lokal) references public.kategori_pengeluaran (pengguna_id, id_lokal) on delete restrict
);

create table if not exists public.pengingat_tagihan (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  judul text not null,
  catatan text,
  nominal numeric(18,2) not null default 0,
  dompet_id_lokal text,
  tanggal_jatuh_tempo date not null,
  jam_pengingat time not null default '09:00',
  status text not null default 'aktif' check (status in ('aktif', 'selesai', 'dibatalkan')),
  pengulangan text not null default 'sekali' check (pengulangan in ('sekali', 'mingguan', 'bulanan')),
  notifikasi_diaktifkan boolean not null default true,
  sumber_data text not null default 'lokal',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal),
  foreign key (pengguna_id, dompet_id_lokal) references public.dompet (pengguna_id, id_lokal) on delete restrict
);

create table if not exists public.transfer_dompet (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  dompet_sumber_id_lokal text not null,
  dompet_tujuan_id_lokal text not null,
  jumlah numeric(18,2) not null check (jumlah > 0),
  tanggal_transfer date not null,
  catatan text,
  sumber_dana_darurat boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal),
  check (dompet_sumber_id_lokal <> dompet_tujuan_id_lokal),
  foreign key (pengguna_id, dompet_sumber_id_lokal) references public.dompet (pengguna_id, id_lokal) on delete restrict,
  foreign key (pengguna_id, dompet_tujuan_id_lokal) references public.dompet (pengguna_id, id_lokal) on delete restrict
);

create table if not exists public.anggaran_bulanan (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  bulan text not null,
  nama text not null,
  kategori_id_lokal text,
  batas_nominal numeric(18,2) not null check (batas_nominal > 0),
  ambang_peringatan_persen numeric(4,2) not null default 0.8,
  is_aktif boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal),
  foreign key (pengguna_id, kategori_id_lokal) references public.kategori_pengeluaran (pengguna_id, id_lokal) on delete set null
);

create table if not exists public.koreksi_saldo_dompet (
  pengguna_id uuid not null references auth.users(id) on delete cascade,
  id_lokal text not null,
  dompet_id_lokal text not null,
  nama_dompet_snapshot text not null,
  saldo_sebelum numeric(18,2) not null,
  saldo_sesudah numeric(18,2) not null,
  selisih numeric(18,2) not null,
  catatan text,
  sumber text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (pengguna_id, id_lokal),
  foreign key (pengguna_id, dompet_id_lokal) references public.dompet(pengguna_id, id_lokal) on delete restrict
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anggaran_aktif_unik ON public.anggaran_bulanan (pengguna_id, bulan, kategori_id_lokal) WHERE is_aktif = true;

create index if not exists idx_dompet_pengguna_jenis on public.dompet (pengguna_id, jenis);
create index if not exists idx_kategori_pemasukan_pengguna_urutan on public.kategori_pemasukan (pengguna_id, urutan);
create index if not exists idx_kategori_pengeluaran_pengguna_urutan on public.kategori_pengeluaran (pengguna_id, urutan);
create index if not exists idx_pemasukan_pengguna_tanggal on public.pemasukan (pengguna_id, tanggal_transaksi desc);
create index if not exists idx_pengeluaran_pengguna_tanggal on public.pengeluaran (pengguna_id, tanggal_transaksi desc);
create index if not exists idx_pengingat_pengguna_status_tanggal on public.pengingat_tagihan (pengguna_id, status, tanggal_jatuh_tempo);
create index if not exists idx_transfer_pengguna_tanggal on public.transfer_dompet (pengguna_id, tanggal_transfer desc);
create index if not exists idx_anggaran_bulanan_pengguna_bulan on public.anggaran_bulanan (pengguna_id, bulan);
create index if not exists idx_koreksi_saldo_dompet_pengguna_created on public.koreksi_saldo_dompet (pengguna_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_pemasukan_fk_dompet ON public.pemasukan(pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pemasukan_fk_kategori ON public.pemasukan(pengguna_id, kategori_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_fk_dompet ON public.pengeluaran(pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_fk_kategori ON public.pengeluaran(pengguna_id, kategori_id_lokal);
CREATE INDEX IF NOT EXISTS idx_anggaran_fk_kategori ON public.anggaran_bulanan(pengguna_id, kategori_id_lokal);
CREATE INDEX IF NOT EXISTS idx_pengingat_fk_dompet ON public.pengingat_tagihan(pengguna_id, dompet_id_lokal);
CREATE INDEX IF NOT EXISTS idx_transfer_fk_sumber ON public.transfer_dompet(pengguna_id, dompet_sumber_id_lokal);
CREATE INDEX IF NOT EXISTS idx_transfer_fk_tujuan ON public.transfer_dompet(pengguna_id, dompet_tujuan_id_lokal);
CREATE INDEX IF NOT EXISTS idx_koreksi_fk_dompet ON public.koreksi_saldo_dompet(pengguna_id, dompet_id_lokal);

drop trigger if exists trg_set_updated_at_profil_pengguna on public.profil_pengguna;
create trigger trg_set_updated_at_profil_pengguna before update on public.profil_pengguna for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_dompet on public.dompet;
create trigger trg_set_updated_at_dompet before update on public.dompet for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_kategori_pemasukan on public.kategori_pemasukan;
create trigger trg_set_updated_at_kategori_pemasukan before update on public.kategori_pemasukan for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_kategori_pengeluaran on public.kategori_pengeluaran;
create trigger trg_set_updated_at_kategori_pengeluaran before update on public.kategori_pengeluaran for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_pemasukan on public.pemasukan;
create trigger trg_set_updated_at_pemasukan before update on public.pemasukan for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_pengeluaran on public.pengeluaran;
create trigger trg_set_updated_at_pengeluaran before update on public.pengeluaran for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_pengingat_tagihan on public.pengingat_tagihan;
create trigger trg_set_updated_at_pengingat_tagihan before update on public.pengingat_tagihan for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_transfer_dompet on public.transfer_dompet;
create trigger trg_set_updated_at_transfer_dompet before update on public.transfer_dompet for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_anggaran_bulanan on public.anggaran_bulanan;
create trigger trg_set_updated_at_anggaran_bulanan before update on public.anggaran_bulanan for each row execute function public.set_updated_at();
drop trigger if exists trg_set_updated_at_koreksi_saldo_dompet on public.koreksi_saldo_dompet;
create trigger trg_set_updated_at_koreksi_saldo_dompet before update on public.koreksi_saldo_dompet for each row execute function public.set_updated_at();

alter table public.profil_pengguna enable row level security;
alter table public.dompet enable row level security;
alter table public.kategori_pemasukan enable row level security;
alter table public.kategori_pengeluaran enable row level security;
alter table public.pemasukan enable row level security;
alter table public.pengeluaran enable row level security;
alter table public.pengingat_tagihan enable row level security;
alter table public.transfer_dompet enable row level security;
alter table public.anggaran_bulanan enable row level security;
alter table public.koreksi_saldo_dompet enable row level security;

drop policy if exists profil_pengguna_all_own on public.profil_pengguna;
create policy profil_pengguna_all_own on public.profil_pengguna for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists dompet_all_own on public.dompet;
create policy dompet_all_own on public.dompet for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists kategori_pemasukan_all_own on public.kategori_pemasukan;
create policy kategori_pemasukan_all_own on public.kategori_pemasukan for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists kategori_pengeluaran_all_own on public.kategori_pengeluaran;
create policy kategori_pengeluaran_all_own on public.kategori_pengeluaran for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists pemasukan_all_own on public.pemasukan;
create policy pemasukan_all_own on public.pemasukan for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists pengeluaran_all_own on public.pengeluaran;
create policy pengeluaran_all_own on public.pengeluaran for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists pengingat_tagihan_all_own on public.pengingat_tagihan;
create policy pengingat_tagihan_all_own on public.pengingat_tagihan for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists transfer_dompet_all_own on public.transfer_dompet;
create policy transfer_dompet_all_own on public.transfer_dompet for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists anggaran_bulanan_all_own on public.anggaran_bulanan;
create policy anggaran_bulanan_all_own on public.anggaran_bulanan for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);

drop policy if exists koreksi_saldo_dompet_all_own on public.koreksi_saldo_dompet;
create policy koreksi_saldo_dompet_all_own on public.koreksi_saldo_dompet for all using ((select auth.uid()) = pengguna_id) with check ((select auth.uid()) = pengguna_id);