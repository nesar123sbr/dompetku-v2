import { COLORS } from "@/constants";

const CATEGORY_COLOR_MAP: Record<string, string> = {
  "makan & minum": "#F97316",
  "belanja harian": "#F59E0B",
  transportasi: "#0EA5E9",
  tagihan: "#DC2626",
  "stok warung": "#16A34A",
  hiburan: "#6B63FF",
  bensin: "#0284C7",
  obat: "#10B981",
  sekolah: "#8B5CF6",
  anak: "#EC4899",
  lainnya: COLORS.textTertiary,
};

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getCategoryChartColor(name: string) {
  const normalized = name.trim().toLowerCase();

  // 1. Cek dulu apakah ada warna hardcode yang cocok
  if (CATEGORY_COLOR_MAP[normalized]) {
    return CATEGORY_COLOR_MAP[normalized];
  }

  // 2. Kalau tidak ada, kita ciptakan warna dinamis dari nama kategorinya
  const hash = simpleHash(normalized);
  
  // Hue (Warna) dari 0 sampai 360 derajat. 
  // Karena asalnya dari hash nama, "Bensin" akan selalu dapat angka derajat yang sama.
  const hue = hash % 360; 

  // Saturation 70% dan Lightness 50% menjaga warnanya tetap cerah dan jelas di layar
  return `hsl(${hue}, 70%, 50%)`;
}