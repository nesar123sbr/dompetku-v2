import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Modal, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import {
  AppButton,
  AppCard,
  AppDateField, // 👈 Ini sudah kutambahkan
  AppHeading,
  AppLoader,
  AppScreen,
  AppTextField,
  GuestModeNotice,
  OptionChip,
  ReminderCard,
  StatCard,
  StatusBadge,
} from "@/components";
import { ROUTES, SPACING } from "@/constants";
import {
  getDaftarPengingatTagihanAktif,
  getRingkasanPengingatTagihan,
  getSemuaDompetAktif,
  type DompetRow,
  type PengingatTagihanListItem,
  type RingkasanPengingatTagihan,
} from "@/database";
import {
  getLocalNotificationPermissionSnapshotAsync,
  getScheduledNotificationCountAsync,
  openSystemNotificationSettings,
  scheduleTestNotificationInFiveSecondsAsync,
  type LocalNotificationPermissionSnapshot,
} from "@/lib/notifications";
import { useAuthSession } from "@/providers/AuthProvider";
import {
  batalkanPengingatTagihanDenganNotifikasi,
  buatPengingatTagihanDenganNotifikasi,
  sinkronkanNotifikasiPengingatAktif,
  tandaiPengingatTagihanSelesai,
} from "@/services";
import {
  formatLabelPengulangan,
  formatRupiah,
  formatTanggalIndonesiaPendek,
  getTodayDateInput,
  isValidDateInput,
  isValidTimeInput,
  parseNumericInput,
  sanitizeNumericInput,
  sanitizeTimeInput,
} from "@/utils";
import { pengingatScreenStyles } from "@assets/styles/screens/protected/pengingatScreen.styles";

type LoadedPengingatData = {
  dompetList: DompetRow[];
  ringkasan: RingkasanPengingatTagihan;
  daftarAktif: PengingatTagihanListItem[];
  permission: LocalNotificationPermissionSnapshot;
  scheduledNotificationCount: number;
};

const EMPTY_RINGKASAN: RingkasanPengingatTagihan = {
  totalAktif: 0,
  jatuhTempoHariIni: 0,
  terlambat: 0,
  notifikasiAktif: 0,
};

const EMPTY_PERMISSION: LocalNotificationPermissionSnapshot = {
  granted: false,
  canAskAgain: true,
  status: "unknown",
};

function getPermissionLabel(permission: LocalNotificationPermissionSnapshot) {
  if (permission.granted) {
    return "Diizinkan";
  }

  if (!permission.canAskAgain) {
    return "Ditolak permanen";
  }

  return "Belum diizinkan";
}

function getPermissionVariant(permission: LocalNotificationPermissionSnapshot) {
  if (permission.granted) {
    return "success" as const;
  }

  if (!permission.canAskAgain) {
    return "danger" as const;
  }

  return "warning" as const;
}

function getPermissionDescription(permission: LocalNotificationPermissionSnapshot) {
  if (permission.granted) {
    return "Notifikasi lokal siap dipakai. Reminder baru bisa langsung dijadwalkan ke perangkat, dan reminder lama yang belum punya jadwal bisa disinkronkan.";
  }

  if (!permission.canAskAgain) {
    return "Izin notifikasi sudah pernah ditolak dan tidak bisa diminta ulang dari dialog biasa. Kamu perlu membuka pengaturan perangkat untuk mengaktifkannya.";
  }

  return "Izin notifikasi belum diberikan. Reminder tetap bisa disimpan ke SQLite lokal, tetapi banner pengingat tidak akan dijadwalkan sampai izin diberikan.";
}

