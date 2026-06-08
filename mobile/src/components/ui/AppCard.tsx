import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { appCardStyles } from "@assets/styles/components/appCard.styles";

type AppCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AppCard({ children, style }: AppCardProps) {
  return <View style={[appCardStyles.card, style]}>{children}</View>;
}