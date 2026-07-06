import { Platform, Alert } from 'react-native';
import type { SQLiteDatabase } from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { getLaporanBulanan, type LaporanBulanan } from "@/database";
import { formatRupiah } from "@/utils";

type ExportFormatOptions = {
  bulan?: string;
};

const CSV_SEPARATOR = ";";
const CSV_NEWLINE = "\r\n";
const EXCEL_BOM = "\uFEFF";

function getSafeDirectory() {
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!directory) {
    throw new Error("Folder penyimpanan sementara tidak tersedia.");
  }

  return directory;
}

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getNamaFile(laporan: LaporanBulanan, extension: "pdf" | "csv") {
  const bulan = sanitizeFilePart(laporan.bulan || "bulan-ini");
  return `laporan-dompetku-${bulan}.${extension}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  
  // Amankan angka agar terbaca native di Excel
  if (typeof value === "number") {
    if (Number.isNaN(value)) return '"0"'; 
    return String(value); 
  }

  let text = String(value).trim();
  
  // Amankan dari Macro/Formula Injection
  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  
  // Escape kutip ganda sesuai RFC 4180
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function formatTanggalIndonesia(value: string) {
  if (!value) return "-";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatTanggalPendek(value: string) {
  if (!value) return "-";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatPeriodeBulan(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return value || "Bulan berjalan";
  }

  const parsed = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatTanggalCetak() {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function getJenisLabel(jenis: LaporanBulanan["transaksi"][number]["jenis"]) {
  return jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran";
}



function buildCsv(laporan: LaporanBulanan): string {
  const periodeLabel = formatPeriodeBulan(laporan.bulan);

  const metaRows: unknown[][] = [
    ["DompetKu"],
    ["Laporan Keuangan Bulanan"],
    ["Periode", periodeLabel],
    ["Dibuat pada", formatTanggalCetak()],
    [],
    ["Ringkasan"],
    ["Total Pemasukan", laporan.totalPemasukan],
    ["Total Pengeluaran", laporan.totalPengeluaran],
    ["Sisa Bersih", laporan.saldoBersih],
    [],
  ];

  const header: unknown[] = [
    "No",
    "Tanggal",
    "Jenis",
    "Judul",
    "Kategori",
    "Dompet",
    "Jumlah",
    "Jumlah Ditandai",
    "Catatan",
  ];

  const transactionRows: unknown[][] = laporan.transaksi.map((item, index) => {
    // Pengeluaran dinegatifkan agar AutoSum Excel akurat
    const signedAmount = item.jenis === 'pemasukan' 
      ? item.jumlah 
      : -Math.abs(item.jumlah);

    return [
      index + 1,
      formatTanggalPendek(item.tanggal),
      getJenisLabel(item.jenis),
      item.judul,
      item.kategori ?? "-",
      item.dompet ?? "-",
      item.jumlah,
      signedAmount,
      item.catatan ?? "",
    ];
  });

  const rows = [...metaRows, header, ...transactionRows]
    .map((row) => row.map(sanitizeCsvCell).join(CSV_SEPARATOR))
    .join(CSV_NEWLINE);

  // Deklarasi sep mutlak di luar agar tidak di-escape
  return EXCEL_BOM + `sep=${CSV_SEPARATOR}${CSV_NEWLINE}` + rows;
}

function buildRingkasanCardHtml(payload: {
  label: string;
  value: string;
  variant: "income" | "expense" | "net";
}) {
  return `
    <div class="summary-card summary-${payload.variant}">
      <div class="summary-label">${escapeHtml(payload.label)}</div>
      <div class="summary-value">${escapeHtml(payload.value)}</div>
    </div>
  `;
}

function buildTransactionRowsHtml(laporan: LaporanBulanan) {
  if (laporan.transaksi.length === 0) {
    return `
      <tr>
        <td colspan="7" class="empty-cell">
          Belum ada transaksi pada periode ini.
        </td>
      </tr>
    `;
  }

  return laporan.transaksi
    .map((item, index) => {
      const isIncome = item.jenis === "pemasukan";
      const badgeClass = isIncome ? "badge-income" : "badge-expense";
      const amountClass = isIncome ? "amount-income" : "amount-expense";
      const signedPrefix = isIncome ? "+" : "-";

      return `
        <tr>
          <td class="col-number">${index + 1}</td>
          <td>${escapeHtml(formatTanggalIndonesia(item.tanggal))}</td>
          <td>
            <span class="badge ${badgeClass}">
              ${escapeHtml(getJenisLabel(item.jenis))}
            </span>
          </td>
          <td>
            <div class="title">${escapeHtml(item.judul)}</div>
            ${
              item.catatan
                ? `<div class="note">${escapeHtml(item.catatan)}</div>`
                : ""
            }
          </td>
          <td>${escapeHtml(item.kategori ?? "-")}</td>
          <td>${escapeHtml(item.dompet ?? "-")}</td>
          <td class="amount ${amountClass}">
            ${signedPrefix} ${escapeHtml(formatRupiah(item.jumlah))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildHtml(laporan: LaporanBulanan) {
  const periodeLabel = formatPeriodeBulan(laporan.bulan);
  const transaksiRows = buildTransactionRowsHtml(laporan);

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 32px;
            background: #F7F8FB;
            color: #18213C;
            font-family: Arial, Helvetica, sans-serif;
          }

          .page {
            max-width: 980px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid #E2E6F2;
          }

          .hero {
            padding: 32px;
            background: linear-gradient(135deg, #4E5AE8 0%, #3842C8 100%);
            color: #FFFFFF;
          }

          .brand-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
          }

          .brand {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          .brand span {
            color: #DDE2FF;
          }

          .report-label {
            margin-top: 8px;
            font-size: 13px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.82);
          }

          .period-box {
            min-width: 220px;
            padding: 14px 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.14);
            border: 1px solid rgba(255, 255, 255, 0.22);
          }

          .period-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: rgba(255, 255, 255, 0.72);
          }

          .period-value {
            margin-top: 4px;
            font-size: 18px;
            font-weight: 800;
          }

          .content {
            padding: 28px 32px 34px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
            margin-bottom: 28px;
          }

          .summary-card {
            padding: 18px;
            border-radius: 18px;
            border: 1px solid #E2E6F2;
            background: #FFFFFF;
          }

          .summary-income {
            background: #EAF8EE;
            border-color: #C7EBD2;
          }

          .summary-expense {
            background: #FDEDED;
            border-color: #F8CCCC;
          }

          .summary-net {
            background: #EEF0FF;
            border-color: #DDE2FF;
          }

          .summary-label {
            font-size: 12px;
            font-weight: 700;
            color: #5C6480;
          }

          .summary-value {
            margin-top: 8px;
            font-size: 19px;
            line-height: 1.25;
            font-weight: 800;
            color: #18213C;
          }

          .section-title {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #18213C;
          }

          .section-subtitle {
            margin: 6px 0 18px;
            font-size: 13px;
            line-height: 1.5;
            color: #5C6480;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1px solid #E2E6F2;
            border-radius: 16px;
            overflow: hidden;
          }

          thead th {
            background: #F3F5FA;
            color: #5C6480;
            font-size: 11px;
            line-height: 1.4;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            font-weight: 800;
            text-align: left;
            padding: 12px 10px;
            border-bottom: 1px solid #E2E6F2;
          }

          tbody td {
            padding: 13px 10px;
            border-bottom: 1px solid #EEF0FF;
            color: #18213C;
            font-size: 12px;
            line-height: 1.45;
            vertical-align: top;
            word-wrap: break-word;
          }

          tbody tr:last-child td {
            border-bottom: none;
          }

          .col-number {
            width: 34px;
            text-align: center;
            color: #8A91A8;
          }

          .title {
            font-weight: 800;
            color: #18213C;
          }

          .note {
            margin-top: 4px;
            font-size: 11px;
            color: #8A91A8;
          }

          .badge {
            display: inline-block;
            padding: 5px 9px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
          }

          .badge-income {
            color: #166534;
            background: #DCFCE7;
          }

          .badge-expense {
            color: #991B1B;
            background: #FEE2E2;
          }

          .amount {
            text-align: right;
            font-weight: 800;
            white-space: nowrap;
          }

          .amount-income {
            color: #16A34A;
          }

          .amount-expense {
            color: #DC2626;
          }

          .empty-cell {
            padding: 28px 14px;
            color: #8A91A8;
            text-align: center;
          }

          .footer {
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px solid #E2E6F2;
            display: flex;
            justify-content: space-between;
            gap: 20px;
            font-size: 11px;
            line-height: 1.45;
            color: #8A91A8;
          }

          @media print {
            body {
              padding: 0;
              background: #FFFFFF;
            }

            .page {
              border: none;
              border-radius: 0;
            }
          }
        </style>
      </head>

      <body>
        <main class="page">
          <section class="hero">
            <div class="brand-row">
              <div>
                <div class="brand">Dompet<span>Ku</span></div>
                <div class="report-label">
                  Laporan keuangan bulanan dari catatan pemasukan dan pengeluaran.
                </div>
              </div>

              <div class="period-box">
                <div class="period-label">Periode laporan</div>
                <div class="period-value">${escapeHtml(periodeLabel)}</div>
              </div>
            </div>
          </section>

          <section class="content">
            <div class="summary">
              ${buildRingkasanCardHtml({
                label: "Total Pemasukan",
                value: formatRupiah(laporan.totalPemasukan),
                variant: "income",
              })}

              ${buildRingkasanCardHtml({
                label: "Total Pengeluaran",
                value: formatRupiah(laporan.totalPengeluaran),
                variant: "expense",
              })}

              ${buildRingkasanCardHtml({
                label: "Sisa Bersih",
                value: formatRupiah(laporan.saldoBersih),
                variant: "net",
              })}
            </div>

            <h2 class="section-title">Riwayat Transaksi</h2>
            <p class="section-subtitle">
              Daftar ini hanya memuat transaksi aktif pada periode laporan.
              Transaksi yang sudah dihapus tidak dihitung.
            </p>

            <table>
              <thead>
                <tr>
                  <th style="width: 42px;">No</th>
                  <th style="width: 118px;">Tanggal</th>
                  <th style="width: 92px;">Jenis</th>
                  <th>Judul</th>
                  <th style="width: 120px;">Kategori</th>
                  <th style="width: 120px;">Dompet</th>
                  <th style="width: 132px; text-align: right;">Jumlah</th>
                </tr>
              </thead>

              <tbody>
                ${transaksiRows}
              </tbody>
            </table>

            <div class="footer">
              <div>
                Dibuat otomatis oleh DompetKu pada ${escapeHtml(
                  formatTanggalCetak()
                )}.
              </div>
              <div>
                Total transaksi: ${laporan.transaksi.length}
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
}

