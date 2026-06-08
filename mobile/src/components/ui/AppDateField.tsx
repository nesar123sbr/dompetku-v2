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

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setIsPickerVisible(false);
    }

    if (selectedDate) {
      onChangeDate(dateToDateInput(selectedDate));
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
            value={dateInputToDate(value)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
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