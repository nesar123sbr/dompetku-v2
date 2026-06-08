import { useState } from "react";
import { Keyboard, Text } from "react-native";
import { type Href, useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppTextField,
  AuthShell,
} from "@/components";
import { ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";
import { authScreenStyles } from "@assets/styles/screens/auth/authScreen.styles";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { sendPasswordResetOtp } = useAuthSession();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSendCode() {
    Keyboard.dismiss();

    try {
      setFormError("");
      setSuccessMessage("");

      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        setFormError("Email wajib diisi.");
        return;
      }

      setIsSubmitting(true);

      await sendPasswordResetOtp(normalizedEmail);

      setSuccessMessage("Kode untuk mengganti password sudah dikirim ke email.");

      const nextHref =
        `${ROUTES.AUTH.RESET_PASSWORD}?email=${encodeURIComponent(
          normalizedEmail
        )}` as Href;

      router.replace(nextHref);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Kode reset belum berhasil dikirim."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Lupa password"
      subtitle="Masukkan email akunmu. Kami akan mengirim kode untuk membuat password baru."
    >
      <AppCard style={authScreenStyles.noticeCard}>
        <Text style={authScreenStyles.infoLabel}>Buat password baru</Text>
        <Text style={authScreenStyles.infoValue}>
          Masukkan email yang kamu pakai saat daftar. Kode reset akan dikirim ke
          email tersebut.
        </Text>

        <Text style={authScreenStyles.inlineNote}>
          Setelah menerima kode, kamu bisa membuat password baru dan masuk
          kembali ke DompetKu.
        </Text>
      </AppCard>

      <AppTextField
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFormError("");
          setSuccessMessage("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="done"
        onSubmitEditing={handleSendCode}
      />

      {!!formError ? (
        <Text style={authScreenStyles.errorText}>{formError}</Text>
      ) : null}

      {!!successMessage ? (
        <Text style={authScreenStyles.successText}>{successMessage}</Text>
      ) : null}

      <AppButton
        title={isSubmitting ? "Mengirim kode..." : "Kirim kode reset"}
        style={authScreenStyles.primaryButton}
        disabled={isSubmitting}
        onPress={handleSendCode}
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