export default function PengingatPage() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { isGuestMode } = useAuthSession();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingPermission, setIsSyncingPermission] = useState(false);
  const [processingReminderId, setProcessingReminderId] = useState<string | null>(
    null
  );

  const [dompetList, setDompetList] = useState<DompetRow[]>([]);
  const [ringkasan, setRingkasan] =
    useState<RingkasanPengingatTagihan>(EMPTY_RINGKASAN);
  const [daftarAktif, setDaftarAktif] = useState<PengingatTagihanListItem[]>([]);
  const [permission, setPermission] =
    useState<LocalNotificationPermissionSnapshot>(EMPTY_PERMISSION);
  const [scheduledNotificationCount, setScheduledNotificationCount] = useState(0);

  const [selectedDompetId, setSelectedDompetId] = useState<string | null>(null);
  const [judul, setJudul] = useState("");
  const [nominalInput, setNominalInput] = useState("");
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState(getTodayDateInput());
  const [jamPengingat, setJamPengingat] = useState("09:00");
  const [pengulangan, setPengulangan] = useState<"sekali" | "mingguan" | "bulanan">(
    "sekali"
  );
  const [notifikasiDiaktifkan, setNotifikasiDiaktifkan] = useState(true);
  const [catatan, setCatatan] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentItem, setPaymentItem] =
  useState<PengingatTagihanListItem | null>(null);
  const [selectedPaymentDompetId, setSelectedPaymentDompetId] = useState<
    string | null
  >(null);
  const [paymentError, setPaymentError] = useState("");

  const nominalValue = useMemo(
    () => parseNumericInput(nominalInput),
    [nominalInput]
  );

  const selectedPaymentDompet = useMemo(() => {
  if (!selectedPaymentDompetId) {
    return null;
  }

    return dompetList.find((item) => item.id === selectedPaymentDompetId) ?? null;
  }, [dompetList, selectedPaymentDompetId]);

  const isPaymentSaldoKurang = Boolean(
    paymentItem &&
      selectedPaymentDompet &&
      paymentItem.nominal > selectedPaymentDompet.saldo_saat_ini
  );

  const fetchData = useCallback(async (): Promise<LoadedPengingatData> => {
    const [
      dompetData,
      ringkasanData,
      daftarData,
      permissionData,
      scheduledCount,
    ] = await Promise.all([
      getSemuaDompetAktif(db),
      getRingkasanPengingatTagihan(db),
      getDaftarPengingatTagihanAktif(db, 30),
      getLocalNotificationPermissionSnapshotAsync(),
      getScheduledNotificationCountAsync(),
    ]);

    return {
      dompetList: dompetData,
      ringkasan: ringkasanData,
      daftarAktif: daftarData,
      permission: permissionData,
      scheduledNotificationCount: scheduledCount,
    };
  }, [db]);

  function applyLoadedData(data: LoadedPengingatData) {
    setDompetList(data.dompetList);
    setRingkasan(data.ringkasan);
    setDaftarAktif(data.daftarAktif);
    setPermission(data.permission);
    setScheduledNotificationCount(data.scheduledNotificationCount);
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPengingatData() {
        try {
          setIsLoading(true);

          const data = await fetchData();

          if (!isActive) return;
          applyLoadedData(data);
        } catch (error) {
          console.log("loadPengingatData error:", error);
        } finally {
          if (!isActive) return;
          setIsLoading(false);
        }
      }

      loadPengingatData();

      return () => {
        isActive = false;
      };
    }, [fetchData])
  );

  useEffect(() => {
    if (
      selectedDompetId &&
      !dompetList.some((item) => item.id === selectedDompetId)
    ) {
      setSelectedDompetId(null);
    }
  }, [dompetList, selectedDompetId]);

  useEffect(() => {
    if (
      selectedPaymentDompetId &&
      !dompetList.some((item) => item.id === selectedPaymentDompetId)
    ) {
      setSelectedPaymentDompetId(null);
    }
  }, [dompetList, selectedPaymentDompetId]);

  function resetFormAfterSubmit() {
    setJudul("");
    setNominalInput("");
    setTanggalJatuhTempo(getTodayDateInput());
    setJamPengingat("09:00");
    setPengulangan("sekali");
    setNotifikasiDiaktifkan(true);
    setCatatan("");
    setSelectedDompetId(null);
    setFormError("");
  }

  async function refreshAllData() {
    const refreshed = await fetchData();
    applyLoadedData(refreshed);
  }

  async function handleSubmitPengingat() {
    Keyboard.dismiss();

    try {
      setFormError("");
      setSuccessMessage("");

      if (judul.trim().length < 2) {
        setFormError("Nama tagihan minimal 2 karakter.");
        return;
      }

      if (!isValidDateInput(tanggalJatuhTempo)) {
        setFormError("Tanggal jatuh tempo wajib memakai format YYYY-MM-DD.");
        return;
      }

      if (!isValidTimeInput(jamPengingat)) {
        setFormError("Jam pengingat wajib memakai format HH:MM.");
        return;
      }

      setIsSubmitting(true);

      const result = await buatPengingatTagihanDenganNotifikasi(db, {
        judul,
        catatan,
        nominal: nominalValue,
        dompetId: selectedDompetId,
        tanggalJatuhTempo,
        jamPengingat,
        pengulangan,
        notifikasiDiaktifkan,
      });

      if (!notifikasiDiaktifkan) {
        setSuccessMessage(
          "Pengingat berhasil disimpan. Notifikasi sengaja dimatikan."
        );
      } else if (!result.permissionGranted) {
        setSuccessMessage(
          "Pengingat berhasil disimpan, tetapi izin notifikasi belum diberikan."
        );
      } else if (result.skippedReason === "waktu_terlewat") {
        setSuccessMessage(
          "Pengingat berhasil disimpan, tetapi jam notifikasinya sudah lewat untuk waktu sekarang. Ubah jam atau tanggal kalau kamu ingin notifikasi muncul."
        );
      } else if (result.skippedReason === "jadwal_notifikasi_gagal") {
        setSuccessMessage(
          "Pengingat berhasil disimpan, tetapi notifikasi perangkat belum berhasil dijadwalkan. Di emulator ini kadang masih bisa begitu."
        );
      } else if (!result.notificationScheduled) {
        setSuccessMessage(
          "Pengingat berhasil disimpan, tetapi notifikasinya belum terjadwal."
        );
      } else {
        setSuccessMessage(
          "Pengingat berhasil disimpan dan notifikasi sudah dijadwalkan."
        );
      }

      resetFormAfterSubmit();
      await refreshAllData();
    } catch (error) {
      console.log("handleSubmitPengingat error:", error);
      setFormError("Pengingat belum berhasil disimpan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSyncNotifications() {
    try {
      setFormError("");
      setSuccessMessage("");
      setIsSyncingPermission(true);

      const result = await sinkronkanNotifikasiPengingatAktif(db);
      const permissionRefreshed =
        await getLocalNotificationPermissionSnapshotAsync();

      setPermission(permissionRefreshed);

      if (!result.permissionGranted) {
        setFormError(
          "Izin notifikasi belum diberikan. Reminder tetap aman di SQLite lokal, tetapi banner notifikasi belum bisa dijadwalkan."
        );
        return;
      }

      if (result.scheduledCount > 0) {
        setSuccessMessage(
          `${result.scheduledCount} pengingat aktif berhasil dijadwalkan ke notifikasi lokal.`
        );
      } else if (result.skippedPastCount > 0) {
        setSuccessMessage(
          "Izin notifikasi sudah aktif, tetapi reminder yang belum dijadwalkan sebagian besar waktunya sudah lewat."
        );
      } else {
        setSuccessMessage(
          "Izin notifikasi sudah aktif. Belum ada reminder yang perlu disinkronkan ulang."
        );
      }

      await refreshAllData();
    } catch (error) {
      console.log("handleSyncNotifications error:", error);
      setFormError("Gagal menyinkronkan notifikasi reminder.");
    } finally {
      setIsSyncingPermission(false);
    }
  }

  async function handleTestNotification() {
    try {
      setFormError("");
      setSuccessMessage("");
      setIsSyncingPermission(true);

      const result = await scheduleTestNotificationInFiveSecondsAsync();

      if (!result.permissionGranted) {
        setFormError(
          "Izin notifikasi belum aktif. Aktifkan izin notifikasi dulu di perangkat."
        );
        return;
      }

      setSuccessMessage(
        "Tes notifikasi dijadwalkan. Tunggu sekitar 5 detik, lalu lihat apakah banner atau ikon notifikasi muncul."
      );

      await refreshAllData();
    } catch (error) {
      console.log("handleTestNotification error:", error);
      setFormError(
        "Tes notifikasi belum berhasil. Cek izin notifikasi aplikasi di pengaturan perangkat."
      );
    } finally {
      setIsSyncingPermission(false);
    }
  }

function openPaymentModal(item: PengingatTagihanListItem) {
  const preferredDompet = item.dompet_id
    ? dompetList.find((dompet) => dompet.id === item.dompet_id) ?? null
    : null;

  setPaymentItem(item);
  setSelectedPaymentDompetId(preferredDompet?.id ?? null);
  setPaymentError("");
  setFormError("");
  setSuccessMessage("");
}

function closePaymentModal() {
  if (processingReminderId) {
    return;
  }

  setPaymentItem(null);
  setSelectedPaymentDompetId(null);
  setPaymentError("");
}

async function handleKonfirmasiBayarTagihan() {
  if (!paymentItem) {
    return;
  }

  try {
    setPaymentError("");
    setFormError("");
    setSuccessMessage("");

    if (paymentItem.nominal <= 0) {
      setPaymentError("Nominal tagihan harus lebih dari 0 agar bisa dibayar.");
      return;
    }

    if (!selectedPaymentDompet) {
      setPaymentError("Pilih dompet pembayaran terlebih dahulu.");
      return;
    }

    if (paymentItem.nominal > selectedPaymentDompet.saldo_saat_ini) {
      setPaymentError(
        "Saldo tidak mencukupi. Silakan pilih dompet lain atau lakukan transfer antar dompet terlebih dahulu."
      );
      return;
    }

    setProcessingReminderId(paymentItem.id);

    const result = await tandaiPengingatTagihanSelesai(
      db,
      paymentItem,
      selectedPaymentDompet.id
    );

    setPaymentItem(null);
    setSelectedPaymentDompetId(null);
    setPaymentError("");

    if (result.rolledForward && result.nextTanggalJatuhTempo) {
      setSuccessMessage(
        `Pembayaran berhasil dicatat dari ${
          result.dompetNama
        }. Pengingat dipindah ke periode berikutnya (${formatTanggalIndonesiaPendek(
          result.nextTanggalJatuhTempo
        )}).`
      );
    } else {
      setSuccessMessage(
        `Pembayaran berhasil dicatat. Saldo ${
          result.dompetNama
        } berkurang ${formatRupiah(paymentItem.nominal)}.`
      );
    }

    await refreshAllData();
  } catch (error) {
    console.log("handleKonfirmasiBayarTagihan error:", error);

    setPaymentError(
      error instanceof Error
        ? error.message
        : "Pembayaran tagihan belum berhasil dicatat."
    );
  } finally {
    setProcessingReminderId(null);
  }
}

  async function handleBatalkanItem(item: PengingatTagihanListItem) {
    try {
      setProcessingReminderId(item.id);
      setFormError("");
      setSuccessMessage("");

      await batalkanPengingatTagihanDenganNotifikasi(db, item);

      setSuccessMessage(
        "Pengingat dibatalkan dan notifikasi terkait ikut dibersihkan."
      );

      await refreshAllData();
    } catch (error) {
      console.log("handleBatalkanItem error:", error);
      setFormError("Gagal membatalkan pengingat.");
    } finally {
      setProcessingReminderId(null);
    }
  }

  if (isLoading) {
    return <AppLoader label="Memuat pengingat tagihan..." />;
  }

  return (
    <AppScreen scrollable safeTop>
      <AppButton
        title="Kembali ke dashboard"
        variant="secondary"
        style={pengingatScreenStyles.topButton}
        onPress={() => router.replace(ROUTES.PROTECTED.DASHBOARD)}
      />

      <AppHeading
        title="Pengingat tagihan"
        subtitle="Buat pengingat pembayaran supaya kamu tidak lupa bayar tagihan. Kalau notifikasi aktif, aplikasi akan mencoba mengingatkan di jam yang kamu pilih."
      />

      {isGuestMode ? (
        <View style={pengingatScreenStyles.notice}>
          <GuestModeNotice />
        </View>
      ) : null}

      <View style={pengingatScreenStyles.summaryGrid}>
        <StatCard
          label="Aktif"
          value={String(ringkasan.totalAktif)}
          helper="Total reminder aktif"
          style={pengingatScreenStyles.statItem}
        />

        <StatCard
          label="Hari ini"
          value={String(ringkasan.jatuhTempoHariIni)}
          helper="Jatuh tempo tanggal hari ini"
          style={pengingatScreenStyles.statItem}
        />

        <StatCard
          label="Terlambat"
          value={String(ringkasan.terlambat)}
          helper="Belum ditandai selesai"
          style={pengingatScreenStyles.statItem}
        />

        <StatCard
          label="Notif aktif"
          value={String(ringkasan.notifikasiAktif)}
          helper="Reminder yang ingin dinotifikasi"
          style={pengingatScreenStyles.statItem}
        />
      </View>

      <View style={pengingatScreenStyles.section}>
        <Text style={pengingatScreenStyles.sectionTitle}>
          Status notifikasi perangkat
        </Text>
        <Text style={pengingatScreenStyles.sectionSubtitle}>
          Izin perangkat memengaruhi apakah reminder bisa muncul sebagai notifikasi di atas layar atau hanya tersimpan di database lokal.
        </Text>

        <AppCard style={pengingatScreenStyles.permissionCard}>
          <View style={pengingatScreenStyles.permissionHeader}>
            <Text style={pengingatScreenStyles.permissionTitle}>
              Izin notifikasi
            </Text>

            <StatusBadge
              label={getPermissionLabel(permission)}
              variant={getPermissionVariant(permission)}
            />
          </View>

          <Text style={pengingatScreenStyles.permissionText}>
            {getPermissionDescription(permission)}
          </Text>
          
          <Text style={pengingatScreenStyles.permissionText}>
            Notifikasi yang sedang terjadwal di perangkat ini:{" "}
            {scheduledNotificationCount}
          </Text>

          <View style={pengingatScreenStyles.actionRow}>
            <View style={pengingatScreenStyles.actionItem}>
              <AppButton
                title={
                  isSyncingPermission
                    ? "Memproses..."
                    : permission.granted
                    ? "Sinkronkan notifikasi"
                    : "Aktifkan notifikasi"
                }
                variant="secondary"
                disabled={isSyncingPermission}
                onPress={handleSyncNotifications}
              />
            </View>

            <View style={pengingatScreenStyles.actionItem}>
              <AppButton
                title="Buka pengaturan"
                variant="danger"
                disabled={permission.canAskAgain}
                onPress={openSystemNotificationSettings}
              />
            </View>
          </View>

          <AppButton
            title="Tes notifikasi 5 detik"
            variant="secondary"
            style={pengingatScreenStyles.submitButton}
            disabled={isSyncingPermission}
            onPress={handleTestNotification}
          />
        </AppCard>
      </View>

      <View style={pengingatScreenStyles.section}>
        <Text style={pengingatScreenStyles.sectionTitle}>
          Buat pengingat baru
        </Text>
        <Text style={pengingatScreenStyles.sectionSubtitle}>
          Kamu bisa membuat reminder tagihan sekali, mingguan, atau bulanan. Kalau notifikasi diaktifkan, app akan mencoba menjadwalkan local notification di perangkat.
        </Text>

        <AppCard style={pengingatScreenStyles.formCard}>
          <AppTextField
            label="Judul tagihan"
            placeholder="Contoh: Bayar listrik"
            value={judul}
            onChangeText={setJudul}
            autoCapitalize="sentences"
          />

          <AppTextField
            label="Nominal (opsional)"
            placeholder="Contoh: 150000"
            value={nominalInput}
            onChangeText={(value) =>
              setNominalInput(sanitizeNumericInput(value))
            }
            keyboardType="number-pad"
            helperText={
              nominalInput
                ? `Preview nominal: ${formatRupiah(nominalValue)}`
                : "Boleh dikosongkan kalau nominal tagihan belum pasti."
            }
          />

          {/* 👇 INI YANG DIGANTI JADI KALENDER 👇 */}
          <AppDateField
            label="Tanggal jatuh tempo"
            value={tanggalJatuhTempo}
            onChangeDate={setTanggalJatuhTempo}
            helperText="Pilih tanggal jatuh tempo dari kalender."
          />

          <AppTextField
            label="Jam pengingat"
            placeholder="09:00"
            value={jamPengingat}
            onChangeText={(value) => setJamPengingat(sanitizeTimeInput(value))}
            keyboardType="number-pad"
            helperText="Format jam: HH:MM, contoh 09:00"
          />

          <Text style={pengingatScreenStyles.formSectionTitle}>
            Dompet terkait (opsional)
          </Text>
          <Text style={pengingatScreenStyles.formSectionHelper}>
            Pilih dompet kalau kamu ingin mengaitkan tagihan ini ke dompet tertentu.
          </Text>

          <View style={pengingatScreenStyles.chipGroup}>
            <View style={pengingatScreenStyles.chipItemWide}>
              <OptionChip
                label="Tanpa dompet"
                helperText="Reminder umum, tidak terikat dompet tertentu"
                selected={selectedDompetId === null}
                onPress={() => setSelectedDompetId(null)}
              />
            </View>

            {dompetList.map((item) => (
              <View key={item.id} style={pengingatScreenStyles.chipItem}>
                <OptionChip
                  label={item.nama}
                  helperText={formatRupiah(item.saldo_saat_ini)}
                  selected={selectedDompetId === item.id}
                  onPress={() => setSelectedDompetId(item.id)}
                />
              </View>
            ))}
          </View>

          <Text style={pengingatScreenStyles.formSectionTitle}>
            Pengulangan
          </Text>
          <Text style={pengingatScreenStyles.formSectionHelper}>
            Pilih apakah reminder ini sekali saja atau berulang secara rutin.
          </Text>

          <View style={pengingatScreenStyles.chipGroup}>
            <View style={pengingatScreenStyles.chipItem}>
              <OptionChip
                label="Sekali"
                helperText="Satu kali jatuh tempo"
                selected={pengulangan === "sekali"}
                onPress={() => setPengulangan("sekali")}
              />
            </View>

            <View style={pengingatScreenStyles.chipItem}>
              <OptionChip
                label="Mingguan"
                helperText="Maju 7 hari saat selesai"
                selected={pengulangan === "mingguan"}
                onPress={() => setPengulangan("mingguan")}
              />
            </View>

            <View style={pengingatScreenStyles.chipItem}>
              <OptionChip
                label="Bulanan"
                helperText="Maju 1 bulan saat selesai"
                selected={pengulangan === "bulanan"}
                onPress={() => setPengulangan("bulanan")}
              />
            </View>
          </View>

          <Text style={pengingatScreenStyles.formSectionTitle}>
            Notifikasi lokal
          </Text>
          <Text style={pengingatScreenStyles.formSectionHelper}>
            Kalau diaktifkan, app akan mencoba menjadwalkan banner reminder pada jam yang kamu pilih.
          </Text>

          <View style={pengingatScreenStyles.chipGroup}>
            <View style={pengingatScreenStyles.chipItem}>
              <OptionChip
                label="Aktif"
                helperText="Jadwalkan notifikasi perangkat"
                selected={notifikasiDiaktifkan}
                onPress={() => setNotifikasiDiaktifkan(true)}
              />
            </View>

            <View style={pengingatScreenStyles.chipItem}>
              <OptionChip
                label="Mati"
                helperText="Simpan ke SQLite saja"
                selected={!notifikasiDiaktifkan}
                onPress={() => setNotifikasiDiaktifkan(false)}
              />
            </View>
          </View>

          <AppTextField
            label="Catatan (opsional)"
            placeholder="Contoh: Bayar sebelum jam 12 siang"
            value={catatan}
            onChangeText={setCatatan}
            multiline
          />

          <View style={pengingatScreenStyles.previewCard}>
            <Text style={pengingatScreenStyles.previewTitle}>
              Preview reminder
            </Text>

            <View style={pengingatScreenStyles.previewRow}>
              <Text style={pengingatScreenStyles.previewLabel}>Jatuh tempo</Text>
              <Text style={pengingatScreenStyles.previewValue}>
                {isValidDateInput(tanggalJatuhTempo)
                  ? formatTanggalIndonesiaPendek(tanggalJatuhTempo)
                  : "-"}
              </Text>
            </View>

            <View style={pengingatScreenStyles.previewRow}>
              <Text style={pengingatScreenStyles.previewLabel}>Jam</Text>
              <Text style={pengingatScreenStyles.previewValue}>
                {isValidTimeInput(jamPengingat) ? jamPengingat : "-"}
              </Text>
            </View>

            <View style={pengingatScreenStyles.previewRow}>
              <Text style={pengingatScreenStyles.previewLabel}>Pengulangan</Text>
              <Text style={pengingatScreenStyles.previewValue}>
                {formatLabelPengulangan(pengulangan)}
              </Text>
            </View>

            <View style={pengingatScreenStyles.previewRow}>
              <Text style={pengingatScreenStyles.previewLabel}>Notifikasi</Text>
              <Text style={pengingatScreenStyles.previewValue}>
                {notifikasiDiaktifkan ? "Aktif" : "Mati"}
              </Text>
            </View>
          </View>

          {!!formError ? (
            <Text style={pengingatScreenStyles.errorText}>{formError}</Text>
          ) : null}

          {!!successMessage ? (
            <Text style={pengingatScreenStyles.successText}>
              {successMessage}
            </Text>
          ) : null}

          <AppButton
            title={
              isSubmitting
                ? "Menyimpan pengingat..."
                : "Simpan pengingat tagihan"
            }
            style={pengingatScreenStyles.submitButton}
            disabled={isSubmitting}
            onPress={handleSubmitPengingat}
          />
        </AppCard>
      </View>

      <View style={pengingatScreenStyles.section}>
        <Text style={pengingatScreenStyles.sectionTitle}>
          Pengingat aktif
        </Text>
        <Text style={pengingatScreenStyles.sectionSubtitle}>
          Daftar di bawah ini diambil dari tabel pengingat tagihan lokal.
        </Text>

        {daftarAktif.length > 0 ? (
          daftarAktif.map((item) => (
            <View key={item.id} style={pengingatScreenStyles.listItemWrap}>
              <ReminderCard item={item} />

              <View style={pengingatScreenStyles.actionRow}>
                <View style={pengingatScreenStyles.actionItem}>
                  <AppButton
                    title={
                      processingReminderId === item.id
                        ? "Memproses..."
                        : item.pengulangan === "sekali"
                        ? "Sudah dibayar"
                        : "Bayar & lanjutkan"
                    }
                    variant="secondary"
                    disabled={processingReminderId === item.id}
                    onPress={() => openPaymentModal(item)}
                  />
                </View>

                <View style={pengingatScreenStyles.actionItem}>
                  <AppButton
                    title="Batalkan pengingat"
                    variant="danger"
                    disabled={processingReminderId === item.id}
                    onPress={() => handleBatalkanItem(item)}
                  />
                </View>
              </View>
            </View>
          ))
        ) : (
          <AppCard style={pengingatScreenStyles.emptyCard}>
            <Text style={pengingatScreenStyles.emptyText}>
              Belum ada reminder aktif. Coba buat reminder pertama untuk tagihan
              listrik, air, internet, sewa, atau pembayaran usaha kecil.
            </Text>
          </AppCard>
        )}
      </View>

      <Modal
        visible={Boolean(paymentItem)}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closePaymentModal}
      >
        <View style={pengingatScreenStyles.paymentModalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pilihan dompet pembayaran"
            style={pengingatScreenStyles.paymentModalBackdrop}
            disabled={Boolean(processingReminderId)}
            onPress={closePaymentModal}
          />

          <View 
            style={[
              pengingatScreenStyles.paymentSheet,
              { 
                // SPACING.xxxl = 40 (jarak default)
                // SPACING.lg = 20 (jarak ekstra di atas 3-tombol navigasi)
                paddingBottom: Math.max(SPACING.xxxl, insets.bottom + SPACING.lg) 
              }
            ]}
          >
            <View style={pengingatScreenStyles.paymentHandle} />

            <View style={pengingatScreenStyles.paymentHeader}>
              <View style={pengingatScreenStyles.paymentHeaderTextWrap}>
                <Text style={pengingatScreenStyles.paymentTitle}>
                  Pilih dompet pembayaran
                </Text>
                <Text style={pengingatScreenStyles.paymentSubtitle}>
                  Pembayaran tagihan akan dicatat sebagai pengeluaran dan saldo dompet
                  yang dipilih akan berkurang otomatis.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                hitSlop={10}
                disabled={Boolean(processingReminderId)}
                style={pengingatScreenStyles.paymentCloseButton}
                onPress={closePaymentModal}
              >
                <Text style={pengingatScreenStyles.paymentCloseText}>×</Text>
              </Pressable>
            </View>

            {paymentItem ? (
              <View style={pengingatScreenStyles.paymentSummaryCard}>
                <View>
                  <Text style={pengingatScreenStyles.paymentSummaryLabel}>
                    Tagihan
                  </Text>
                  <Text style={pengingatScreenStyles.paymentSummaryTitle}>
                    {paymentItem.judul}
                  </Text>
                </View>

                <Text style={pengingatScreenStyles.paymentSummaryAmount}>
                  {formatRupiah(paymentItem.nominal)}
                </Text>
              </View>
            ) : null}

            <Text style={pengingatScreenStyles.paymentSectionTitle}>
              Dompet aktif
            </Text>

            <View style={pengingatScreenStyles.paymentWalletList}>
              {dompetList.map((dompet) => {
                const selected = selectedPaymentDompetId === dompet.id;
                const saldoKurang = Boolean(
                  paymentItem && paymentItem.nominal > dompet.saldo_saat_ini
                );

                return (
                  <Pressable
                    key={dompet.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      pengingatScreenStyles.paymentWalletItem,
                      selected && pengingatScreenStyles.paymentWalletItemActive,
                      saldoKurang && pengingatScreenStyles.paymentWalletItemDanger,
                      pressed && pengingatScreenStyles.paymentWalletItemPressed,
                    ]}
                    disabled={Boolean(processingReminderId)}
                    onPress={() => {
                      setSelectedPaymentDompetId(dompet.id);
                      setPaymentError("");
                    }}
                  >
                    <View style={pengingatScreenStyles.paymentWalletTextWrap}>
                      <Text style={pengingatScreenStyles.paymentWalletName}>
                        {dompet.nama}
                      </Text>
                      <Text style={pengingatScreenStyles.paymentWalletMeta}>
                        {dompet.tipe_dompet} • {dompet.jenis}
                      </Text>
                    </View>

                    <View style={pengingatScreenStyles.paymentWalletRight}>
                      <Text
                        style={
                          saldoKurang
                            ? pengingatScreenStyles.paymentWalletBalanceDanger
                            : pengingatScreenStyles.paymentWalletBalance
                        }
                      >
                        {formatRupiah(dompet.saldo_saat_ini)}
                      </Text>

                      {saldoKurang ? (
                        <Text style={pengingatScreenStyles.paymentWalletWarning}>
                          Saldo kurang
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {isPaymentSaldoKurang && !paymentError ? (
              <Text style={pengingatScreenStyles.paymentErrorText}>
                Saldo tidak mencukupi. Silakan pilih dompet lain atau lakukan transfer
                antar dompet terlebih dahulu.
              </Text>
            ) : null}

            {!!paymentError ? (
              <Text style={pengingatScreenStyles.paymentErrorText}>
                {paymentError}
              </Text>
            ) : null}

            <AppButton
              title={
                processingReminderId ? "Mencatat pembayaran..." : "Konfirmasi bayar"
              }
              style={pengingatScreenStyles.paymentSubmitButton}
              disabled={
                Boolean(processingReminderId) ||
                !paymentItem ||
                !selectedPaymentDompetId ||
                isPaymentSaldoKurang
              }
              onPress={handleKonfirmasiBayarTagihan}
            />
          </View>
        </View>
      </Modal>

    </AppScreen>
  );
}