import { useState, useEffect, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { File, Paths } from "expo-file-system";

import { COLORS } from "@/constants";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type LocalDatabaseProviderProps = {
  children: ReactNode;
};

export default function LocalDatabaseProvider({
  children,
}: LocalDatabaseProviderProps) {
  const [dbError, setDbError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!dbError) return;

    let isMounted = true;
    const checkAuthStatus = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          if (isMounted) setIsLoggedIn(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setIsLoggedIn(Boolean(data?.session?.user));
        }
      } catch {
        if (isMounted) setIsLoggedIn(false);
      }
    };

    checkAuthStatus();
    return () => {
      isMounted = false;
    };
  }, [dbError]);

  const handleRetry = () => {
    setDbError(null);
    setRetryKey((prev) => prev + 1);
  };

  const handleCopyDetails = async () => {
    if (!dbError) return;
    const details = `[DompetKu Database Error Report]\nMessage: ${dbError.message}\n\nStack:\n${dbError.stack || "No stack trace available"}`;
    try {
      await Share.share({
        title: "Detail Kesalahan Database DompetKu",
        message: details,
      });
    } catch {
      Alert.alert("Detail Error", details);
    }
  };

  const executeResetDatabase = async () => {
    try {
      const dbFile = new File(Paths.document, "SQLite", DATABASE_NAME);
      if (dbFile.exists) {
        dbFile.delete();
      }
      const walFile = new File(Paths.document, "SQLite", `${DATABASE_NAME}-wal`);
      if (walFile.exists) {
        walFile.delete();
      }
      const shmFile = new File(Paths.document, "SQLite", `${DATABASE_NAME}-shm`);
      if (shmFile.exists) {
        shmFile.delete();
      }
      setDbError(null);
      setRetryKey((prev) => prev + 1);
    } catch (error) {
      Alert.alert(
        "Gagal Reset",
        `Tidak dapat menghapus berkas database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleResetPress = () => {
    if (isLoggedIn) {
      Alert.alert(
        "Reset Database Lokal?",
        "Database di perangkat ini akan dibersihkan dan dibuat ulang. Data Anda di akun cloud tetap aman dan akan dimuat kembali setelah masuk akun.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Lanjutkan",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Konfirmasi Terakhir",
                "Apakah Anda yakin ingin mengatur ulang data lokal sekarang?",
                [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Ya, Reset",
                    style: "destructive",
                    onPress: executeResetDatabase,
                  },
                ]
              );
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Peringatan: Data Akan Hilang",
        "Anda belum masuk akun cloud atau dalam mode tamu. Mereset database lokal akan menghapus seluruh data keuangan di perangkat ini secara permanen!",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Tetap Hapus",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Konfirmasi Hapus Permanen",
                "Seluruh catatan pemasukan, pengeluaran, dan dompet akan hilang selamanya. Yakin ingin melanjutkan?",
                [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Hapus Permanen",
                    style: "destructive",
                    onPress: executeResetDatabase,
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  if (dbError) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Kendala Database Lokal</Text>
          <Text style={styles.subtitle}>
            Aplikasi mengalami masalah saat menyiapkan atau membaca database di
            perangkat.
          </Text>

          <View style={styles.errorBox}>
            <Text style={styles.errorLabel}>Pesan Error:</Text>
            <ScrollView style={styles.errorScroll} nestedScrollEnabled>
              <Text selectable style={styles.errorText}>
                {dbError.message}
              </Text>
              {__DEV__ && dbError.stack ? (
                <Text selectable style={styles.stackText}>
                  {"\n" + dbError.stack}
                </Text>
              ) : null}
            </ScrollView>
          </View>

          {isLoggedIn === true && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Akun Anda terhubung dengan cloud. Jika masalah berlanjut, Anda
                dapat mereset database lokal tanpa khawatir data di cloud hilang.
              </Text>
            </View>
          )}

          {isLoggedIn === false && (
            <View style={[styles.infoBox, styles.warningBox]}>
              <Text style={styles.warningText}>
                Mode offline/tamu: data hanya tersimpan di perangkat ini.
                Mereset data lokal akan menghapus catatan keuangan secara
                permanen.
              </Text>
            </View>
          )}

          <View style={styles.buttonStack}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleRetry}
            >
              <Text style={styles.primaryButtonText}>Coba Buka Lagi</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleCopyDetails}
            >
              <Text style={styles.secondaryButtonText}>Salin Detail Error</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleResetPress}
            >
              <Text style={styles.dangerButtonText}>
                {isLoggedIn ? "Reset Database Lokal" : "Reset & Hapus Data Lokal"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SQLiteProvider
      key={retryKey}
      databaseName={DATABASE_NAME}
      onInit={migrateDbIfNeeded}
      onError={(err) => {
        console.error("LocalDatabaseProvider onError caught:", err);
        setDbError(err);
      }}
    >
      {children}
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.danger,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  errorScroll: {
    maxHeight: 120,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    fontFamily: "monospace",
  },
  stackText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: "monospace",
  },
  infoBox: {
    backgroundColor: COLORS.brandPrimarySoft,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.brandPrimaryDark,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: COLORS.warningSoft,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    lineHeight: 18,
  },
  buttonStack: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: COLORS.dangerSoft,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
