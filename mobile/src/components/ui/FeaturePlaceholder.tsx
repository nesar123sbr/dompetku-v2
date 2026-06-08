import { Text } from "react-native";
import AppCard from "@/components/ui/AppCard";
import AppHeading from "@/components/ui/AppHeading";
import AppScreen from "@/components/ui/AppScreen";
import { protectedScreenStyles } from "@assets/styles/screens/protected/protectedScreen.styles";

type FeaturePlaceholderProps = {
  title: string;
  subtitle: string;
  points: string[];
};

export default function FeaturePlaceholder({
  title,
  subtitle,
  points,
}: FeaturePlaceholderProps) {
  return (
    <AppScreen scrollable>
      <AppHeading title={title} subtitle={subtitle} />

      <AppCard style={protectedScreenStyles.card}>
        <Text style={protectedScreenStyles.cardTitle}>Arah pengerjaan</Text>

        {points.map((item, index) => (
          <Text
            key={`${index}-${item}`}
            style={protectedScreenStyles.listItem}
          >
            {index + 1}. {item}
          </Text>
        ))}
      </AppCard>
    </AppScreen>
  );
}