async function assertSharingAvailable() {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error(
      "Maaf, fitur berbagi file tidak didukung di perangkat ini."
    );
  }
}

export async function exportLaporanBulananPdf(
  db: SQLiteDatabase,
  options?: ExportFormatOptions
): Promise<string | null> {
  const laporan = await getLaporanBulanan(db, options?.bulan);
  const html = buildHtml(laporan);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (Platform.OS !== 'android') {
    await assertSharingAvailable();
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Bagikan laporan PDF DompetKu",
      UTI: "com.adobe.pdf",
    });
    return uri;
  }

  return new Promise((resolve, reject) => {
    Alert.alert(
      "Laporan PDF Siap",
      "Apa yang ingin kamu lakukan dengan file ini?",
      [
        {
          text: "📥 Simpan ke HP",
          onPress: async () => {
            try {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (!permissions.granted) {
                resolve(null);
                return;
              }
              const outputUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                getNamaFile(laporan, "pdf"),
                "application/pdf"
              );
              const fileContent = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await FileSystem.writeAsStringAsync(outputUri, fileContent, {
                encoding: FileSystem.EncodingType.Base64, 
              });
              resolve(outputUri);
            } catch (error) {
              console.log("Error Simpan PDF:", error);
              reject(new Error("Gagal menyimpan PDF ke perangkat."));
            }
          },
        },
        {
          text: "📤 Bagikan",
          onPress: async () => {
            try {
              await assertSharingAvailable();
              await Sharing.shareAsync(uri, {
                mimeType: "application/pdf",
                dialogTitle: "Bagikan laporan PDF DompetKu",
              });
              resolve(uri);
            } catch (error) {
              console.log("Error Bagikan PDF:", error);
              reject(new Error("Gagal membagikan laporan PDF."));
            }
          },
        },
        {
          text: "Batal",
          style: "cancel",
          onPress: () => resolve(null),
        },
      ],
      // KUNCI PENYELAMAT BUG HANGING PROMISE DI SINI:
      {
        cancelable: true,
        onDismiss: () => resolve(null),
      }
    );
  });
}

