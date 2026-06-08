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

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const { resetPasswordWithOtp } = useAuthSession();

  const [token, setToken] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleResetPassword() {
    Keyboard.dismiss();

    try {
      setFormError("");
      setSuccessMessage("");

      if (!email) {
        setFormError("Email untuk reset password tidak ditemukan.");
        return;
      }

      if (!/^\d{6,10}$/.test(token.trim())) {
        setFormError("Kode reset harus berisi 6 sampai 10 digit.");
        return;
      }

      if (passwordBaru.length < 8) {
        setFormError("Password baru minimal 8 karakter.");
        return;
      }

      if (passwordBaru !== konfirmasiPassword) {
        setFormError("Konfirmasi password belum sama.");
        return;
      }

      setIsSubmitting(true);

      await resetPasswordWithOtp({
        email,
        token,
        passwordBaru,
      });

      setSuccessMessage(
        "Password berhasil diganti. Silakan masuk dengan password baru."
      );

      router.replace(ROUTES.AUTH.SIGN_IN);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Password belum berhasil diganti."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Buat password baru"
      subtitle="Masukkan kode dari email, lalu buat password baru untuk akunmu."
    >
      <AppCard style={authScreenStyles.noticeCard}>
        <Text style={authScreenStyles.infoLabel}>Email akun</Text>
        <Text style={authScreenStyles.infoValue}>{email || "-"}</Text>

        <Text style={authScreenStyles.inlineNote}>
          Gunakan kode yang dikirim ke email ini. Setelah password baru
          tersimpan, kamu bisa masuk kembali ke DompetKu.
        </Text>
      </AppCard>

      <AppTextField
        label="Kode reset"
        placeholder="Masukkan kode dari email"
        value={token}
        onChangeText={(value) => {
          setToken(value);
          setFormError("");
          setSuccessMessage("");
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        returnKeyType="next"
      />

      <AppTextField
        label="Password baru"
        placeholder="Minimal 8 karakter"
        value={passwordBaru}
        onChangeText={(value) => {
          setPasswordBaru(value);
          setFormError("");
          setSuccessMessage("");
        }}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        helperText="Gunakan password baru yang mudah kamu ingat, tapi sulit ditebak orang lain."
        returnKeyType="next"
      />

      <AppTextField
        label="Konfirmasi password baru"
        placeholder="Ulangi password baru"
        value={konfirmasiPassword}
        onChangeText={(value) => {
          setKonfirmasiPassword(value);
          setFormError("");
          setSuccessMessage("");
        }}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleResetPassword}
      />

      {!!formError ? (
        <Text style={authScreenStyles.errorText}>{formError}</Text>
      ) : null}

      {!!successMessage ? (
        <Text style={authScreenStyles.successText}>{successMessage}</Text>
      ) : null}

      <AppButton
        title={isSubmitting ? "Menyimpan..." : "Simpan password baru"}
        style={authScreenStyles.primaryButton}
        disabled={isSubmitting}
        onPress={handleResetPassword}
      />

      <AppButton
        title="Kembali ke masuk"
        variant="secondary"
        style={authScreenStyles.secondaryButton}
        onPress={() => router.replace(ROUTES.AUTH.SIGN_IN)}
      />
    </AuthShell>
  );
}