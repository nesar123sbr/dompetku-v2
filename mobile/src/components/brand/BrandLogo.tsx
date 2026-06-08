import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";
import { APP_IMAGES } from "@/constants";
import { brandLogoStyles } from "@assets/styles/components/brandLogo.styles";

type BrandLogoVariant = "auth" | "header";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  style?: StyleProp<ImageStyle>;
};

export default function BrandLogo({
  variant = "auth",
  style,
}: BrandLogoProps) {
  const source =
    variant === "header" ? APP_IMAGES.headerLogo : APP_IMAGES.authLogo;

  const variantStyle =
    variant === "header"
      ? brandLogoStyles.headerImage
      : brandLogoStyles.authImage;

  return (
    <Image
      source={source}
      contentFit="contain"
      transition={150}
      style={[variantStyle, style]}
    />
  );
}