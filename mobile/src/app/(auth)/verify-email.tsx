import { useState } from "react";
import { Keyboard, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppTextField,
  AuthShell,
} from "@/components";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";
import { authScreenStyles } from "@assets/styles/screens/auth/authScreen.styles";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const email =
    typeof params.email === "string" ? params.email : "";

  const { resendSignupOtp, verifyEmailOtp } = useAuthSession();

  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleVerifyOtp() {
    Keyboard.dismiss();

    try {
      setFormError("");
      setSuccessMessage("");

      if (!email) {
        setFormError(
          "Email verifikasi tidak ditemukan. Kembali ke halaman daftar lalu coba lagi."
        );
        return;
      }

      const cleanToken = token.trim();

      if (!/^\d{6,10}$/.test(cleanToken)) {
        setFormError("Kode verifikasi harus 6 sampai 10 digit.");
        return;
      }

      setIsSubmitting(true);

      await verifyEmailOtp({
        email,
        token: cleanToken,
      });

      setSuccessMessage(
        "Verifikasi berhasil. Session akun sudah aktif."
      );

      router.replace(ROUTES.PROTECTED.DASHBOARD);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal memverifikasi kode."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    try {
      setFormError("");
      setSuccessMessage("");

      if (!email) {
        setFormError(
          "Email verifikasi tidak ditemukan. Kembali ke halaman daftar lalu coba lagi."
        );
        return;
      }

      setIsResending(true);

      await resendSignupOtp(email);

      setSuccessMessage(
        "Kode verifikasi berhasil dikirim ulang. Cek inbox email kamu."
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal mengirim ulang kode."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      title="Verifikasi email"
      subtitle="Masukkan kode verifikasi yang dikirim ke email kamu untuk mengaktifkan akun."
    >
      <AppCard style={authScreenStyles.statusCard}>
        <Text style={authScreenStyles.infoLabel}>Email tujuan</Text>
        <Text style={authScreenStyles.infoValue}>
          {email || "-"}
        </Text>

        <Text style={authScreenStyles.inlineNote}>
          Kode verifikasi Supabase memiliki masa berlaku terbatas. Kalau kodenya
          kadaluarsa, kirim ulang dari tombol di bawah.
        </Text>
      </AppCard>

      <AppTextField
        label="Kode verifikasi"
        placeholder="Contoh: 123456"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        autoCapitalize="none"
        helperText="Masukkan 6 sampai 10 digit kode dari email."
      />

      {!!formError ? (
        <Text style={authScreenStyles.errorText}>{formError}</Text>
      ) : null}

      {!!successMessage ? (
        <Text style={authScreenStyles.successText}>{successMessage}</Text>
      ) : null}

      <AppButton
        title={isSubmitting ? "Memverifikasi..." : "Verifikasi kode"}
        style={authScreenStyles.primaryButton}
        disabled={isSubmitting}
        onPress={handleVerifyOtp}
      />

      <AppButton
        title={isResending ? "Mengirim ulang..." : "Kirim ulang kode"}
        variant="secondary"
        style={authScreenStyles.secondaryButton}
        disabled={isResending}
        onPress={handleResendOtp}
      />

      <AppButton
        title="Kembali ke masuk"
        variant="secondary"
        style={authScreenStyles.tertiaryButton}
        onPress={() => router.replace(ROUTES.AUTH.SIGN_IN)}
      />

      <Text style={authScreenStyles.helperText}>
        Flow ini memakai OTP email dari template Supabase. Kalau email tidak
        masuk, cek folder spam/promotions, lalu kirim ulang dari tombol di atas.
      </Text>
    </AuthShell>
  );
}