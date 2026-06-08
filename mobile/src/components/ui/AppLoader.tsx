import { ActivityIndicator, Text, View } from "react-native";
import { COLORS } from "@/constants";
import { appLoaderStyles } from "@assets/styles/components/appLoader.styles";

type AppLoaderProps = {
  label?: string;
};

export default function AppLoader({
  label = "Memuat...",
}: AppLoaderProps) {
  return (
    <View style={appLoaderStyles.container}>
      <ActivityIndicator size="large" color={COLORS.brandPrimary} />
      <Text style={appLoaderStyles.label}>{label}</Text>
    </View>
  );
}