export async function exportLaporanBulananCsv(
  db: SQLiteDatabase,
  options?: ExportFormatOptions
): Promise<string | null> {
  const laporan = await getLaporanBulanan(db, options?.bulan);
  const csv = buildCsv(laporan);

  if (Platform.OS !== 'android') {
    await assertSharingAvailable();
    const fileUri = `${getSafeDirectory()}${getNamaFile(laporan, "csv")}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Bagikan laporan CSV DompetKu",
      UTI: "public.comma-separated-values-text",
    });
    return fileUri;
  }

  return new Promise((resolve, reject) => {
    Alert.alert(
      "Laporan CSV Siap",
      "Apa yang ingin kamu lakukan dengan file spreadsheet ini?",
      [
        {
          text: "📥 Simpan ke HP",
          onPress: async () => {
            try {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (!permissions.granted) {
                resolve(null);
                return;
              }
              const outputUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                getNamaFile(laporan, "csv"),
                "text/csv"
              );
              await FileSystem.writeAsStringAsync(outputUri, csv, {
                encoding: FileSystem.EncodingType.UTF8, 
              });
              resolve(outputUri);
            } catch (error) {
              console.log("Error Simpan CSV:", error);
              reject(new Error("Gagal menyimpan CSV ke perangkat.")); 
            }
          },
        },
        {
          text: "📤 Bagikan",
          onPress: async () => {
            try {
              await assertSharingAvailable();
              const fileUri = `${getSafeDirectory()}${getNamaFile(laporan, "csv")}`;
              await FileSystem.writeAsStringAsync(fileUri, csv, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              await Sharing.shareAsync(fileUri, {
                mimeType: "text/csv",
                dialogTitle: "Bagikan laporan CSV DompetKu",
              });
              resolve(fileUri);
            } catch (error) {
              console.log("Error Bagikan CSV:", error);
              reject(new Error("Gagal membagikan laporan CSV."));
            }
          },
        },
        {
          text: "Batal",
          style: "cancel",
          onPress: () => resolve(null),
        },
      ],
      // KUNCI PENYELAMAT BUG HANGING PROMISE DI SINI:
      {
        cancelable: true,
        onDismiss: () => resolve(null),
      }
    );
  });
}