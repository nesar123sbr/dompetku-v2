import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import AppButton from "./AppButton";
import {
  dateInputToDate,
  dateToDateInput,
  formatTanggalIndonesiaPendek,
} from "@/utils";
import { appTextFieldStyles } from "@assets/styles/components/appTextField.styles";

type AppDateFieldProps = {
  label: string;
  value: string;
  onChangeDate: (value: string) => void;
  helperText?: string;
  errorText?: string;
};

export default function AppDateField({
  label,
  value,
  onChangeDate,
  helperText,
  errorText,
}: AppDateFieldProps) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // 1. Fungsi saat user memilih tanggal (Pengganti onChange)
  function handleValueChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setIsPickerVisible(false); // Tutup kalender di Android setelah pilih
    }

    if (selectedDate) {
      onChangeDate(dateToDateInput(selectedDate)); // Simpan tanggal
    }
  }

  // 2. Fungsi saat user membatalkan / klik di luar kalender (Pengganti onChange)
  function handleDismiss() {
    if (Platform.OS === "android") {
      setIsPickerVisible(false); // Sembunyikan kalender
    }
  }

  return (
    <View style={appTextFieldStyles.container}>
      <Text style={appTextFieldStyles.label}>{label}</Text>

      <Pressable
        onPress={() => setIsPickerVisible(true)}
        style={[
          appTextFieldStyles.input,
          appTextFieldStyles.pressableInput,
        ]}
      >
        <Text
          style={[
            appTextFieldStyles.inputText,
            !value && appTextFieldStyles.placeholderText,
          ]}
        >
          {value ? formatTanggalIndonesiaPendek(value) : "Pilih tanggal"}
        </Text>
      </Pressable>

      {!!helperText && !errorText ? (
        <Text style={appTextFieldStyles.helperText}>{helperText}</Text>
      ) : null}

      {!!errorText ? (
        <Text style={appTextFieldStyles.errorText}>{errorText}</Text>
      ) : null}

      {isPickerVisible ? (
        <>
          <DateTimePicker
            // PENYEMPURNAAN FINAL (Defensive Programming):
            // Jika value ada, konversi. Jika kosong, gunakan tanggal dan jam saat ini (new Date())
            value={value ? dateInputToDate(value) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onValueChange={handleValueChange}
            onDismiss={handleDismiss}
          />

          {Platform.OS === "ios" ? (
            <AppButton
              title="Selesai"
              variant="secondary"
              style={appTextFieldStyles.pickerDoneButton}
              onPress={() => setIsPickerVisible(false)}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}