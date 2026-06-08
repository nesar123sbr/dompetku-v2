import type {
  DompetJenis,
  DompetTipe,
  PengingatPengulangan,
  StatusDanaDarurat,
} from "@/database";

export function formatRupiah(value: number) {
  const nominal = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

export function formatLabelModePenggunaan(mode: string) {
  switch (mode) {
    case "guest":
      return "Mode tamu";
    case "authenticated":
      return "Masuk dengan akun";
    default:
      return "Belum dipilih";
  }
}

export function formatYaTidak(value: boolean) {
  return value ? "Ya" : "Tidak";
}

export function formatTanggalIndonesiaPendek(value: string) {
  if (!value) return "-";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatTanggalWaktuIndonesia(value?: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatJenisDompetLabel(jenis: DompetJenis) {
  switch (jenis) {
    case "utama":
      return "Dompet utama";
    case "tabungan":
      return "Tabungan";
    case "dana_darurat":
      return "Dana darurat";
    default:
      return jenis;
  }
}

// 👇 TAMBAHAN BARU
export function formatTipeDompetLabel(tipe: DompetTipe) {
  switch (tipe) {
    case "tunai":
      return "Tunai / cash";
    case "bank":
      return "Rekening bank";
    case "ewallet":
      return "E-wallet";
    case "tabungan":
      return "Tabungan";
    case "dana_darurat":
      return "Dana darurat";
    case "lainnya":
      return "Lainnya";
    default:
      return tipe;
  }
}

export function formatLabelStatusDanaDarurat(status: StatusDanaDarurat) {
  switch (status) {
    case "belum_ada_data":
      return "Belum ada data";
    case "belum_aman":
      return "Belum aman";
    case "cukup":
      return "Cukup";
    case "aman":
      return "Aman";
    default:
      return status;
  }
}

export function formatPersen(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(normalized);
}

export function formatLabelPengulangan(value: PengingatPengulangan) {
  switch (value) {
    case "sekali":
      return "Sekali";
    case "mingguan":
      return "Mingguan";
    case "bulanan":
      return "Bulanan";
    default:
      return value;
  }
}

export function formatJamMenit(value: string) {
  if (!value) return "--:--";
  return value;
}