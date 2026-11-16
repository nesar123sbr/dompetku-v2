import test from "node:test";
import assert from "node:assert/strict";

// ============================================================================
// 1. ADD MONTHS CLAMPED & JATUH TEMPO
// ============================================================================
function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsClamped(value, months) {
  const [year, month, day] = value.split("-").map(Number);
  const firstTargetMonthDate = new Date(year, month - 1 + months, 1);
  const lastDayOfTargetMonth = new Date(
    firstTargetMonthDate.getFullYear(),
    firstTargetMonthDate.getMonth() + 1,
    0
  ).getDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  const result = new Date(
    firstTargetMonthDate.getFullYear(),
    firstTargetMonthDate.getMonth(),
    targetDay
  );
  return toDateInput(result);
}

function addDaysToDateInput(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function getNextTanggalJatuhTempo(tanggalJatuhTempo, pengulangan, refTodayStr) {
  if (pengulangan === "sekali") {
    return tanggalJatuhTempo;
  }
  const todayStr = refTodayStr || toDateInput(new Date());
  let nextDate = tanggalJatuhTempo;
  do {
    if (pengulangan === "mingguan") {
      nextDate = addDaysToDateInput(nextDate, 7);
    } else if (pengulangan === "bulanan") {
      nextDate = addMonthsClamped(nextDate, 1);
    } else {
      break;
    }
  } while (nextDate <= todayStr);
  return nextDate;
}

test("addMonthsClamped: menangani batas akhir bulan dan tahun kabisat dengan benar", () => {
  // Non-kabisat 2026: 31 Januari -> 28 Februari
  assert.equal(addMonthsClamped("2026-01-31", 1), "2026-02-28");

  // Kabisat 2024: 31 Januari -> 29 Februari
  assert.equal(addMonthsClamped("2024-01-31", 1), "2024-02-29");

  // 31 Maret -> 30 April (April hanya 30 hari)
  assert.equal(addMonthsClamped("2026-03-31", 1), "2026-04-30");

  // Melewati pergantian tahun: 31 Desember 2025 -> 28 Februari 2026
  assert.equal(addMonthsClamped("2025-12-31", 2), "2026-02-28");

  // Tanggal tengah bulan tetap sama
  assert.equal(addMonthsClamped("2026-01-15", 3), "2026-04-15");
});

test("getNextTanggalJatuhTempo: memajukan tanggal berulang sampai melewati hari ini", () => {
  const refToday = "2026-11-06";

  // Sekali: tidak dimajukan
  assert.equal(
    getNextTanggalJatuhTempo("2026-11-01", "sekali", refToday),
    "2026-11-01"
  );

  // Mingguan: dari 2026-10-20 -> harus loop sampai > 2026-11-06
  // 10-20 +7 = 10-27; +7 = 11-03; +7 = 11-10
  assert.equal(
    getNextTanggalJatuhTempo("2026-10-20", "mingguan", refToday),
    "2026-11-10"
  );

  // Bulanan: dari 2026-08-31 -> 2026-09-30 -> 2026-10-31 -> 2026-11-30 (> refToday)
  assert.equal(
    getNextTanggalJatuhTempo("2026-08-31", "bulanan", refToday),
    "2026-11-30"
  );
});

// ============================================================================
// 2. FORMULA REKONSILIASI SALDO BERSIH DOMPET
// ============================================================================
function hitungSaldoDompet({
  saldoAwal = 0,
  totalPemasukan = 0,
  totalPengeluaran = 0,
  totalTransferMasuk = 0,
  totalTransferKeluar = 0,
  totalKoreksi = 0,
}) {
  const netMutasi =
    totalPemasukan -
    totalPengeluaran +
    totalTransferMasuk -
    totalTransferKeluar +
    totalKoreksi;
  return Math.round(saldoAwal + netMutasi);
}

test("hitungSaldoDompet: menghitung saldo akhir sesuai seluruh riwayat mutasi", () => {
  // Skenario 1: Saldo awal 500.000, ada pemasukan 250.000, pengeluaran 100.000
  const s1 = hitungSaldoDompet({
    saldoAwal: 500000,
    totalPemasukan: 250000,
    totalPengeluaran: 100000,
  });
  assert.equal(s1, 650000);

  // Skenario 2: Transfer antar-dompet & koreksi saldo
  // Dompet Awal 1.000.000, transfer keluar 200.000, koreksi penyesuaian opname kas -50.000
  const s2 = hitungSaldoDompet({
    saldoAwal: 1000000,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    totalTransferMasuk: 0,
    totalTransferKeluar: 200000,
    totalKoreksi: -50000,
  });
  assert.equal(s2, 750000);

  // Skenario 3: Dompet penerima transfer
  const s3 = hitungSaldoDompet({
    saldoAwal: 100000,
    totalTransferMasuk: 200000,
  });
  assert.equal(s3, 300000);
});

// ============================================================================
// 3. LWW (LAST-WRITE-WINS) COMPARATOR GUARD (LOKAL & CLOUD)
// ============================================================================
function shouldCloudOverwriteLocal(localUpdatedAt, cloudUpdatedAt) {
  const localMs = Date.parse(localUpdatedAt);
  const cloudMs = Date.parse(cloudUpdatedAt);
  // Di SQLite repo: WHERE excluded.updated_at > table.updated_at
  // Cloud HANYA menang jika cloud timestamp strictly greater.
  return cloudMs > localMs;
}

function shouldPushUpdateCloud(cloudUpdatedAt, incomingUpdatedAt, serverNowIso) {
  const cloudMs = Date.parse(cloudUpdatedAt);
  const incomingMs = Date.parse(incomingUpdatedAt);
  const nowMs = serverNowIso ? Date.parse(serverNowIso) : Infinity;
  const clampedIncomingMs = Math.min(incomingMs, nowMs);
  // Di RPC sync_bundle (000008): WHERE public.<tabel>.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()))
  // Push HANYA meng-update cloud bila timestamp cloud strictly smaller (<).
  return cloudMs < clampedIncomingMs;
}

test("LWW guard: cloud hanya menimpa baris lokal bila cloud strictly newer", () => {
  const t1 = "2026-11-06T10:00:00.000Z";
  const t2 = "2026-11-06T10:05:00.000Z";

  // Cloud lebih baru: harus menimpa lokal (true)
  assert.equal(shouldCloudOverwriteLocal(t1, t2), true);

  // Lokal lebih baru (ada perubahan offline yang belum di-push): JANGAN timpa (false)
  assert.equal(shouldCloudOverwriteLocal(t2, t1), false);

  // Timestamp identik: JANGAN timpa lokal (false)
  assert.equal(shouldCloudOverwriteLocal(t1, t1), false);
});

test("LWW push cloud (sync_bundle): push dengan updated_at SAMA tidak meng-update baris cloud (strict <)", () => {
  const t1 = "2026-11-06T10:00:00.000Z";
  const t2 = "2026-11-06T10:05:00.000Z";
  const serverNow = "2026-11-06T10:10:00.000Z";

  // Incoming lebih baru dari cloud: update cloud (true)
  assert.equal(shouldPushUpdateCloud(t1, t2, serverNow), true);

  // Incoming SAMA dengan cloud (re-push baris tidak berubah / induk FK): JANGAN update (false)
  assert.equal(shouldPushUpdateCloud(t1, t1, serverNow), false);

  // Incoming lebih tua dari cloud: JANGAN update (false)
  assert.equal(shouldPushUpdateCloud(t2, t1, serverNow), false);
});

// ============================================================================
// 4. LOGIKA PERIODE PEMBANDING LAPORAN
// ============================================================================
function getBulanSebelumnya(bulan) {
  const [yearRaw, monthRaw] = bulan.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 2, 1);
  const previousYear = date.getFullYear();
  const previousMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${previousYear}-${previousMonth}`;
}

function getRentangTanggalBulan(bulan) {
  const [year, monthIndex] = bulan.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return {
    mulai: `${bulan}-01`,
    selesai: `${bulan}-${String(lastDay).padStart(2, "0")}`,
  };
}

test("getBulanSebelumnya & rentang tanggal: transisi tahun dan rentang akhir bulan", () => {
  // Transisi pergantian tahun: Januari 2026 -> Desember 2025
  assert.equal(getBulanSebelumnya("2026-01"), "2025-12");

  // Pertengahan tahun: Mei 2026 -> April 2026
  assert.equal(getBulanSebelumnya("2026-05"), "2026-04");

  // Rentang tanggal Februari 2024 (kabisat)
  const febKabisat = getRentangTanggalBulan("2024-02");
  assert.equal(febKabisat.mulai, "2024-02-01");
  assert.equal(febKabisat.selesai, "2024-02-29");

  // Rentang tanggal Februari 2026 (non-kabisat)
  const febNormal = getRentangTanggalBulan("2026-02");
  assert.equal(febNormal.mulai, "2026-02-01");
  assert.equal(febNormal.selesai, "2026-02-28");
});

