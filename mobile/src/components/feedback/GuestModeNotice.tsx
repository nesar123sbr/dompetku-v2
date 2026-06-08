import { Text, View } from "react-native";
import { guestModeNoticeStyles } from "@assets/styles/components/guestModeNotice.styles";

type GuestModeNoticeProps = {
  title?: string;
  text?: string;
};

export default function GuestModeNotice({
  title = "Mode tamu aktif",
  text = "Data disimpan di perangkat ini. Kalau HP diganti, aplikasi dihapus, atau perangkat di-reset sebelum masuk akun dan backup cloud aktif, data bisa hilang.",
}: GuestModeNoticeProps) {
  return (
    <View style={guestModeNoticeStyles.container}>
      <Text style={guestModeNoticeStyles.title}>{title}</Text>
      <Text style={guestModeNoticeStyles.text}>{text}</Text>
    </View>
  );
}