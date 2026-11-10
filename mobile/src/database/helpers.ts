export function getNowIso() {
  return new Date().toISOString();
}

export function createLocalId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export const MAX_NOMINAL = 999999999999;

export function assertNominalDalamBatas(value: number, namaField: string): void {
  if (!Number.isFinite(value) || value > MAX_NOMINAL) {
    throw new Error(`${namaField} terlalu besar. Maksimal Rp 999.999.999.999.`);
  }
}

export function getBulanIni() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

