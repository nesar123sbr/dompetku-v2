export type RingkasanArahSync = {
  profilPengguna: number;
  dompet: number;
  kategoriPemasukan: number;
  kategoriPengeluaran: number;
  pemasukan: number;
  pengeluaran: number;
  pengingatTagihan: number;
  transferDompet: number;
  anggaranBulanan: number;
  koreksiSaldoDompet: number;
};

export type RingkasanSinkronisasiDuaArah = {
  mode: "awal" | "lanjutan";
  pushed: RingkasanArahSync;
  pulled: RingkasanArahSync;
  lastSyncAt: string;
  conflictPolicy: string;
};

export type SyncOptions = {
  isManual?: boolean;
  forceFullResync?: boolean;
};

