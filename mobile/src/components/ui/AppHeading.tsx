import { Text, View } from "react-native";
import { appHeadingStyles } from "@assets/styles/components/appHeading.styles";

type AppHeadingProps = {
  title: string;
  subtitle?: string;
};

export default function AppHeading({
  title,
  subtitle,
}: AppHeadingProps) {
  return (
    <View style={appHeadingStyles.container}>
      <Text style={appHeadingStyles.title}>{title}</Text>
      {!!subtitle && <Text style={appHeadingStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}