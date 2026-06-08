import type { StyleProp, ViewStyle } from "react-native";
import { Text } from "react-native";

import AppCard from "./AppCard";
import { statCardStyles } from "@assets/styles/components/statCard.styles";

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  style?: StyleProp<ViewStyle>;
};

export default function StatCard({
  label,
  value,
  helper,
  style,
}: StatCardProps) {
  return (
    <AppCard style={[statCardStyles.card, style]}>
      <Text style={statCardStyles.label}>{label}</Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={statCardStyles.value}
      >
        {value}
      </Text>

      {!!helper && <Text style={statCardStyles.helper}>{helper}</Text>}
    </AppCard>
  );
}